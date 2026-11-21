import crypto from 'node:crypto'

const SESSION_COOKIE = 'plainly_session'
const OAUTH_COOKIE = 'plainly_oauth_transaction'
const SESSION_SECONDS = 8 * 60 * 60
const OAUTH_SECONDS = 10 * 60
// Signed out after this long with no requests, as well as after SESSION_SECONDS
// in total. Writing in the editor doesn't reach the server, but drafts are kept
// in the browser, so an idle sign-out never loses work.
export const SESSION_IDLE_SECONDS = 2 * 60 * 60
// Re-seal the cookie with a new "last active" time at most this often, rather
// than on every request.
const TOUCH_AFTER_SECONDS = 5 * 60

function key() {
  const raw = process.env.GITHUB_SESSION_SECRET
  if (!raw) throw new Error('missing_session_secret')
  const value = Buffer.from(raw, 'base64url')
  if (value.length !== 32) throw new Error('invalid_session_secret')
  return value
}

function seal(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('base64url')).join('.')
}

function open(value) {
  try {
    const [iv, tag, encrypted] = String(value || '').split('.').map(part => Buffer.from(part, 'base64url'))
    if (!iv || !tag || !encrypted) return null
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    decipher.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8'))
  } catch {
    return null
  }
}

function cookies(req) {
  return Object.fromEntries(
    String(req.headers?.cookie || '')
      .split(';')
      .map(part => part.trim().split(/=(.*)/s, 2))
      .filter(([name]) => name)
  )
}

function cookie(name, value, seconds) {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure ? '; Secure' : ''}`
}

function appendCookie(res, value) {
  const existing = res.getHeader('Set-Cookie')
  res.setHeader('Set-Cookie', existing ? [...(Array.isArray(existing) ? existing : [existing]), value] : value)
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function setOAuthTransaction(res, transaction) {
  res.setHeader('Set-Cookie', cookie(OAUTH_COOKIE, seal({ ...transaction, exp: Date.now() + OAUTH_SECONDS * 1000 }), OAUTH_SECONDS))
}

export function readOAuthTransaction(req) {
  const transaction = open(cookies(req)[OAUTH_COOKIE])
  return transaction?.exp > Date.now() ? transaction : null
}

export function setSession(res, token) {
  const csrf = randomToken()
  const now = Date.now()
  appendCookie(res, cookie(SESSION_COOKIE, seal({ token, csrf, exp: now + SESSION_SECONDS * 1000, seen: now }), SESSION_SECONDS))
  return csrf
}

export function clearOAuthTransaction(res) {
  appendCookie(res, cookie(OAUTH_COOKIE, '', 0))
}

export function readSession(req) {
  const session = open(cookies(req)[SESSION_COOKIE])
  const now = Date.now()
  if (!session?.token || !session?.csrf || !(session?.exp > now)) return null
  // Sessions sealed before the idle limit existed have no `seen`; they are
  // still bounded by `exp` and gain a `seen` on their next request.
  if (session.seen && now - session.seen > SESSION_IDLE_SECONDS * 1000) return null
  return session
}

/**
 * Records activity on a valid session so the idle limit counts from now.
 * Keeps the same token, CSRF value and overall expiry.
 */
export function touchSession(res, session) {
  const now = Date.now()
  if (session.seen && now - session.seen < TOUCH_AFTER_SECONDS * 1000) return
  const remaining = Math.floor((session.exp - now) / 1000)
  if (remaining <= 0) return
  appendCookie(res, cookie(SESSION_COOKIE, seal({ ...session, seen: now }), remaining))
}

export function clearAuthCookies(res) {
  res.setHeader('Set-Cookie', [
    cookie(SESSION_COOKIE, '', 0),
    cookie(OAUTH_COOKIE, '', 0),
  ])
}

export function originIsSameSite(req) {
  const origin = req.headers?.origin
  if (!origin) return process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1'
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host
  const protocol = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim()
  if (origin === `${protocol}://${host}` || origin === process.env.FRONTEND_URL) return true

  // Vercel can redirect an apex domain to its www alias before a fetch reaches
  // this function. The browser correctly preserves the original Origin on the
  // redirected POST, so accept only that exact apex/www pair — never a general
  // cross-origin request. This keeps the OAuth transaction protected while
  // allowing https://yourkly.com and https://www.yourkly.com to interoperate.
  try {
    const requestHost = String(host || '').toLowerCase().split(':')[0]
    const originUrl = new URL(origin)
    const originHost = originUrl.hostname.toLowerCase()
    const withoutWww = value => value.replace(/^www\./, '')
    const isApexWwwPair = withoutWww(originHost) === withoutWww(requestHost) && originHost !== requestHost
    return originUrl.protocol === `${protocol}:` && isApexWwwPair
  } catch {
    return false
  }
}
