import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { blockedUserIds, canViewProfile, isBlocked } from '@/lib/visibility'
import { deny, galaxyAccess, type Actor, type Tx } from '@/lib/galaxy-workflow'
import { safeApiError } from '@/lib/api-input'
import { serializeComment, type StreamCommentInclude, serializePost, type StreamPostInclude } from '@/lib/stream-posts'

export const POST_CONTEXT_INCLUDE = {
  galaxy: { select: { id: true, name: true, slug: true } },
  event: { select: { id: true, galaxyId: true, title: true, status: true, date: true, proposerId: true, proposer: { select: { deletedAt: true } } } },
} satisfies Prisma.PostInclude

export async function visiblePostWhere(viewerId: string | null): Promise<Prisma.PostWhereInput> {
  const excluded = viewerId ? [...await blockedUserIds(viewerId)] : []
  const audience: Prisma.PostWhereInput[] = [{ contextRestricted: false }]
  if (viewerId) audience.push({ authorId: viewerId }, {
    contextRestricted: true,
    galaxy: { OR: [{ creatorId: viewerId }, { memberships: { some: { userId: viewerId } } }] },
    OR: [{ eventId: null }, { event: { status: { in: ['APPROVED', 'PASSED', 'CANCELLED'] }, proposerId: { notIn: excluded }, proposer: { deletedAt: null } } }],
  })
  return { author: { deletedAt: null }, authorId: { notIn: excluded }, OR: audience }
}

export async function postReadDenial(id: string, viewerId: string | null) {
  try {
    return await prisma.post.findFirst({ where: { AND: [{ id }, await visiblePostWhere(viewerId)] }, select: { id: true } })
      ? null : Response.json({ error: 'notFound' }, { status: 404 })
  } catch (error) { return safeApiError(error) }
}

export async function bindPostContext(tx: Tx, actor: Actor, input: { galaxyId?: string | null; eventId?: string | null }, existingEventId?: string | null) {
  let galaxyId = input.galaxyId ?? null
  const eventId = input.eventId ?? null
  if (eventId) {
    const event = await tx.event.findUnique({ where: { id: eventId }, select: { galaxyId: true } })
    if (!event) deny('contextUnavailable', 404)
    if (galaxyId && galaxyId !== event.galaxyId) deny('contextMismatch', 400)
    galaxyId = event.galaxyId
  }
  if (!galaxyId) return { galaxyId: null, eventId: null, contextRestricted: false }
  const access = await galaxyAccess(tx, galaxyId, actor, true)
  if (!access.membership && !access.isOwner) deny('contextUnavailable', 404)
  if (eventId) {
    await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} FOR UPDATE`
    const event = await tx.event.findUnique({ where: { id: eventId }, include: { proposer: { select: { deletedAt: true } } } })
    if (!event || event.galaxyId !== galaxyId || !['APPROVED', 'PASSED', ...(existingEventId === eventId ? ['CANCELLED'] : [])].includes(event.status)
      || event.proposer.deletedAt || await isBlocked(actor.id, event.proposerId, tx)) deny('contextUnavailable', 404)
  }
  return { galaxyId, eventId, contextRestricted: true }
}

type ContextPost = StreamPostInclude & {
  galaxy?: { id: string; name: string; slug: string } | null
  event?: { id: string; galaxyId: string; title: string; status: string; date: Date; proposerId: string; proposer: { deletedAt: Date | null } } | null
}
export async function serializeContextPost(post: ContextPost, viewerId: string | null) {
  const summary = serializePost(post, viewerId)
  const hidden = viewerId ? await blockedUserIds(viewerId) : new Set<string>()
  const access = viewerId && post.galaxy ? await galaxyAccess(prisma, post.galaxy.id, { id: viewerId }) : null
  const permitted = !!access && (!!access.membership || access.isOwner)
  const safeEvent = permitted && post.event && !post.event.proposer.deletedAt && !hidden.has(post.event.proposerId) && ['APPROVED', 'PASSED', 'CANCELLED'].includes(post.event.status) ? post.event : null
  const visibleAuthor = await canViewProfile(viewerId, post.authorId)
  const author = visibleAuthor ? summary.author : { ...summary.author, planetId: null, planetTexture: null, planetConfig: null, tintColor: '#a78bfa' }
  return { ...summary, author, contextRestricted: post.contextRestricted,
    context: permitted && post.galaxy ? { galaxy: { ...post.galaxy, href: `/galaxy/${encodeURIComponent(post.galaxy.slug)}` }, event: safeEvent ? { id: safeEvent.id, title: safeEvent.title, date: safeEvent.date.toISOString(), status: safeEvent.status, href: `/galaxy/${encodeURIComponent(post.galaxy.slug)}?event=${encodeURIComponent(safeEvent.id)}#events` } : null } : null,
    ...(post.authorId === viewerId ? { editableContext: { galaxyId: post.galaxyId, eventId: post.eventId } } : {}),
    ...(summary.comments ? { comments: await Promise.all(summary.comments.filter(c => !hidden.has(c.author.id)).map(async c => ({ ...c,
      author: await canViewProfile(viewerId, c.author.id) ? c.author : { ...c.author, planetId: null, planetTexture: null, planetConfig: null },
      replies: await Promise.all((c.replies ?? []).filter(r => !hidden.has(r.author.id)).map(async r => ({ ...r, author: await canViewProfile(viewerId, r.author.id) ? r.author : { ...r.author, planetId: null, planetTexture: null, planetConfig: null } }))),
    }))) } : {}),
  }
}

export async function serializeVisibleComment(comment: StreamCommentInclude, viewerId: string | null): Promise<import('@/types/stream').StreamComment | null> {
  if (viewerId && await isBlocked(viewerId, comment.author.id)) return null
  const summary = serializeComment(comment, viewerId)
  const visible = await canViewProfile(viewerId, comment.author.id)
  const replies = await Promise.all((comment.replies ?? []).map(reply => serializeVisibleComment(reply, viewerId)))
  return { ...summary, author: visible ? summary.author : { ...summary.author, planetId: null, planetTexture: null, planetConfig: null }, replies: replies.filter(reply => reply !== null) } as import('@/types/stream').StreamComment
}
