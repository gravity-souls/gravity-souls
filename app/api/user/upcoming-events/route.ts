import { EventStatus } from '@prisma/client'
import { serializeEventSummary } from '@/lib/galaxy-events'
import { requireUser } from '@/lib/session'
import { updatePassedEvents } from '@/lib/updatePassedEvents'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  await updatePassedEvents()

  const url = new URL(request.url)
  const limit = Math.min(6, Math.max(1, Number(url.searchParams.get('limit') ?? '1') || 1))
  const userId = session.user.id
  const baseInclude = {
    galaxy: { select: { id: true, name: true, slug: true, accentColor: true } },
    proposer: { select: { id: true, name: true, planetTexture: true, userLevel: true } },
    rsvps: { where: { userId }, select: { userId: true } },
    _count: { select: { rsvps: true } },
  } as const

  const rsvpedEvent = await prisma.event.findFirst({
    where: {
      status: EventStatus.APPROVED,
      date: { gte: new Date() },
      rsvps: { some: { userId } },
    },
    orderBy: { date: 'asc' },
    include: baseInclude,
  })

  const event = rsvpedEvent ?? await prisma.event.findFirst({
    where: {
      status: EventStatus.APPROVED,
      date: { gte: new Date() },
      galaxy: { memberships: { some: { userId } } },
    },
    orderBy: { date: 'asc' },
    include: baseInclude,
  })

  const events = await prisma.event.findMany({
    where: {
      status: EventStatus.APPROVED,
      date: { gte: new Date() },
      OR: [
        { rsvps: { some: { userId } } },
        { galaxy: { memberships: { some: { userId } } } },
      ],
    },
    orderBy: { date: 'asc' },
    take: limit,
    include: baseInclude,
  })

  if (!event) return Response.json({ event: null })

  return Response.json({
    event: {
      ...serializeEventSummary(event),
      galaxy: event.galaxy,
    },
    events: events.map((item) => ({
      ...serializeEventSummary(item),
      galaxy: item.galaxy,
    })),
  })
}