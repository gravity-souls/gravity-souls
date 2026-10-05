import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { readPrivateChatImage } from '@/lib/private-chat-storage'
import { imageConversation, imageHeaders, imageUnavailable, lockChatImage, cleanupChatImage } from '@/lib/chat-images'
export const runtime = 'nodejs'
type Context = { params: Promise<{ id: string; imageId: string }> }
export async function HEAD(_request: Request, { params }: Context) {
  try {
    const { user } = await requireUser(), { id, imageId } = await params
    await imageConversation(user.id, id)
    const image = await prisma.chatImage.findUnique({ where: { id: imageId }, include: { message: { select: { id: true } } } })
    if (!image || image.conversationId !== id || !image.ready || image.deleteRequested || (!image.message && (image.ownerId !== user.id || image.expiresAt <= new Date()))) throw imageUnavailable()
    return new Response(null, { headers: { ...imageHeaders, 'Content-Type': 'image/webp' } })
  } catch (error) { const response = safeApiError(error); return new Response(null, { status: response.status, headers: imageHeaders }) }
}
export async function GET(_request: Request, { params }: Context) {
  try {
    const { user } = await requireUser(), { id, imageId } = await params
    await imageConversation(user.id, id)
    const image = await prisma.chatImage.findUnique({ where: { id: imageId }, include: { message: { select: { id: true } } } })
    if (!image || image.conversationId !== id || !image.ready || image.deleteRequested || (!image.message && (image.ownerId !== user.id || image.expiresAt <= new Date()))) throw imageUnavailable()
    const bytes = await readPrivateChatImage(image.objectKey)
    if (!bytes) throw imageUnavailable()
    // Recheck permission after the external read, before releasing bytes.
    await imageConversation(user.id, id)
    if (!await prisma.chatImage.findFirst({ where: { id: imageId, deleteRequested: false } })) throw imageUnavailable()
    return new Response(bytes as BodyInit, { headers: { ...imageHeaders, 'Content-Type': 'image/webp', 'Content-Disposition': 'inline; filename="image.webp"' } })
  } catch (error) { const response = safeApiError(error); response.headers.set('Cache-Control', 'private, no-store'); return response }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { user } = await requireUser(), { id, imageId } = await params
    const thread = await prisma.conversationThread.findFirst({ where: { id, OR: [{ userAId: user.id }, { userBId: user.id }] } })
    if (!thread) throw imageUnavailable()
    await prisma.$transaction(async tx => {
      const image = await lockChatImage(tx, imageId)
      if (!image || image.ownerId !== user.id || image.conversationId !== id) throw imageUnavailable()
      if (image.message) throw Response.json({ error: 'alreadySent' }, { status: 409 })
      await tx.chatImage.update({ where: { id: imageId }, data: { deleteRequested: true } })
    })
    // Discard is already recorded; a failed physical deletion is retried by the sweep.
    try { await cleanupChatImage(imageId) } catch { /* retain registry */ }
    return Response.json({ discarded: true }, { headers: imageHeaders })
  } catch (error) { return safeApiError(error) }
}
