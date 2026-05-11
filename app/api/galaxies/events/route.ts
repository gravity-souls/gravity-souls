import { EventStatus, type Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { EVENT_PAGE_SIZE, parseEventCategory, serializeEventSummary } from '@/lib/galaxy-events'
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

  const userId = session.user.id
  const url = new URL(request.url)
  const category = parseEventCategory(url.searchParams.get('category'))
  const search = (url.searchParams.get('search') ?? '').trim()
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)

  const where: Prisma.EventWhereInput = {
    status: EventStatus.APPROVED,
    date: { gte: new Date() },
    galaxy: { memberships: { some: { userId } } },
  }

  if (category) where.category = category
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { date: 'asc' },
      skip: (page - 1) * EVENT_PAGE_SIZE,
      take: EVENT_PAGE_SIZE,
      include: {
        galaxy: { select: { id: true, name: true, slug: true, accentColor: true } },
        proposer: { select: { id: true, name: true, planetTexture: true, userLevel: true } },
        rsvps: { where: { userId }, select: { userId: true } },
        _count: { select: { rsvps: true } },
      },
    }),
    prisma.event.count({ where }),
  ])

  return NextResponse.json({
    events: events.map((event) => ({ ...serializeEventSummary(event), galaxy: event.galaxy })),
    page,
    pageSize: EVENT_PAGE_SIZE,
    total,
  })
}