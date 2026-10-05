import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { MAX_CHAT_IMAGE_BYTES, CHAT_IMAGE_MIMES } from './chat-image-types'
export async function normalizeChatImage(request: Request) {
  const mime = request.headers.get('content-type')?.split(';')[0]
  if (!CHAT_IMAGE_MIMES.some(value => value === mime)) throw Response.json({ error: 'invalidImage' }, { status: 415 })
  if (Number(request.headers.get('content-length')) > MAX_CHAT_IMAGE_BYTES) throw Response.json({ error: 'tooLarge' }, { status: 413 })
  const reader = request.body?.getReader()
  if (!reader) throw Response.json({ error: 'invalidImage' }, { status: 400 })
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const chunk = await reader.read(); if (chunk.done) break
      size += chunk.value.byteLength
      if (size > MAX_CHAT_IMAGE_BYTES) { await reader.cancel(); throw Response.json({ error: 'tooLarge' }, { status: 413 }) }
      chunks.push(chunk.value)
    }
  } finally { reader.releaseLock() }
  const raw = Buffer.concat(chunks)
  try {
    const decoder = sharp(raw, { limitInputPixels: 16_000_000, failOn: 'error' })
    const meta = await decoder.metadata()
    const actual = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[meta.format as 'jpeg' | 'png' | 'webp']
    if (!actual || actual !== mime || (meta.pages ?? 1) > 1) throw new Error('format')
    const result = await decoder.rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
    if (result.data.length > MAX_CHAT_IMAGE_BYTES) throw new Error('size')
    return { data: result.data, width: result.info.width, height: result.info.height, bytes: result.data.length, rawDigest: createHash('sha256').update(raw).digest('hex') }
  } catch { throw Response.json({ error: 'invalidImage' }, { status: 400 }) }
}
