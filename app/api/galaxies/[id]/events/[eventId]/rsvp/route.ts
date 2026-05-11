import { EventStatus, NotificationType, Prisma } from '@prisma/client'
import { createNotification } from '@/lib/createNotification'
import { getCommunityAccess, jsonError } from '@/lib/galaxy-events'
import { grantXP } from '@/lib/grantXP'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id, eventId } = await params
  const userId = session.user.id
  const access = await getCommunityAccess(id, userId)

  if (!access) return jsonError('Galaxy not found', 404)
  if (!access.isMember && !access.isAdmin) return jsonError('Join this galaxy before RSVPing', 403)

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      proposer: { select: { id: true } },
      _count: { select: { rsvps: true } },
    },
  })

  if (!event || event.galaxyId !== id) return jsonError('Event not found', 404)
  if (event.status !== EventStatus.APPROVED) return jsonError('Only approved events accept RSVPs', 400)
  if (event.maxAttendees !== null && event._count.rsvps >= event.maxAttendees) {
    return jsonError('Event is full', 409)
  }

  let created = false
  try {
    await prisma.eventRSVP.create({ data: { eventId, userId } })
    created = true
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error
    }
  }

  if (created) {
    await grantXP(userId, 'EVENT_RSVP')
    await createNotification({
      userId: event.proposerId,
      type: NotificationType.GALAXY_NEW_EVENT,
      title: 'Someone is joining your event',
      body: `${session.user.name ?? 'A planet'} will attend "${event.title}"`,
      actionUrl: `/galaxies/${id}/events/${event.id}`,
    })
  }

  const rsvpCount = await prisma.eventRSVP.count({ where: { eventId } })
  return Response.json({ rsvpCount, userHasRSVPed: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id, eventId } = await params
  const userId = session.user.id
  const access = await getCommunityAccess(id, userId)

  if (!access) return jsonError('Galaxy not found', 404)
  if (!access.isMember && !access.isAdmin) return jsonError('Join this galaxy before changing RSVPs', 403)

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { galaxyId: true } })
  if (!event || event.galaxyId !== id) return jsonError('Event not found', 404)

  await prisma.eventRSVP.deleteMany({ where: { eventId, userId } })
  const rsvpCount = await prisma.eventRSVP.count({ where: { eventId } })

  return Response.json({ rsvpCount, userHasRSVPed: false })
}