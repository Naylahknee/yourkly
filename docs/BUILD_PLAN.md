# Yourkly — Security Review & Build Plan

**Date:** 2026-11-17
**Scope:** Full read of the authentication, session, and GitHub proxy code (`api/`, `lib/`,
`server.js`, `vercel.json`, `src/api/github.js`, `src/hooks/useAuth.js`), a check of where
browser storage is used, `npm audit`, `npm run build`, and the server tests.
**Code changes made in this pass:** None. This is a review and a plan only.

---

## 1. Where things stand

The login design is solid, better than most early-stage apps:

- OAuth uses **PKCE** and a random `state`. Both are kept in a sealed, short-lived (10 min)
  `HttpOnly` cookie.
- The GitHub token **never reaches the browser**. It sits inside an AES-256-GCM encrypted,
  `HttpOnly`, `Secure`, `SameSite=Lax` cookie that lasts 8 hours.
- Every state-changing call checks the **Origin** and a per-session **CSRF token**.
- Signing out **revokes the whole GitHub grant**, not just the cookie.
- Production sends a strict **CSP**, `X-Frame-Options: DENY`, `nosniff`, a Referrer-Policy,
  and a Permissions-Policy.
- Markdown is run through **DOMPurify**, and new projects default to **private**.
- The AI handoff warns about secrets before you copy anything.

Validation run today: `npm run build` ✅ (one warning: a bundle over 500 kB). The
`node --test tests/server-reliability.test.js` suite ✅ passed 4 of 4.
`npm audit --omit=dev` ❌ found **1 critical** issue (DOMPurify, see S-2).

---

## 2. Security findings (most severe first)

### S-1 — The GitHub proxy forwards far more than the app uses · **High**

`api/github/[...path].js` allows **any HTTP method** on **any** path under `/user…` or
`/repos/{owner}/{repo}/…`. The comment in `src/api/github.js` says it only forwards "the
narrow GitHub API surface this app uses". That isn't true.

Today the proxy will relay requests like these with the user's full `repo`-scope token:

| Request | What it does |
|---|---|
| `POST /user/keys` | Adds an SSH key, giving an attacker **permanent** access that outlives sign-out |
| `POST /repos/o/r/keys` | Adds a deploy key with write access |
| `POST /repos/o/r/hooks` | Sends every future change to an attacker's server |
| `PUT /repos/o/r/collaborators/x` | Invites the attacker as a collaborator |
| `DELETE /repos/o/r` | Deletes the project |
| `GET /user/emails`, `GET /user/repos` | Reads private account data |

Any script running on the page can call `/api/session`, read the CSRF token, and then
drive the proxy. That script could come from a malicious npm package, a future XSS bug, or
a browser extension. So one script bug becomes a full GitHub account takeover.

**Fix:** replace the regex with an explicit **method + path allowlist** that matches only
the functions in `src/api/github.js` (contents, commits, compare, issues, branches, pulls,
pages, check-runs, starred, and repo create/patch/delete). Block `keys`, `hooks`,
`collaborators` (until the invite feature uses it deliberately), `actions/secrets`, and
`/user/*` except `GET /user` and `/user/starred/*`. Add tests for blocked paths.
*Effort: ½ day.*

### S-2 — DOMPurify has a known critical advisory · **High (patch now)**

GHSA-c6gr-qvv4-5v3f. Real-world risk here is low because Yourkly uses the default HTML
parser, but DOMPurify is the only thing standing between user Markdown and the page, and
collaboration will make that content cross-user.
**Fix:** `npm audit fix` (patch-level bump), then rebuild. *Effort: 15 min.*

### S-3 — The OAuth `repo` scope gives access to *every* repository · **Medium** (SEC-003, still open)

A Yourkly session can read and change all of the user's repositories, not just their
Yourkly projects. Fixing S-1 shrinks the blast radius, but the scope itself stays broad.
**Fix:** move to a **GitHub App** with per-repository installation and fine-grained
permissions (Contents, Issues, Pull requests, Pages, and Metadata, all read/write; Checks
read). User-to-server tokens expire after 8 hours and come with refresh tokens. Users then
pick exactly which projects Yourkly can touch, in plain language: "Choose which projects
Yourkly can open". *Effort: 1–2 weeks, including a migration path for signed-in users.*

### S-4 — Rate limiting doesn't work on serverless · **Medium**

`lib/security.js` keeps its counters in a `Map` in memory. Each Vercel instance has its own
`Map`, and the instances get recycled, so the limits are mostly fiction in production. The
key also trusts the first `x-forwarded-for` value.
**Fix:** use **Vercel Firewall rate-limit rules** on `/api/oauth/*`, `/api/logout` and
`/api/github/*` (no code needed), or a shared store (Vercel KV / Upstash / Cloudflare KV).
Key on `x-vercel-forwarded-for` or `x-real-ip`. *Effort: ½ day.*

### S-5 — Sessions can't be ended from the server · **Medium**

The session lives entirely in the cookie, so Yourkly has no list of active sessions. It
can't offer "sign out of all devices", and a copied cookie keeps working until it expires
(up to 8 hours) or the user revokes the grant on GitHub. There's no idle timeout. Rotating
`GITHUB_SESSION_SECRET` logs everyone out because only one key is supported.
**Fix:**
- Add a session ID to the sealed cookie, backed by a small server-side store (KV or DB).
  That makes revocation, "sign out everywhere", and "your devices" possible.
- Add a 30-minute idle timeout with sliding renewal.
- Support a **key ring** (`kid` in the cookie) so secrets can be rotated without forcing
  everyone to sign in again.
- Rename cookies to `__Host-yourkly_session` so they're locked to the exact host.

*Effort: 2–3 days.*

### S-6 — Dangerous actions need only one click · **Medium**

> **Correction, 2026-11-17:** this was overstated. Delete already requires typing the
> project name (`Settings.jsx`), and "Make public" already asks for a second
> confirmation (`Share.jsx`). What's still missing: re-authentication when the session is
> old, and the user-visible activity log.

"Delete project", "Make public (anyone with the link)", and "Restore an old version" run
with the same session as reading a file. Share already asks for a second confirmation.
**Fix:** add **step-up confirmation** for destructive or exposure-changing actions. Make the
user type the project name, and require re-authentication if the session is more than
15 minutes old. Record these actions in an **activity/audit log** the user can see:
"You made 'Novel' public on Tuesday at 3:14pm". *Effort: 2 days.*

### S-7 — Data in this browser outlives the sign-in · **Medium**

> **Short-term fix done, 2026-11-17:** Account has an "Also remove my Yourkly information
> from this computer" choice at sign-out (`src/utils/deviceData.js`). It says how many
> unsaved changes would be lost, and it never removes native projects.

Native projects, drafts, project memory, update memory, and the project picker all live
unencrypted in `localStorage`. On a shared or library computer, the next person sees all of
it. There's no login on native projects at all; this is intentional (D-009), but it's a
privacy issue for nontechnical users.
**Fix (short term):**
- On sign-out, offer "Also remove this project data from this computer".
- Show a clear "This is a shared computer" option.

**Fix (long term):** Yourkly accounts with cloud sync (see Phase 4).
*Effort: 1 day short term.*

### S-8 — Smaller items · **Low**

- **HSTS:** add `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  to `vercel.json` explicitly. Don't rely on platform defaults.
- **Raw GitHub errors:** the proxy passes GitHub's response bodies straight through. Make
  sure every screen translates them; AGENTS.md forbids showing raw GitHub errors.
  Consider adding a translation layer in `src/api/github.js`.
- **Constant-time comparisons:** compare `state` and the CSRF token with
  `crypto.timingSafeEqual`. The risk is minor, but the fix is cheap.
- **No CI:** nothing runs tests, `npm audit`, or secret scanning on pull requests. Add a
  GitHub Actions workflow plus **Dependabot**, **CodeQL**, and **secret scanning / push
  protection** on the repo. Add a `"test"` script to `package.json`.
- **CSP:** `style-src 'unsafe-inline'` is acceptable for now. Revisit once inline styles
  are gone.
- **Local dev:** `originIsSameSite` accepts a missing Origin outside production. That's
  fine, but don't deploy `server.js` publicly.

### Login security for users (what to tell them and build)

- Yourkly has no password of its own, so the account is **only as safe as the GitHub
  account**. Add a check after sign-in that nudges users without GitHub two-factor
  authentication: "Turn on a second sign-in step on GitHub. It takes 2 minutes." GitHub's
  API doesn't expose 2FA status for OAuth Apps, so this is guidance plus a link. GitHub
  now requires 2FA for most contributors anyway.
- For Yourkly-only (native) users, Phase 4 adds **passkeys** and **email magic links**
  instead of passwords. Both are safer and easier for nontechnical people.

---

## 3. Feature gaps vs GitHub (in Yourkly's plain language)

Yourkly already covers projects, files, the editor, Save Points, history, restore, What
Changed, Things to Do (issues), Publish (Pages), Share settings, project health/checks,
stars, AI handoff and review, and native local projects with import/export.

| GitHub capability | Yourkly name | Have it? | Gap |
|---|---|---|---|
| Collaborators & roles | **People on this project** | Partial (Share explains it) | Actually send invites from Yourkly; show pending invites, roles (Can read / Can edit / Can manage), and removal |
| Pull request review | **Ask someone to check this** | Partial (ReviewAndSave makes a PR) | Request a reviewer, comment, approve or "needs changes", in plain language |
| Comments | **Notes on a line / on a Save Point** | ❌ | Leave a note on a file line or Save Point; reply; mark resolved |
| Notifications | **What needs you** | Partial (AI inbox) | Invites, review requests, comments, assigned tasks; optional email digest |
| Branches | **Try-out copy** | Hidden | "Try an idea without touching the real version", then "Keep it" or "Throw it away" |
| Issues: labels, assignees, milestones | **Things to do**: tags, who's on it, goals with dates | Basic | Assign people, due dates, a simple board (To do / Doing / Done) |
| File upload, folders, rename/move | **Add a photo or file; folders** | Text files only | Drag-and-drop images and PDFs, create folders, rename and move |
| Code search | **Find in this project** | ❌ | Search across all files |
| Blame | **Who wrote this part** | ❌ | Per-line "last changed by / when" |
| Compare any two versions | **Compare two versions** | Partial | Pick any two Save Points and see the difference |
| Releases & tags | **Finished editions** | ❌ | Mark a version as "Edition 1.0" and download it as a zip |
| Fork | **Make my own copy** | ❌ | Copy someone's public project into your account |
| Templates | **Start from a template** | ❌ | Resume, novel, website, research notes |
| Wiki / Discussions | **Project notebook / Conversations** | ❌ | Lower priority |
| Actions | **Automatic checks** | Read-only | Plain-language templates later ("Check spelling on every save") |
| Pages custom domain | **Your own web address** | ❌ | Connect `mysite.com` to a published project |
| Organizations / teams | **Shared workspace** | ❌ | A group of people sharing several projects |
| Account without GitHub | **Yourkly account** | ❌ (native is device-only) | Email/passkey login, cloud sync, cross-device |
| Mobile app | **Yourkly on your phone** | Responsive web | Installable PWA, offline drafts |

---

## 4. Build plan

Each phase is shippable on its own. Security comes first because collaboration multiplies
the impact of every open issue.

### Phase 0 — Quick security fixes (week 1)
> **Status, 2026-11-17:**
> - Done: items 1, 2 and 4, plus the CI workflow and Dependabot.
> - Remaining:
>   - Item 3: Vercel Firewall rules, which need owner approval.
>   - Turning on CodeQL, secret scanning and push protection in the repository settings.

1. S-2: `npm audit fix`, then rebuild.
2. S-1: explicit proxy allowlist, plus tests for blocked paths.
3. S-4: Vercel Firewall rate-limit rules.
4. S-8: HSTS header, `timingSafeEqual`, and a `"test"` script.
5. CI: a GitHub Actions workflow (build, test, `npm audit --audit-level=high`), plus
   Dependabot, CodeQL, and secret-scanning push protection.

### Phase 1 — Login & session hardening (weeks 2–4)
1. S-5: server-side session store, idle timeout, key ring, `__Host-` cookies,
   "Sign out of all devices" and "Your devices" on Account.
2. S-6: step-up confirmation and a user-visible activity log.
3. S-7: "Remove data from this computer" on sign-out, and a shared-computer mode.
4. S-3: GitHub App migration ("Choose which projects Yourkly can open"). Run both apps in
   parallel for one release, then retire the OAuth App.
5. Record decisions D-011 (GitHub App) and D-012 (session store choice) in `DECISIONS.md`.

### Phase 2 — Working together (weeks 5–8)
1. People on this project: invite, roles, pending invites, removal. This re-enables the
   `collaborators` path in the allowlist deliberately.
2. Ask someone to check this: reviewer request, approve / needs changes, merge as
   "Keep these changes".
3. Notes on lines and Save Points (comments), replies, resolve.
4. "What needs you" notification center, plus an optional email digest.
5. Things to do: assignees, due dates, a simple board.

### Phase 3 — Working with files (weeks 9–11)
1. Upload images/PDFs, folders, rename/move. Enforce size limits, and allow only image/PDF
   types to preview.
2. Find in this project (search).
3. Compare any two versions; "Who wrote this part".
4. Finished editions (releases), plus "Download this version".
5. Code-split the bundle to clear the 500 kB warning.

### Phase 4 — Yourkly accounts & sync (weeks 12–16) — *needs an owner decision*
Native projects are device-only today. To make Yourkly a real alternative for people with
no GitHub account, it needs its own accounts and storage:
- **Login:** passkeys plus email magic link, and optional TOTP. No passwords.
- **Storage:** content-addressed snapshots (the native snapshot engine already exists),
  synced to a database and object store, end-to-end where practical.
- **Hosting choice:** D-004 says Cloudflare is the intended future host, but production is
  on Vercel. Pick one before this phase:
  - **Cloudflare:** D1, KV, and R2, which lines up with D-004.
  - **Supabase:** Postgres, Auth with passkeys/magic link, Storage, and row-level security.
    It's already connected to your Claude account.
- Optional "Connect GitHub later" so native projects can graduate to GitHub.

### Phase 5 — Reach & polish (ongoing)
Make my own copy (fork), templates, your own web address, shared workspaces, an
installable PWA with offline drafts, and plain-language automatic-check templates.

---

## 5. Connectors & MCP servers that would help

**Already connected to your Claude account:**

| Connector | Use it for |
|---|---|
| **GitHub** | Turn this plan into issues and milestones; open security PRs; run **secret scanning**; read Actions/CI logs |
| **Vercel** | Set **Firewall rate-limit rules** (S-4), manage `GITHUB_SESSION_SECRET` and env vars, read runtime errors/logs after each release, roll back |
| **Supabase** | If chosen for Phase 4: auth (passkeys/magic link), Postgres with row-level security, security advisors (`get_advisors`) |
| **Cloudflare** | If chosen for Phase 4 (matches D-004): D1, KV for sessions/rate limits, R2 for files. The connected server is deprecated; reconnect the newer Cloudflare API MCP (`mcp.cloudflare.com/mcp`) |
| **Figma** | Design the collaboration, notification, and "Your devices" screens before building them |
| **Gmail** | Test invite and digest emails during development. For production email, use a transactional provider such as Resend or Postmark |

**Worth adding (not connected yet):**

| Connector | Why |
|---|---|
| **Sentry** | Error monitoring for the frontend and the API functions. Today, failed sign-ins and proxy errors are invisible |
| **Linear** or **Asana** | Track this build plan. The plugin versions failed to connect in this session; connect them via claude.ai settings |
| **Clerk** (optional) | A managed alternative for Phase 4 accounts (passkeys, MFA, organizations). It adds a dependency and a vendor, so weigh it against Supabase Auth |

**GitHub-native tools (free, no connector needed):** Dependabot alerts and updates, CodeQL
code scanning, and secret-scanning push protection. Turn on all three in the repository's
Settings, under "Code security".
