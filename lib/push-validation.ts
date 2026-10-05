import { createHash, ECDH } from 'node:crypto'
import { z } from 'zod'

export function validPushEndpoint(value: string) {
  try {
    const url = new URL(value)
    if (value.length > 2048 || url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || /[\s\\]/.test(value)) return false
    if (url.search && !/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)) return false
    return (url.hostname === 'fcm.googleapis.com' && /^\/(fcm\/send|wp)\/[A-Za-z0-9_:-]+$/.test(url.pathname)) ||
      (url.hostname === 'updates.push.services.mozilla.com' && /^\/(wpush\/v[12]|push\/v1)\/[A-Za-z0-9_-]+$/.test(url.pathname)) ||
      (url.hostname === 'web.push.apple.com' && /^\/[A-Za-z0-9_/-]+$/.test(url.pathname)) ||
      (/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname) && url.pathname === '/w/' && !!url.search)
  } catch { return false }
}
export const endpointSchema = z.string().max(2048).refine(validPushEndpoint)
const base64Key = (bytes: number) => z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).max(128).refine(value => Buffer.from(value, 'base64url').length === bytes)
export const subscriptionSchema = z.object({ endpoint: endpointSchema, keys: z.object({ p256dh: base64Key(65).refine(value => { try { ECDH.convertKey(Buffer.from(value, 'base64url'), 'prime256v1'); return true } catch { return false } }), auth: base64Key(16) }).strict(), preview: z.enum(['generic', 'sender']).default('generic') }).strict()
export const endpointHash = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex')
export const pushHeaders = { 'Cache-Control': 'private, no-store' }
export function requirePushOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw Response.json({ error: 'origin' }, { status: 403, headers: pushHeaders })
}
