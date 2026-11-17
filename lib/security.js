import crypto from 'node:crypto'

const buckets = new Map()

/** Constant-time string comparison for secrets such as CSRF tokens and OAuth state. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

/**
 * The caller's IP for rate limiting. Vercel sets `x-vercel-forwarded-for` and
 * `x-real-ip` itself; the first `x-forwarded-for` entry can be supplied by the
 * client, so it is only a fallback (local development).
 */
function clientAddress(req) {
  const h = req.headers || {}
  const first = value => String(value || '').split(',')[0].trim()
  return first(h['x-vercel-forwarded-for']) || first(h['x-real-ip']) ||
    first(h['x-forwarded-for']) || req.socket?.remoteAddress || 'unknown'
}

export function requireJson(req, res) {
  if (!String(req.headers?.['content-type'] || '').toLowerCase().startsWith('application/json')) {
    res.status(415).json({ error: 'json_required' })
    return false
  }
  return true
}

export function limit(req, res, { max, windowMs }) {
  // Per-instance memory only: on serverless this is a backstop, not the real
  // limit. Production limits belong in the Vercel Firewall (see BUILD_PLAN S-4).
  const key = `${String(req.url || '').split('?')[0]}:${clientAddress(req)}`
  const now = Date.now()
  const current = buckets.get(key)
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current
  bucket.count += 1
  buckets.set(key, bucket)
  res.setHeader('RateLimit-Limit', max)
  res.setHeader('RateLimit-Remaining', Math.max(0, max - bucket.count))
  if (bucket.count <= max) return true
  res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
  res.status(429).json({ error: 'too_many_requests' })
  return false
}

export function hasSafeSize(value, max = 8192) {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}
