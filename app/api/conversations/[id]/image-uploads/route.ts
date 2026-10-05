import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { normalizeChatImage } from '@/lib/chat-image-processing'
import { requirePrivateChatStorage, writePrivateChatImage } from '@/lib/private-chat-storage'
import { imageConversation, lockImageConversation, lockChatImage, imageMetadata, imageHeaders } from '@/lib/chat-images'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(), { id } = await params
    const { otherId } = await imageConversation(user.id, id, true)
    requirePrivateChatStorage()
    const key = z.uuid().safeParse(request.headers.get('x-upload-id'))
    if (!key.success) return Response.json({ error: 'invalidUploadId' }, { status: 400 })
    const validationLimit = RATE_LIMITS.IMAGE_UPLOAD_VALIDATE
    if (!await checkRateLimit(rateLimitKey('IMAGE_UPLOAD_VALIDATE', user.id), validationLimit.limit, validationLimit.windowMs)) return Response.json({ error: 'rateLimited' }, { status: 429 })
    const imageId = key.data.toLowerCase(), normalized = await normalizeChatImage(request)
    const reservation = await prisma.$transaction(async tx => {
      await lockImageConversation(tx, user.id, id, otherId)
      const existing = await lockChatImage(tx, imageId)
      if (existing) {
        if (existing.ownerId !== user.id || existing.conversationId !== id || existing.rawDigest !== normalized.rawDigest) throw Response.json({ error: 'keyConflict' }, { status: 409 })
        if (existing.deleteRequested || existing.message || existing.expiresAt <= new Date()) return { expired: true as const }
        if (existing.ready) return { ready: existing }
        if (Date.now() - existing.createdAt.getTime() < 120000) throw Response.json({ error: 'uploadBusy' }, { status: 409 })
        await tx.chatImage.update({ where: { id: imageId }, data: { deleteRequested: true } })
        return { expired: true as const }
      }
      if (!await checkRateLimit(rateLimitKey('IMAGE_UPLOAD', user.id), RATE_LIMITS.IMAGE_UPLOAD.limit, RATE_LIMITS.IMAGE_UPLOAD.windowMs, tx)) throw Response.json({ error: 'rateLimited' }, { status: 429 })
      const row = await tx.chatImage.create({ data: { id: imageId, ownerId: user.id, conversationId: id, objectKey: `chat-images/${imageId}.webp`, rawDigest: normalized.rawDigest, width: normalized.width, height: normalized.height, bytes: normalized.bytes, expiresAt: new Date(Date.now() + 3600000) } })
      return { write: row }
    })
    if ('expired' in reservation) return Response.json({ error: 'uploadExpired' }, { status: 410 })
    if ('ready' in reservation && reservation.ready) return Response.json(imageMetadata(reservation.ready), { headers: imageHeaders })
    if (!('write' in reservation) || !reservation.write) throw new Error('reservation')
    try { await writePrivateChatImage(reservation.write.objectKey, normalized.data) }
    catch {
      await prisma.chatImage.updateMany({ where: { id: imageId, message: null }, data: { deleteRequested: true } })
      return Response.json({ error: 'storageFailed' }, { status: 503 })
    }
    const ready = await prisma.$transaction(async tx => {
      const row = await lockChatImage(tx, imageId)
      if (!row || row.deleteRequested || row.expiresAt <= new Date()) return null
      return tx.chatImage.update({ where: { id: imageId }, data: { ready: true } })
    })
    if (!ready) return Response.json({ error: 'uploadExpired' }, { status: 410 })
    return Response.json(imageMetadata(ready), { status: 201, headers: imageHeaders })
  } catch (error) { return safeApiError(error) }
}
