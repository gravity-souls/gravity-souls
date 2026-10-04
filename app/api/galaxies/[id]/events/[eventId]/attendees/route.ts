import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { readJson, safeApiError } from '@/lib/api-input'
import { attendanceReviewSchema } from '@/lib/input-schemas'
import {
  galaxyAccess,
  lockedEvent,
  deny,
  activeEvent,
  capacity,
  reward,
  notify,
} from '@/lib/galaxy-workflow'
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    const access = await galaxyAccess(prisma, id, user)
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event || event.galaxyId !== id) deny('notFound', 404)
    if (!access.isAdmin && event.proposerId !== user.id) deny('organizerOnly')
    const attendees = await prisma.eventRSVP.findMany({
      where: { eventId, status: { in: ['PENDING', 'APPROVED'] } },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    })
    return Response.json({
      attendees: attendees.map((r) => ({
        userId: r.userId,
        name: r.user.name,
        status: r.status,
      })),
    })
  } catch (error) {
    return safeApiError(error)
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    const input = await readJson(request, attendanceReviewSchema)
    if (!input.ok) return input.response
    await prisma.$transaction(async (tx) => {
      const access = await lockedEvent(tx, id, eventId, user)
      if (!access.isAdmin && access.event.proposerId !== user.id)
        deny('organizerOnly')
      activeEvent(access.event)
      const r = await tx.eventRSVP.findUnique({
        where: { eventId_userId: { eventId, userId: input.data.userId } },
      })
      if (
        !r ||
        !['PENDING', 'APPROVED'].includes(r.status) ||
        (r.status === 'APPROVED' && input.data.status === 'APPROVED')
      )
        deny('alreadyReviewed', 409)
      const member = await tx.communityMembership.findUnique({
        where: { userId_communityId: { userId: r.userId, communityId: id } },
      })
      if (!member && access.galaxy.creatorId !== r.userId)
        deny('joinFirst', 409)
      if (input.data.status === 'APPROVED')
        await capacity(tx, eventId, access.event.maxAttendees)
      await tx.eventRSVP.update({
        where: { id: r.id },
        data: {
          status: input.data.status,
          rewarded: input.data.status === 'APPROVED' || r.rewarded,
        },
      })
      if (input.data.status === 'APPROVED' && !r.rewarded)
        await reward(tx, r.userId, 'EVENT_RSVP')
      await notify(
        tx,
        [r.userId],
        input.data.status === 'APPROVED'
          ? 'galaxyAttendanceApproved'
          : 'galaxyAttendanceRejected',
        `/galaxy/${access.galaxy.slug}?event=${eventId}#events`,
        { title: access.event.title },
      )
    })
    return Response.json({ ok: true })
  } catch (error) {
    return safeApiError(error)
  }
}
