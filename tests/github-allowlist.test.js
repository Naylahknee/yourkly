import { test, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { isAllowedGitHubRequest } from '../lib/githubAllowlist.js'
import { safeEqual } from '../lib/security.js'
import { setSession } from '../lib/session.js'
import proxyHandler from '../api/github/[...path].js'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })

const R = '/repos/alice/my-novel'

// Every request shape made by src/api/github.js.
const USED = [
  ['GET', '/user'],
  ['GET', '/user/repos?sort=updated&per_page=100&page=1'],
  ['POST', '/user/repos'],
  ['GET', '/user/starred/alice/my-novel'],
  ['PUT', '/user/starred/alice/my-novel'],
  ['DELETE', '/user/starred/alice/my-novel'],
  ['GET', R],
  ['PATCH', R],
  ['DELETE', R],
  ['GET', `${R}/contents`],
  ['GET', `${R}/contents/chapter%201.md`],
  ['GET', `${R}/contents/notes/ideas.md?ref=abc123`],
  ['PUT', `${R}/contents/notes%2Fideas.md`],
  ['DELETE', `${R}/contents/old.md`],
  ['GET', `${R}/commits?path=a.md&per_page=50`],
  ['GET', `${R}/commits?per_page=1`],
  ['GET', `${R}/commits/abc123`],
  ['GET', `${R}/commits/abc123/check-runs`],
  ['GET', `${R}/compare/abc...def`],
  ['GET', `${R}/compare/main...yourkly%2Fupdate-1`],
  ['GET', `${R}/branches?per_page=100`],
  ['GET', `${R}/branches/main`],
  ['POST', `${R}/git/refs`],
  ['POST', `${R}/pulls`],
  ['PUT', `${R}/pulls/12/merge`],
  ['GET', `${R}/issues?state=open&sort=updated&per_page=50`],
  ['POST', `${R}/issues`],
  ['PATCH', `${R}/issues/4`],
  ['GET', `${R}/pages`],
  ['POST', `${R}/pages`],
]

// Requests that would let a stolen session take over the account.
const BLOCKED = [
  ['POST', '/user/keys'],
  ['GET', '/user/emails'],
  ['POST', '/user/gpg_keys'],
  ['DELETE', '/user/repos'],
  ['POST', `${R}/keys`],
  ['POST', `${R}/hooks`],
  ['PUT', `${R}/collaborators/mallory`],
  ['PUT', `${R}/actions/secrets/TOKEN`],
  ['POST', `${R}/forks`],
  ['POST', `${R}/transfer`],
  ['PUT', `${R}/contents`],
  ['DELETE', `${R}/issues/4`],
  ['GET', '/orgs/acme/repos'],
  ['GET', `${R}/contents/../../user/keys`],
  ['GET', `${R}/contents/%2e%2e/%2E%2E/hooks`],
  ['GET', `${R}/contents/..%2F..%2Fhooks`],
  ['GET', `${R}/contents/./x`],
  ['GET', '/user\\keys'],
  ['GET', 'https://evil.example/user'],
  ['GET', ''],
]

test('every request Yourkly makes is allowed', () => {
  for (const [method, path] of USED) assert.ok(isAllowedGitHubRequest(method, path), `${method} ${path}`)
})

test('account-takeover and unused requests are refused', () => {
  for (const [method, path] of BLOCKED) assert.equal(isAllowedGitHubRequest(method, path), false, `${method} ${path}`)
})

test('proxy refuses a blocked request without contacting GitHub', async () => {
  process.env.GITHUB_SESSION_SECRET = Buffer.alloc(32, 3).toString('base64url')
  const cookieRes = { headers: {}, setHeader(k, v) { this.headers[k] = v }, getHeader(k) { return this.headers[k] } }
  const csrf = setSession(cookieRes, 'test-token')
  globalThis.fetch = async () => { assert.fail('blocked request reached GitHub') }

  const res = {
    headers: {}, statusCode: 200,
    setHeader(k, v) { this.headers[k] = v }, getHeader(k) { return this.headers[k] },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this }, send(body) { this.body = body; return this },
  }
  await proxyHandler({
    method: 'POST',
    url: '/api/github/user/keys',
    headers: { cookie: cookieRes.headers['Set-Cookie'].split(';')[0], 'x-csrf-token': csrf },
    body: { key: 'ssh-ed25519 AAAA' },
  }, res)
  assert.equal(res.statusCode, 403)
  assert.deepEqual(res.body, { error: 'github_request_not_allowed' })
})

test('safeEqual compares secrets exactly', () => {
  assert.equal(safeEqual('abc', 'abc'), true)
  assert.equal(safeEqual('abc', 'abd'), false)
  assert.equal(safeEqual('abc', 'abcd'), false)
  assert.equal(safeEqual(undefined, 'abc'), false)
  assert.equal(safeEqual('', ''), false)
})
