import { readJson, safeApiError } from '@/lib/api-input'
import { eventStatusSchema } from '@/lib/input-schemas'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { lockedEvent, deny, notify, reward } from '@/lib/galaxy-workflow'
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    const input = await readJson(request, eventStatusSchema)
    if (!input.ok) return input.response
    const event = await prisma.$transaction(async (tx) => {
      const access = await lockedEvent(tx, id, eventId, user)
      if (!access.isAdmin) deny('adminOnly')
      if (access.event.status !== 'PENDING') deny('alreadyReviewed', 409)
      if (input.data.status === 'APPROVED' && access.event.date <= new Date())
        deny('futureDate', 409)
      const updated = await tx.event.update({
        where: { id: eventId },
        data: {
          status: input.data.status,
          rejectionReason:
            input.data.status === 'REJECTED'
              ? input.data.rejectionReason
              : null,
          approvalRewarded:
            input.data.status === 'APPROVED' || access.event.approvalRewarded,
        },
      })
      if (updated.status === 'APPROVED' && !access.event.approvalRewarded)
        await reward(tx, updated.proposerId, 'EVENT_APPROVED')
      const recipients =
        updated.status === 'APPROVED'
          ? [
              ...new Set([
                updated.proposerId,
                ...(
                  await tx.communityMembership.findMany({
                    where: { communityId: id },
                    select: { userId: true },
                  })
                ).map((m) => m.userId),
              ]),
            ]
          : [updated.proposerId]
      await notify(
        tx,
        recipients,
        updated.status === 'APPROVED'
          ? 'galaxyEventApproved'
          : 'galaxyEventRejected',
        `/galaxy/${access.galaxy.slug}?event=${eventId}#events`,
        {
          title: updated.title,
          galaxy: access.galaxy.name,
          reason: input.data.rejectionReason ?? '',
        },
      )
      return { id: updated.id, status: updated.status }
    })
    return Response.json({ event })
  } catch (error) {
    return safeApiError(error)
  }
}
