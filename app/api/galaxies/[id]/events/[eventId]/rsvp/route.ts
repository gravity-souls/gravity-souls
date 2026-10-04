import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import {
  lockedEvent,
  deny,
  activeEvent,
  capacity,
  notify,
  reward,
} from '@/lib/galaxy-workflow'
async function change(
  params: Promise<{ id: string; eventId: string }>,
  cancel: boolean,
) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    const result = await prisma.$transaction(async (tx) => {
      const access = await lockedEvent(tx, id, eventId, user)
      if (!access.membership && !access.isAdmin) deny('joinFirst')
      const previous = await tx.eventRSVP.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
      })
      if (cancel) {
        if (previous)
          await tx.eventRSVP.update({
            where: { id: previous.id },
            data: { status: 'CANCELLED' },
          })
      } else {
        activeEvent(access.event)
        if (previous?.status !== 'APPROVED' && previous?.status !== 'PENDING') {
          const pending = access.event.requiresApproval
          if (!pending) await capacity(tx, eventId, access.event.maxAttendees)
          await tx.eventRSVP.upsert({
            where: { eventId_userId: { eventId, userId: user.id } },
            create: {
              eventId,
              userId: user.id,
              status: pending ? 'PENDING' : 'APPROVED',
              rewarded: !pending,
            },
            update: {
              status: pending ? 'PENDING' : 'APPROVED',
              rewarded: !pending || previous?.rewarded,
            },
          })
          if (!pending && !previous?.rewarded)
            await reward(tx, user.id, 'EVENT_RSVP')
          await notify(
            tx,
            [access.event.proposerId],
            pending ? 'galaxyAttendanceRequested' : 'galaxyAttendanceJoined',
            `/galaxy/${access.galaxy.slug}?event=${eventId}#events`,
            { title: access.event.title },
          )
        }
      }
      const attendance = await tx.eventRSVP.findUnique({
        where: { eventId_userId: { eventId, userId: user.id } },
      })
      return {
        rsvpCount: await tx.eventRSVP.count({
          where: { eventId, status: 'APPROVED' },
        }),
        userHasRSVPed: attendance?.status === 'APPROVED',
        userAttendance: attendance?.status ?? null,
      }
    })
    return Response.json(result)
  } catch (error) {
    return safeApiError(error)
  }
}
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  return change(params, false)
}
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  return change(params, true)
}
