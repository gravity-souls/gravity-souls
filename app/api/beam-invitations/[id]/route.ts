import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { canonicalPair, invitationHeaders, lockContactPair, permittedInvitationPair } from '@/lib/beam-invitations'
import { NotificationTemplates } from '@/lib/createNotification'
import { resolveLocale } from '@/lib/i18n-locales'

const actionSchema = z.object({ action: z.enum(['accept', 'reject', 'cancel']) }).strict()
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const input = await readJson(request, actionSchema)
    if (!input.ok) return input.response
    const { action } = input.data
    const owned = await prisma.beamInvitation.findFirst({ where: { id, ...(action === 'cancel' ? { senderId: user.id } : { recipientId: user.id }) }, select: { senderId: true, recipientId: true } })
    if (!owned) return Response.json({ error: 'unavailable' }, { status: 404 })
    const result = await prisma.$transaction(async tx => {
      await lockContactPair(tx, owned.senderId, owned.recipientId)
      const row = await tx.beamInvitation.findUnique({ where: { id } })
      if (!row || action !== 'cancel' && !await permittedInvitationPair(row.senderId, row.recipientId, tx)) throw Response.json({ error: 'unavailable' }, { status: 404 })
      const status = action === 'accept' ? 'ACCEPTED' : action === 'reject' ? 'REJECTED' : 'CANCELLED'
      if (row.status !== 'PENDING' && row.status !== status) throw Response.json({ error: 'resolved' }, { status: 409 })
      const changed = row.status === 'PENDING'
      if (changed) {
        const update = await tx.beamInvitation.updateMany({ where: { id, status: 'PENDING' }, data: { status, resolvedAt: new Date() } })
        if (!update.count) throw Response.json({ error: 'resolved' }, { status: 409 })
      }
      if (changed) await tx.notification.updateMany({ where: { userId: row.recipientId, type: 'BEAM_INVITATION', actionUrl: `/messages?invitations=received&invite=${id}`, read: false }, data: { read: true } })
      let conversationId: string | null = null
      if (status === 'ACCEPTED') {
        const pair = canonicalPair(row.senderId, row.recipientId)
        const thread = await tx.conversationThread.upsert({ where: { userAId_userBId: pair }, create: pair, update: {} })
        conversationId = thread.id
        if (changed) {
          const sender = await tx.user.findUniqueOrThrow({ where: { id: row.senderId }, select: { language: true } })
          const notice = await NotificationTemplates.beamInvitationAccepted(thread.id, resolveLocale(sender.language))
          await tx.notification.create({ data: { userId: row.senderId, ...notice } })
        }
      }
      return { status, conversationId }
    })
    return Response.json(result, { headers: invitationHeaders })
  } catch (error) { return safeApiError(error) }
}
