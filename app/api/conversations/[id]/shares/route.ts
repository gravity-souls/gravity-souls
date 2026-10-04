import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { resourceId } from '@/lib/input-schemas'
import { SHARE_KINDS } from '@/lib/chat-share-types'
import { hydrateSharedMessages, resolveSharedCard } from '@/lib/chat-shares'
import { lockContactPair, invitationHeaders } from '@/lib/beam-invitations'
import { canContact } from '@/lib/visibility'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { NotificationTemplates } from '@/lib/createNotification'
import { resolveLocale } from '@/lib/i18n-locales'
import { grantXP } from '@/lib/grantXP'
const schema = z.object({ kind: z.enum(SHARE_KINDS), targetId: resourceId, clientMessageId: resourceId }).strict()
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(), { id } = await params
    const input = await readJson(request, schema)
    if (!input.ok) return input.response
    const payload = input.data
    const conversation = await prisma.conversationThread.findFirst({ where: { id, OR: [{ userAId: user.id }, { userBId: user.id }] } })
    if (!conversation) return Response.json({ error: 'unavailable' }, { status: 404 })
    const recipientId = conversation.userAId === user.id ? conversation.userBId : conversation.userAId
    const result = await prisma.$transaction(async tx => {
      await lockContactPair(tx, user.id, recipientId)
      await tx.$queryRaw`SELECT "id" FROM "conversation_thread" WHERE "id" = ${id} FOR UPDATE`
      const people = await tx.user.findMany({ where: { id: { in: [user.id, recipientId] }, deletedAt: null }, select: { id: true, name: true, email: true, language: true } })
      const sender = people.find(person => person.id === user.id), recipient = people.find(person => person.id === recipientId)
      if (!sender || !recipient || !await canContact(sender.id, recipient.id, tx) || !await tx.conversationThread.findUnique({ where: { id } })) throw Response.json({ error: 'unavailable' }, { status: 404 })
      const existing = await tx.directMessage.findUnique({ where: { conversationId_clientMessageId: { conversationId: id, clientMessageId: payload.clientMessageId } } })
      if (existing) {
        if (existing.senderId !== user.id || existing.type !== 'share' || existing.shareKind !== payload.kind || existing.shareTargetId !== payload.targetId) throw Response.json({ error: 'keyConflict' }, { status: 409 })
        return { message: existing, created: false, first: false }
      }
      if (!(await resolveSharedCard(payload.kind, payload.targetId, sender, tx)).available || !(await resolveSharedCard(payload.kind, payload.targetId, recipient, tx)).available) throw Response.json({ error: 'unavailable' }, { status: 404 })
      const limit = RATE_LIMITS.MESSAGE_SEND
      if (!await checkRateLimit(rateLimitKey('MESSAGE_SEND', user.id), limit.limit, limit.windowMs, tx)) throw Response.json({ error: 'rateLimited' }, { status: 429 })
      const message = await tx.directMessage.create({ data: { conversationId: id, senderId: user.id, content: '', type: 'share', shareKind: payload.kind, shareTargetId: payload.targetId, clientMessageId: payload.clientMessageId } })
      await tx.conversationThread.update({ where: { id }, data: { lastMessageAt: message.createdAt } })
      const notice = await NotificationTemplates.newMessage(sender.name, `/messages/${id}`, resolveLocale(recipient.language))
      await tx.notification.create({ data: { userId: recipient.id, ...notice } })
      return { message, created: true, first: await tx.directMessage.count({ where: { conversationId: id } }) === 1 }
    })
    if (result.first) { try { await grantXP(user.id, 'RESONANCE_SENT') } catch { console.error('Could not grant share message XP') } }
    const [message] = await hydrateSharedMessages([result.message], user)
    return Response.json(message, { status: result.created ? 201 : 200, headers: invitationHeaders })
  } catch (error) { return safeApiError(error) }
}
