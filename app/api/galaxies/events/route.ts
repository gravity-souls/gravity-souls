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
  const status = url.searchParams.get('status') ?? 'upcoming'
  const category = parseEventCategory(url.searchParams.get('category'))
  const search = (url.searchParams.get('search') ?? '').trim()
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)

  const where: Prisma.EventWhereInput = {
    galaxy: { memberships: { some: { userId } } },
  }

  if (status === 'passed') {
    where.status = EventStatus.PASSED
  } else if (status === 'going') {
    where.status = EventStatus.APPROVED
    where.date = { gte: new Date() }
    where.rsvps = { some: { userId } }
  } else {
    where.status = EventStatus.APPROVED
    where.date = { gte: new Date() }
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
      orderBy: status === 'passed' ? { date: 'desc' } : { date: 'asc' },
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