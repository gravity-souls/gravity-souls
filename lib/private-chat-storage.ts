import { put, get, del } from '@vercel/blob'
import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises'
import path from 'node:path'
const unavailable = () => Response.json({ error: 'storageUnavailable' }, { status: 503 })
function config() {
  const token = process.env.CHAT_PRIVATE_BLOB_TOKEN
  if (token) return { token, directory: '' }
  const directory = process.env.CHAT_IMAGE_LOCAL_DIR
  if (process.env.NODE_ENV === 'production' || !directory || !path.isAbsolute(directory) || path.resolve(directory).split(path.sep).includes('public')) throw unavailable()
  return { token: '', directory }
}
function location(key: string) {
  if (!/^chat-images\/[a-f0-9-]{36}\.webp$/.test(key)) throw unavailable()
  const settings = config()
  return { ...settings, filename: path.join(settings.directory, key) }
}
export function requirePrivateChatStorage() { config() }
export async function writePrivateChatImage(key: string, data: Buffer) {
  const settings = location(key)
  if (settings.token) { await put(key, data, { access: 'private', token: settings.token, addRandomSuffix: false, allowOverwrite: false, contentType: 'image/webp', abortSignal: AbortSignal.timeout(30000) }); return }
  await mkdir(path.dirname(settings.filename), { recursive: true, mode: 0o700 }); await writeFile(settings.filename, data, { flag: 'wx', mode: 0o600 })
}
export async function readPrivateChatImage(key: string): Promise<ReadableStream<Uint8Array> | Uint8Array | null> {
  const settings = location(key)
  if (settings.token) { const result = await get(key, { access: 'private', token: settings.token, useCache: false }); return result?.statusCode === 200 ? result.stream : null }
  try { return new Uint8Array(await readFile(settings.filename)) } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error }
}
export async function deletePrivateChatImage(key: string) {
  const settings = location(key)
  if (settings.token) { await del(key, { token: settings.token }); return }
  try { await unlink(settings.filename) } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
}
