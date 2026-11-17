/**
 * lib/githubAllowlist.js — the only GitHub requests the proxy will forward.
 *
 * The session holds a `repo`-scope token, so anything the proxy relays runs
 * with full access to the person's account. Each rule here matches one call
 * in src/api/github.js. Everything else is refused, including:
 * adding SSH or deploy keys, webhooks, collaborators, Actions secrets, and
 * reading account data such as email addresses.
 *
 * When a new feature needs another GitHub call, add a rule here on purpose,
 * with a test in tests/github-allowlist.test.js.
 */

const NAME = '[A-Za-z0-9_.-]+'
const REPO = `/repos/${NAME}/${NAME}`

const RULES = [
  // Account
  ['GET', '/user'],
  ['GET POST', '/user/repos'],
  ['GET PUT DELETE', `/user/starred/${NAME}/${NAME}`],

  // Project
  ['GET PATCH DELETE', REPO],

  // Files
  ['GET', `${REPO}/contents(?:/.+)?`],
  ['PUT DELETE', `${REPO}/contents/.+`],

  // Save points and history
  ['GET', `${REPO}/commits`],
  ['GET', `${REPO}/commits/${NAME}`],
  ['GET', `${REPO}/commits/${NAME}/check-runs`],
  ['GET', `${REPO}/compare/.+`],
  ['GET', `${REPO}/branches`],
  ['GET', `${REPO}/branches/.+`],
  ['POST', `${REPO}/git/refs`],

  // Asking for changes to be kept
  ['POST', `${REPO}/pulls`],
  ['PUT', `${REPO}/pulls/\\d+/merge`],

  // Things to do
  ['GET POST', `${REPO}/issues`],
  ['PATCH', `${REPO}/issues/\\d+`],

  // Publishing
  ['GET POST', `${REPO}/pages`],
].map(([methods, pattern]) => ({
  methods: new Set(methods.split(' ')),
  pattern: new RegExp(`^${pattern}$`),
}))

// A `.` or `..` path segment, plain or percent-encoded, would let a request
// climb out of the allowed path once the URL is normalised. Three dots inside
// a segment (GitHub's `compare/base...head`) are fine.
function hasDotSegment(pathname) {
  return pathname.split('/').some(segment => {
    let decoded = segment
    try { decoded = decodeURIComponent(segment) } catch { return true }
    return decoded === '.' || decoded === '..' || decoded.includes('/..') || decoded.startsWith('../')
  })
}

/**
 * True when `method` + `path` (which may include a query string) is a request
 * Yourkly makes. Dot segments, a scheme, or a backslash are always refused.
 */
export function isAllowedGitHubRequest(method, path) {
  const value = String(path || '')
  if (!value.startsWith('/') || value.includes('://') || value.includes('\\')) return false
  const pathname = value.split('?')[0]
  if (hasDotSegment(pathname)) return false
  return RULES.some(rule => rule.methods.has(method) && rule.pattern.test(pathname))
}
