import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canContact } from '@/lib/visibility'
import { lockContactPair } from '@/lib/beam-invitations'
import { deletePrivateChatImage } from '@/lib/private-chat-storage'
export const imageHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
export const imageUnavailable = () => Response.json({ error: 'unavailable' }, { status: 404, headers: imageHeaders })
export async function imageConversation(userId: string, id: string, sending = false, db: Prisma.TransactionClient = prisma) {
  const thread = await db.conversationThread.findFirst({ where: { id, OR: [{ userAId: userId }, { userBId: userId }] } })
  if (!thread) throw imageUnavailable()
  const otherId = thread.userAId === userId ? thread.userBId : thread.userAId
  if (!await db.user.findFirst({ where: { id: userId, deletedAt: null } }) || !await canContact(userId, otherId, db) || (sending && !await db.user.findFirst({ where: { id: otherId, deletedAt: null } }))) throw imageUnavailable()
  return { thread, otherId }
}
export async function lockImageConversation(tx: Prisma.TransactionClient, userId: string, id: string, otherId: string) {
  await lockContactPair(tx, userId, otherId)
  await tx.$queryRaw`SELECT "id" FROM "conversation_thread" WHERE "id" = ${id} FOR UPDATE`
  return imageConversation(userId, id, true, tx)
}
export async function lockChatImage(tx: Prisma.TransactionClient, imageId: string) {
  await tx.$queryRaw`SELECT "id" FROM "chat_image" WHERE "id" = ${imageId} FOR UPDATE`
  return tx.chatImage.findUnique({ where: { id: imageId }, include: { message: { select: { id: true } } } })
}
export function imageMetadata(image: { id: string; width: number; height: number; bytes: number; conversationId: string }) {
  return { id: image.id, width: image.width, height: image.height, bytes: image.bytes, url: `/api/conversations/${encodeURIComponent(image.conversationId)}/images/${encodeURIComponent(image.id)}` }
}
// Deletion fences use the same row lock as binding. Failed storage deletion keeps its registry.
export async function cleanupChatImage(id: string, now = new Date()) {
  const image = await prisma.$transaction(async tx => {
    const row = await lockChatImage(tx, id)
    if (!row || row.message || (!row.deleteRequested && row.expiresAt > now) || (!row.ready && row.expiresAt > now)) return null
    await tx.chatImage.update({ where: { id }, data: { deleteRequested: true } })
    return row
  })
  if (!image) return false
  await deletePrivateChatImage(image.objectKey)
  await prisma.chatImage.deleteMany({ where: { id, deleteRequested: true, message: null } })
  return true
}
