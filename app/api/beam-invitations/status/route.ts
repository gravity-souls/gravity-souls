import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { resourceId } from '@/lib/input-schemas'
import { canonicalPair, invitationHeaders, permittedInvitationPair } from '@/lib/beam-invitations'

const schema = z.object({ recipientId: resourceId }).strict()
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const viewer = await prisma.user.findFirst({ where: { id: user.id, deletedAt: null }, select: { id: true } })
    if (!viewer) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const { recipientId } = parsed.data
    if (!await permittedInvitationPair(user.id, recipientId)) return Response.json({ available: false, invitationId: null, status: null, conversationId: null, incomingPending: false }, { headers: invitationHeaders })
    const [sent, incoming, thread] = await Promise.all([
      prisma.beamInvitation.findUnique({ where: { senderId_recipientId: { senderId: user.id, recipientId } }, select: { id: true, status: true } }),
      prisma.beamInvitation.findFirst({ where: { senderId: recipientId, recipientId: user.id, status: 'PENDING' }, select: { id: true } }),
      prisma.conversationThread.findUnique({ where: { userAId_userBId: canonicalPair(user.id, recipientId) }, select: { id: true } }),
    ])
    return Response.json({ available: true, invitationId: sent?.id ?? null, status: sent?.status ?? null, conversationId: thread?.id ?? null, incomingPending: !!incoming }, { headers: invitationHeaders })
  } catch (error) { return safeApiError(error) }
}
