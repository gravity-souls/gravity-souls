import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { SHARE_KINDS } from '@/lib/chat-share-types'
import { resolveSharedCard } from '@/lib/chat-shares'
import { visibleConversationWhere } from '@/lib/inbox'
import { invitationHeaders } from '@/lib/beam-invitations'
const schema = z.object({ kind: z.enum(SHARE_KINDS), search: z.string().trim().max(80).default(''), cursor: z.coerce.number().int().min(0).max(10000).refine(value => value % 20 === 0).optional() }).strict()
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(), { id } = await params
    const input = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!input.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const conversation = await prisma.conversationThread.findFirst({ where: { ...await visibleConversationWhere(user.id), id } })
    if (!conversation) return Response.json({ error: 'unavailable' }, { status: 404 })
    const recipient = await prisma.user.findFirst({ where: { id: conversation.userAId === user.id ? conversation.userBId : conversation.userAId, deletedAt: null }, select: { id: true, email: true } })
    if (!recipient) return Response.json({ error: 'unavailable' }, { status: 404 })
    const { kind, search, cursor } = input.data
    const args = { select: { id: true }, take: 21, orderBy: [{ createdAt: 'desc' as const }, { id: 'asc' as const }], skip: cursor ?? 0 }
    const rows = kind === 'planet' ? await prisma.planet.findMany({ ...args, where: { active: true, OR: [{ name: { contains: search, mode: 'insensitive' } }, { user: { name: { contains: search, mode: 'insensitive' } } }], user: { deletedAt: null } } }) : kind === 'galaxy' ? await prisma.community.findMany({ ...args, where: { name: { contains: search, mode: 'insensitive' } } }) : await prisma.event.findMany({ ...args, where: { title: { contains: search, mode: 'insensitive' }, proposer: { deletedAt: null } } })
    const more = rows.length > 20
    if (more) rows.pop()
    const options = []
    for (const row of rows) {
      const card = await resolveSharedCard(kind, row.id, user)
      if (card.available && (await resolveSharedCard(kind, row.id, recipient)).available) options.push(card)
    }
    return Response.json({ options, nextCursor: more && (cursor ?? 0) < 10000 ? String((cursor ?? 0) + 20) : null }, { headers: invitationHeaders })
  } catch (error) { return safeApiError(error) }
}
