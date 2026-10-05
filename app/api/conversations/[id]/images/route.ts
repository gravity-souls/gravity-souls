import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { resourceId } from '@/lib/input-schemas'
import { imageConversation, lockImageConversation, lockChatImage, imageHeaders, imageUnavailable } from '@/lib/chat-images'
import { hydrateMessageState, validateReplyTo } from '@/lib/chat-interactions'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { NotificationTemplates } from '@/lib/createNotification'
import { resolveLocale } from '@/lib/i18n-locales'
import { grantXP } from '@/lib/grantXP'
const schema = z.object({ imageId: z.uuid(), clientMessageId: resourceId, replyToId: resourceId.nullable().optional() }).strict()
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(), { id } = await params
    const input = await readJson(request, schema); if (!input.ok) return input.response
    const payload = input.data, { otherId } = await imageConversation(user.id, id, true)
    const result = await prisma.$transaction(async tx => {
      await lockImageConversation(tx, user.id, id, otherId)
      const existing = await tx.directMessage.findUnique({ where: { conversationId_clientMessageId: { conversationId: id, clientMessageId: payload.clientMessageId } } })
      if (existing) {
        if (existing.senderId !== user.id || existing.type !== 'image' || existing.imageId !== payload.imageId || existing.replyToId !== (payload.replyToId ?? null)) throw Response.json({ error: 'keyConflict' }, { status: 409 })
        return { message: existing, created: false, first: false }
      }
      await validateReplyTo(tx,id,payload.replyToId,user)
      const image = await lockChatImage(tx, payload.imageId)
      if (!image || image.ownerId !== user.id || image.conversationId !== id) throw imageUnavailable()
      if (!image.ready || image.deleteRequested || image.expiresAt <= new Date()) throw Response.json({ error: 'uploadExpired' }, { status: 410 })
      if (image.message) throw Response.json({ error: 'keyConflict' }, { status: 409 })
      const limit = RATE_LIMITS.MESSAGE_SEND
      if (!await checkRateLimit(rateLimitKey('MESSAGE_SEND', user.id), limit.limit, limit.windowMs, tx)) throw Response.json({ error: 'rateLimited' }, { status: 429 })
      const message = await tx.directMessage.create({ data: { conversationId: id, senderId: user.id, type: 'image', content: '', imageId: image.id, clientMessageId: payload.clientMessageId, replyToId: payload.replyToId } })
      await tx.conversationThread.update({ where: { id }, data: { lastMessageAt: message.createdAt } })
      const recipient = await tx.user.findUniqueOrThrow({ where: { id: otherId }, select: { language: true } })
      const notice = await NotificationTemplates.newMessage(user.name, `/messages/${id}`, resolveLocale(recipient.language))
      await tx.notification.create({ data: { userId: otherId, ...notice } })
      return { message, created: true, first: await tx.directMessage.count({ where: { conversationId: id } }) === 1 }
    })
    if (result.first) { try { await grantXP(user.id, 'RESONANCE_SENT') } catch { console.error('Could not grant image message XP') } }
    const [message] = await hydrateMessageState([result.message], user)
    return Response.json(message, { status: result.created ? 201 : 200, headers: imageHeaders })
  } catch (error) { return safeApiError(error) }
}
