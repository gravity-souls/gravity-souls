import { EventStatus, NotificationType } from '@prisma/client'
import { NotificationTemplates, createNotification } from '@/lib/createNotification'
import { getCommunityAccess, jsonError } from '@/lib/galaxy-events'
import { grantXP } from '@/lib/grantXP'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
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
  if (!access.isAdmin) return jsonError('Only galaxy admins can review event proposals', 403)

  const body = await request.json()
  const status = body.status === 'APPROVED' ? EventStatus.APPROVED : body.status === 'REJECTED' ? EventStatus.REJECTED : null
  const rejectionReason = typeof body.rejectionReason === 'string' && body.rejectionReason.trim()
    ? body.rejectionReason.trim()
    : null

  if (!status) return jsonError('Status must be APPROVED or REJECTED', 400)

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      proposer: { select: { id: true, name: true } },
      galaxy: {
        select: {
          id: true,
          name: true,
          memberships: { select: { userId: true } },
        },
      },
    },
  })

  if (!event || event.galaxyId !== id) return jsonError('Event not found', 404)

  const updatedEvent = await prisma.event.update({
    where: { id: event.id },
    data: { status },
    select: { id: true, status: true, title: true },
  })

  if (status === EventStatus.APPROVED) {
    await createNotification({
      userId: event.proposerId,
      type: NotificationType.GALAXY_NEW_EVENT,
      title: 'Your event was approved ✦',
      body: `"${event.title}" is now live in ${event.galaxy.name}`,
      actionUrl: `/galaxies/${id}/events/${event.id}`,
    })

    const template = NotificationTemplates.galaxyNewEvent(event.galaxy.name, event.title, `/galaxies/${id}/events/${event.id}`)
    await prisma.notification.createMany({
      data: event.galaxy.memberships.map((member) => ({
        userId: member.userId,
        ...template,
      })),
    })

    const xpEvent = await grantXP(event.proposerId, 'EVENT_APPROVED')
    return Response.json({ event: updatedEvent, xpEvent, leveledUp: xpEvent.leveledUp })
  }

  await createNotification({
    userId: event.proposerId,
    type: NotificationType.GALAXY_NEW_EVENT,
    title: 'Event proposal update',
    body: rejectionReason ?? 'Your event proposal was not approved',
    actionUrl: `/galaxies/${id}/events`,
  })

  return Response.json({ event: updatedEvent })
}