import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { setSession, readSession, touchSession, SESSION_IDLE_SECONDS } from '../lib/session.js'

const realNow = Date.now
afterEach(() => { Date.now = realNow })

function res() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v }, getHeader(k) { return this.headers[k] } }
}
function cookieFrom(r) {
  const v = r.headers['Set-Cookie']
  return (Array.isArray(v) ? v[v.length - 1] : v).split(';')[0]
}
function at(ms) { Date.now = () => ms }

test('a session expires after the idle limit even though the 8-hour limit has not passed', () => {
  process.env.GITHUB_SESSION_SECRET = Buffer.alloc(32, 7).toString('base64url')
  const start = realNow()
  at(start)
  const r = res()
  setSession(r, 'tok')
  const req = { headers: { cookie: cookieFrom(r) } }

  at(start + (SESSION_IDLE_SECONDS - 60) * 1000)
  assert.ok(readSession(req), 'still valid just before the idle limit')

  at(start + (SESSION_IDLE_SECONDS + 60) * 1000)
  assert.equal(readSession(req), null, 'refused after the idle limit')
})

test('activity keeps the session alive and keeps the same CSRF value and overall expiry', () => {
  process.env.GITHUB_SESSION_SECRET = Buffer.alloc(32, 7).toString('base64url')
  const start = realNow()
  at(start)
  const r = res()
  const csrf = setSession(r, 'tok')
  const first = readSession({ headers: { cookie: cookieFrom(r) } })

  // Within 5 minutes: no new cookie.
  at(start + 60_000)
  const quiet = res()
  touchSession(quiet, first)
  assert.equal(quiet.headers['Set-Cookie'], undefined)

  // Later: re-sealed with a new last-active time.
  at(start + 90 * 60_000)
  const touched = res()
  touchSession(touched, readSession({ headers: { cookie: cookieFrom(r) } }))
  assert.match(String(touched.headers['Set-Cookie']), /HttpOnly/)

  // 90 more minutes is past the idle limit from the start, but not from the touch.
  at(start + 180 * 60_000)
  const later = readSession({ headers: { cookie: cookieFrom(touched) } })
  assert.ok(later)
  assert.equal(later.csrf, csrf)
  assert.equal(later.exp, first.exp)
})
