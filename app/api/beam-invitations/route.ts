import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { resourceId } from '@/lib/input-schemas'
import { blockedUserIds } from '@/lib/visibility'
import { canonicalPair, invitationHeaders, lockContactPair, permittedInvitationPair } from '@/lib/beam-invitations'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { NotificationTemplates } from '@/lib/createNotification'
import { resolveLocale } from '@/lib/i18n-locales'
import { USER_PLANET_CONFIG_SELECT, resolveUserPlanetConfig } from '@/lib/user-planet-config'

const querySchema = z.object({ direction: z.enum(['received', 'sent']).default('received'), cursor: resourceId.optional() }).strict()
const sendSchema = z.object({ recipientId: resourceId }).strict()
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const { direction, cursor } = parsed.data
    const mine = direction === 'received' ? { recipientId: user.id } : { senderId: user.id }
    if (cursor && !await prisma.beamInvitation.findFirst({ where: { ...mine, id: cursor }, select: { id: true } })) return Response.json({ error: 'invalidCursor' }, { status: 400 })
    const excluded = [...await blockedUserIds(user.id)]
    const selectUser = { id: true, name: true, ...USER_PLANET_CONFIG_SELECT, planets: { where: { active: true }, take: 1, select: { id: true, name: true, mood: true, visual: true, lifestyle: true, coreThemes: true } } } as const
    const rows = await prisma.beamInvitation.findMany({
      where: { ...mine, senderId: direction === 'sent' ? user.id : { notIn: excluded }, recipientId: direction === 'received' ? user.id : { notIn: excluded }, sender: { deletedAt: null }, recipient: { deletedAt: null } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { sender: { select: selectUser }, recipient: { select: selectUser } },
    })
    const more = rows.length > 20
    if (more) rows.pop()
    const invitations = []
    for (const row of rows) {
      if (!await permittedInvitationPair(row.senderId, row.recipientId)) continue
      const other = direction === 'received' ? row.sender : row.recipient
      const planet = other.planets[0]
      const conversation = row.status === 'ACCEPTED' ? await prisma.conversationThread.findUnique({ where: { userAId_userBId: canonicalPair(row.senderId, row.recipientId) }, select: { id: true } }) : null
      invitations.push({ id: row.id, status: row.status, createdAt: row.createdAt, otherUser: { id: other.id, name: other.name }, planet: planet ? { id: planet.id, name: planet.name, planetConfig: resolveUserPlanetConfig(other, planet) } : null, conversationId: conversation?.id ?? null })
    }
    return Response.json({ invitations, nextCursor: more ? rows.at(-1)!.id : null }, { headers: invitationHeaders })
  } catch (error) { return safeApiError(error) }
}
export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const input = await readJson(request, sendSchema)
    if (!input.ok) return input.response
    const { recipientId } = input.data
    if (user.id === recipientId) return Response.json({ error: 'unavailable' }, { status: 400 })
    const result = await prisma.$transaction(async tx => {
      await lockContactPair(tx, user.id, recipientId)
      if (!await permittedInvitationPair(user.id, recipientId, tx)) throw Response.json({ error: 'unavailable' }, { status: 404 })
      const pair = canonicalPair(user.id, recipientId)
      const thread = await tx.conversationThread.findUnique({ where: { userAId_userBId: pair }, select: { id: true } })
      if (thread) return { conversationId: thread.id, created: false }
      const existing = await tx.beamInvitation.findUnique({ where: { senderId_recipientId: { senderId: user.id, recipientId } } })
      if (existing) return { invitationId: existing.id, status: existing.status, created: false }
      const incoming = await tx.beamInvitation.findFirst({ where: { senderId: recipientId, recipientId: user.id, status: 'PENDING' }, select: { id: true } })
      if (incoming) throw Response.json({ error: 'incomingPending' }, { status: 409 })
      const limit = RATE_LIMITS.BEAM_INVITATION
      if (!await checkRateLimit(rateLimitKey('BEAM_INVITATION', user.id), limit.limit, limit.windowMs, tx)) throw Response.json({ error: 'rateLimited' }, { status: 429 })
      const invitation = await tx.beamInvitation.create({ data: { senderId: user.id, recipientId } })
      const recipient = await tx.user.findUniqueOrThrow({ where: { id: recipientId }, select: { language: true } })
      const notice = await NotificationTemplates.beamInvitation(invitation.id, resolveLocale(recipient.language))
      await tx.notification.create({ data: { userId: recipientId, ...notice } })
      return { invitationId: invitation.id, status: invitation.status, created: true }
    })
    return Response.json(result, { status: result.created ? 201 : 200, headers: invitationHeaders })
  } catch (error) { return safeApiError(error) }
}
