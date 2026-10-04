import { assertEventProposerVisible } from '@/lib/event-visibility'
import { canViewProfile, blockedUserIds } from '@/lib/visibility'
import { readJson, safeApiError } from '@/lib/api-input'
import { eventSchema } from '@/lib/input-schemas'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { serializeEventDetail } from '@/lib/galaxy-events'
import {
  eventInclude,
  galaxyAccess,
  lockedEvent,
  deny,
  notify,
  adminIds,
} from '@/lib/galaxy-workflow'
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    const access = await galaxyAccess(prisma, id, user)
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: eventInclude,
    })
    if (!event || event.galaxyId !== id) deny('notFound', 404)
    const isProposer = event.proposerId === user.id
    if (
      !access.isAdmin &&
      !isProposer &&
      (!access.membership ||
        !['APPROVED', 'PASSED', 'CANCELLED'].includes(event.status))
    )
      deny('notFound', 404)
    await assertEventProposerVisible(user.id, event.proposer)
    const interested = await prisma.eventInterest.findUnique({ where: { userId_eventId: { userId: user.id, eventId } } })
    const hidden = await blockedUserIds(user.id)
    const safeEvent = { ...event, rsvps: event.rsvps.filter(r => !hidden.has(r.userId)) }
    const detail = serializeEventDetail(safeEvent)
    detail.proposer = await canViewProfile(user.id, event.proposerId) ? detail.proposer : { ...detail.proposer, planetTexture: null, planetConfig: null }
    detail.rsvps = await Promise.all(detail.rsvps.map(async r => await canViewProfile(user.id, r.id) ? r : { ...r, planetTexture: null, planetConfig: null }))
    const attendance = await prisma.eventRSVP.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    })
    return Response.json({
      event: {
        ...detail,
        userHasRSVPed: attendance?.status === 'APPROVED',
        userInterested: !!interested,
        onlineUrl: attendance?.status === 'APPROVED' || access.isAdmin || isProposer ? event.onlineUrl : null,
        userAttendance: attendance?.status ?? null,
        canManage: access.isAdmin || isProposer,
      },
      isAdmin: access.isAdmin,
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
    const input = await readJson(request, eventSchema)
    if (!input.ok) return input.response
    await prisma.$transaction(async (tx) => {
      const access = await lockedEvent(tx, id, eventId, user)
      if (!access.isAdmin && access.event.proposerId !== user.id)
        deny('organizerOnly')
      if (
        ['CANCELLED', 'PASSED'].includes(access.event.status) ||
        access.event.date <= new Date()
      )
        deny('eventClosed', 409)
      const date = new Date(input.data.date)
      if (Number.isNaN(date.getTime()) || date <= new Date())
        deny('futureDate', 400)
      if (
        input.data.maxAttendees != null &&
        input.data.maxAttendees < access.event._count.rsvps
      )
        deny('capacityTooSmall', 409)
      const reviewers = await adminIds(tx, id)
      if (!reviewers.length) deny('noReviewer', 409)
      await tx.event.update({
        where: { id: eventId },
        data: { ...input.data, date, status: 'PENDING', rejectionReason: null },
      })
      await notify(
        tx,
        [
          ...new Set([
            ...reviewers,
            ...access.event.rsvps.map((r) => r.userId),
          ]),
        ],
        'galaxyEventUpdated',
        `/galaxy/${access.galaxy.slug}?event=${eventId}#events`,
        { title: input.data.title, galaxy: access.galaxy.name },
      )
    })
    return Response.json({ ok: true })
  } catch (error) {
    return safeApiError(error)
  }
}
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    await prisma.$transaction(async (tx) => {
      const access = await lockedEvent(tx, id, eventId, user)
      if (!access.isAdmin && access.event.proposerId !== user.id)
        deny('organizerOnly')
      if (access.event.status === 'CANCELLED') return
      if (access.event.date <= new Date() || access.event.status === 'PASSED')
        deny('eventClosed', 409)
      const attendees = await tx.eventRSVP.findMany({
        where: { eventId, status: { in: ['PENDING', 'APPROVED'] } },
        select: { userId: true },
      })
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'CANCELLED' },
      })
      await tx.eventRSVP.updateMany({
        where: { eventId, status: { in: ['PENDING', 'APPROVED'] } },
        data: { status: 'CANCELLED' },
      })
      await notify(
        tx,
        [...attendees.map((r) => r.userId), access.event.proposerId],
        'galaxyEventCancelled',
        `/galaxy/${access.galaxy.slug}?event=${eventId}#events`,
        { title: access.event.title, galaxy: access.galaxy.name },
      )
    })
    return Response.json({ ok: true })
  } catch (error) {
    return safeApiError(error)
  }
}
