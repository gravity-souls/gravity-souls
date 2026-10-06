import { z } from 'zod'

export const DISCUSSION_REPLY_PREVIEW = 3

const cursorSchema = z.object({
  id: z.string().min(1).max(191),
  createdAt: z.iso.datetime(),
}).strict()

export function communityCursor(row: { id: string; createdAt: Date }) {
  return Buffer.from(JSON.stringify({ id: row.id, createdAt: row.createdAt.toISOString() })).toString('base64url')
}

export function readCommunityPage(request: Request) {
  const params = new URL(request.url).searchParams
  const invalid = () => { throw Response.json({ error: 'Invalid pagination' }, { status: 400 }) }
  if ([...params.keys()].some(key => !['limit', 'cursor'].includes(key)) ||
      params.getAll('limit').length > 1 || params.getAll('cursor').length > 1) invalid()
  const limit = params.get('limit') ?? '20'
  if (!/^[1-9]\d?$/.test(limit) || Number(limit) > 50) invalid()
  const encoded = params.get('cursor')
  let cursor: z.infer<typeof cursorSchema> | null = null
  if (encoded !== null) {
    if (!encoded || encoded.length > 512 || !/^[A-Za-z0-9_-]+$/.test(encoded)) invalid()
    try {
      cursor = cursorSchema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')))
    } catch { invalid() }
  }
  return { limit: Number(limit), cursor }
}

export function communityPageBoundary(cursor: { id: string; createdAt: string }, direction: 'asc' | 'desc') {
  const comparison = direction === 'asc' ? 'gt' : 'lt'
  const createdAt = new Date(cursor.createdAt)
  return { OR: [
    { createdAt: { [comparison]: createdAt } },
    { createdAt, id: { [comparison]: cursor.id } },
  ] }
}
