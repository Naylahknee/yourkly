# Yourkly — Security Notes

This document records known security concerns in the current implementation, the existing
mitigations, and the preferred future direction for each issue. It is updated as the
security posture of the application changes.

**None of the issues documented here are claimed to be fixed unless explicitly marked as
resolved with a date.**

---

## SEC-001 — GitHub OAuth Token Stored in Browser localStorage

**Status:** Resolved — 2026-09-03  
**Severity:** High  
**First documented:** 2025-07-11

### What is happening

Previously, after a successful GitHub OAuth sign-in, `useAuth.js` stored the raw GitHub
access token in browser `localStorage` under the key `plainly_token`.

```js
// src/hooks/useAuth.js
localStorage.setItem('plainly_token', newToken)
```

The token is subsequently read on every page load and passed directly to all GitHub API
calls in `src/api/github.js` via the `Authorization: Bearer <token>` header.

The token carries the `repo` scope, which grants full read and write access to all of
the authenticated user's repositories — both public and private — including the ability
to create, modify, and delete repositories and their contents.

### Risks

**Cross-Site Scripting (XSS):** `localStorage` is readable by any JavaScript executing
on the page. A successful XSS attack — through a malicious dependency, a browser
extension with page-access, or an injected script — could silently read the token and
exfiltrate it. The attacker would then have full `repo`-scope access to all of the
user's GitHub repositories until the token is manually revoked.

**Token persistence:** Unlike a session cookie, a `localStorage` item has no expiry.
Once set, it persists indefinitely across browser sessions and tabs until explicitly
cleared. A stolen token remains valid until the user revokes it on GitHub or the OAuth
App is deleted.

**No server-side revocation:** Yourkly has no mechanism to invalidate or rotate the
stored token. Signing out removes the item from `localStorage` in the current browser,
but does not call GitHub's token-revocation endpoint. If the token was already copied,
sign-out provides no protection.

### Fix Applied

The browser now receives an encrypted, `HttpOnly`, `Secure`, `SameSite=Lax` session
cookie instead of the GitHub token. The session holds the token only after AES-256-GCM
encryption with `GITHUB_SESSION_SECRET`; every GitHub operation is forwarded through the
same-origin server endpoint after a per-session CSRF check. A stolen browser script can no
longer read a reusable GitHub credential. Signing out clears the cookie and revokes the
GitHub authorization server-side.

The following defenses remain important:

- **HTTPS in production:** The token is only transmitted over encrypted connections in
  a properly deployed instance. It cannot be intercepted in transit.
- **Markdown sanitization (added 2025-07-11):** DOMPurify now sanitizes all
  Markdown-rendered HTML before insertion into the DOM, closing the most likely
  XSS vector available to a user's own content. See SEC-002.
- **No third-party scripts:** The application loads no advertising, analytics, or
  third-party tracking scripts that could harvest the token.
- **No eval, no dynamic script injection:** The application does not use `eval()` or
  dynamically inject `<script>` tags, limiting the attack surface.
- **Dependency count is low:** The number of runtime npm dependencies is small,
  reducing the supply-chain risk compared to typical React applications.

These mitigations now protect the session design as well as the browser surface.

### Future Improvement

Move from an OAuth App's broad account-wide permission model to a GitHub App with
fine-grained, selected-repository permissions and short-lived installation tokens.

### Files Involved in a Future Migration

| File | Change required |
|---|---|
| `server.js` | Runs the secure session, OAuth, and GitHub proxy endpoints in development |
| `api/oauth/exchange.js` | Validates the server-held OAuth transaction and creates the session |
| `src/hooks/useAuth.js` | Reads only server-verified session state; has no token storage |
| `src/api/github.js` | Calls the same-origin GitHub proxy with CSRF protection |

**Remaining scope:** Large — changing to a GitHub App requires a new authorization model
and a migration path for connected users.

---

## SEC-002 — Unsanitized Markdown Rendered via dangerouslySetInnerHTML

**Status:** Resolved — 2025-07-11  
**Severity:** High (before fix); Resolved  

### What was happening

`src/pages/Files.jsx` passed the output of `marked.parse(content)` directly to
`dangerouslySetInnerHTML` without sanitization:

```jsx
// Before fix
<div dangerouslySetInnerHTML={{ __html: marked.parse(content || '') }} />
```

`marked` is a Markdown-to-HTML converter, not an XSS sanitizer. Markdown content
containing raw HTML tags, `javascript:` href values, or event handler attributes
would be inserted into the DOM verbatim and could execute in the user's browser.

Because Yourkly users write their own content, the direct impact is self-inflicted
(the user cannot attack other users this way with the current single-user model).
However, the vulnerability represents bad practice and would become a real
cross-user risk if any collaboration or shared-file feature were added.

### Fix Applied

DOMPurify was added as a dependency and is applied to all Markdown output before
rendering:

```jsx
// After fix — src/pages/Files.jsx
import DOMPurify from 'dompurify'
// ...
<div
  className="markdown-preview"
  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(content || '')) }}
/>
```

DOMPurify is the industry-standard browser-native HTML sanitizer, maintained by the
OWASP Sanitizer project. It preserves all safe Markdown output (headings, paragraphs,
lists, links, emphasis, blockquotes, code) and strips executable content.

---

## SEC-003 — OAuth Scope Broader Than Required

**Status:** Open  
**Severity:** Medium  
**First documented:** 2025-07-11

### What is happening

The OAuth authorization URL in `src/pages/SignIn.jsx` requests the `repo` scope:

```js
const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`
```

The `repo` scope grants full access to all of a user's repositories (public and private),
including settings, webhooks, deploy keys, and deletion. Yourkly only needs to read and
write file contents and repository metadata for repositories it creates.

### Preferred Future Direction

Use the minimum scope sufficient for the product's operations:

- For users who only need to work with Yourkly-created repositories: `public_repo`
  if repositories are public, or a GitHub Fine-Grained Personal Access Token scoped
  to specific repositories.
- For the current private-by-default repository model, a custom OAuth scope narrowing
  is limited by GitHub's coarse OAuth scope options. A practical improvement is to
  clearly communicate to the user at sign-in what access is being requested and why.

**This scope change should be coordinated with the SEC-001 authentication rework.**

---

## SEC-004 — New Repositories Previously Defaulted to Public

**Status:** Resolved — 2025-07-11  
**Severity:** Medium (before fix); Resolved  

### What was happening

`createRepo` in `src/api/github.js` hardcoded `private: false`:

```js
// Before fix
body: JSON.stringify({ name, auto_init: true, private: false })
```

A user who created a new Yourkly project without realizing the implications would
have their writing published publicly on GitHub under their own account.

### Fix Applied

Changed to `private: true`:

```js
// After fix
body: JSON.stringify({ name, auto_init: true, private: true })
```

This matches the principle of least surprise: a user managing personal writing documents
should not have those documents public by default. The user can change a project to
public via the Project Settings modal in the Files page if they choose.

---

## SEC-005 — GitHub proxy relayed any request on the account or a repository

**Status:** Resolved — 2026-11-17
**Severity:** High

### What was happening

The proxy accepted any HTTP method on any path that started with `/user` or `/repos/{owner}/{repo}`. Any script able to run on the page could call `/api/session` to get the CSRF token. It could then use the person's `repo`-scope token to add an SSH key (`POST /user/keys`), deploy keys, or webhooks, invite collaborators, or read email addresses.

### Fix applied

There is now an explicit method + path allowlist (`lib/githubAllowlist.js`, decision D-011), tested in `tests/github-allowlist.test.js`. Dot segments are refused, including percent-encoded ones, and so are backslashes and schemes. CSRF and OAuth `state` comparisons now use `crypto.timingSafeEqual`.

The old blanket `..` check also rejected GitHub's `compare/base...head` URLs. Those comparisons are now allowed.

---

## SEC-006 — Smaller hardening (2026-11-17)

- **Resolved:** DOMPurify bumped from 3.4.16 to 3.4.18 (GHSA-c6gr-qvv4-5v3f). `npm audit --omit=dev` reports 0 vulnerabilities.
- **Resolved:** a `Strict-Transport-Security` header was added (2 years, includeSubDomains). `preload` was left out on purpose, because joining the browser preload list is hard to undo.
- **Partly resolved:** the rate-limit key now uses Vercel's own client-IP headers and ignores query strings. The limiter is still per-instance memory, so production limits should move to Vercel Firewall rules (BUILD_PLAN S-4). **Open.**
- **Added:** a CI workflow (build, tests, runtime dependency audit) and Dependabot.

---

## SEC-007 — Signed-in data stayed in the browser after sign-out

**Status:** Partly resolved — 2026-11-17
**Severity:** Medium

Project memory, updates, the project list and unsaved drafts live in `localStorage`, so
they survive sign-out. On a shared computer, the next person can see them.
**Fix applied:** Account now offers to remove this data at sign-out (`src/utils/deviceData.js`).
**Still open:** native projects are device-only by design (D-009) and stay unencrypted in
the browser. Fixing that needs Yourkly accounts with cloud sync (BUILD_PLAN Phase 4).

---

## SEC-008 — Sessions had no idle timeout

**Status:** Resolved — 2026-11-17
**Severity:** Medium

Sessions lasted a fixed 8 hours however long they sat unused.
**Fix applied:**
- `lib/session.js` records a last-active time (`seen`) in the sealed cookie and refuses a
  session idle for more than 2 hours (`SESSION_IDLE_SECONDS`).
- The proxy and `/api/session` call `touchSession`, which re-seals the cookie at most every
  5 minutes. The token, CSRF value and 8-hour overall expiry are unchanged.
- Sessions sealed before this change have no `seen`; they stay bounded by the 8-hour
  expiry and gain `seen` on their next request.
- `src/api/github.js` announces any 401, and `useAuth` sends the person to
  `/?session_ended=1`, where Welcome explains what happened. A 30-second guard stops
  redirect loops. Drafts stay in the browser.
