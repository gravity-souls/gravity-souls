import { EventStatus, type Prisma } from '@prisma/client'
import { z } from 'zod'
import { safeApiError } from '@/lib/api-input'
import { eventProposerWhere } from '@/lib/event-visibility'
import { canViewProfile } from '@/lib/visibility'
import { NextResponse } from 'next/server'
import { EVENT_PAGE_SIZE, serializeEventSummary } from '@/lib/galaxy-events'
import { requireUser } from '@/lib/session'
import { updatePassedEvents } from '@/lib/updatePassedEvents'
import { prisma } from '@/lib/prisma'
import { USER_PLANET_CONFIG_SELECT } from '@/lib/user-planet-config'

export async function GET(request: Request) {
  try {
    const session = await requireUser()
    const userId = session.user.id
    const query = z.object({
      status: z.enum(['upcoming', 'going', 'passed', 'mine', 'requests', 'interested']).default('upcoming'),
      page: z.coerce.number().int().min(1).max(10000).default(1),
      search: z.string().trim().max(80).default(''),
      category: z.enum(['MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER']).optional(),
    }).safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!query.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const { status, page, search, category } = query.data
    await updatePassedEvents()
    const where: Prisma.EventWhereInput = {
      ...await eventProposerWhere(userId),
      galaxy: { OR: [{ memberships: { some: { userId } } }, { creatorId: userId }] },
    }

    if (status === 'mine') {
      where.galaxy = undefined
      where.proposerId = userId
    } else if (status === 'interested') {
      where.status = { in: ['APPROVED', 'PASSED', 'CANCELLED'] }
      where.interests = { some: { userId } }
    } else if (status === 'requests') {
      where.status = EventStatus.APPROVED
      where.date = { gt: new Date() }
      where.rsvps = { some: { userId, status: 'PENDING' } }
    } else if (status === 'passed') {
      where.status = { in: [EventStatus.PASSED, EventStatus.CANCELLED] }
      where.AND = [{ OR: [{ proposerId: userId }, { rsvps: { some: { userId, status: { in: ['APPROVED', 'CANCELLED'] } } } }] }]
    } else if (status === 'going') {
      where.status = EventStatus.APPROVED
      where.date = { gte: new Date() }
      where.rsvps = { some: { userId, status: 'APPROVED' } }
    } else {
      where.status = EventStatus.APPROVED
      where.date = { gte: new Date() }
    }

    if (category) where.category = category
    if (search) {
      const searchFilter = { OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ] } satisfies Prisma.EventWhereInput
      where.AND = [...(Array.isArray(where.AND) ? where.AND : []), searchFilter]
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: [{ date: status === 'passed' ? 'desc' : 'asc' }, { id: 'asc' }],
        skip: (page - 1) * EVENT_PAGE_SIZE,
        take: EVENT_PAGE_SIZE,
        include: {
          interests: { where: { userId }, select: { id: true } },
          galaxy: { select: { id: true, name: true, slug: true, accentColor: true } },
          proposer: { select: { id: true, name: true, userLevel: true, ...USER_PLANET_CONFIG_SELECT } },
          rsvps: { where: { userId }, select: { userId: true, status: true } },
          _count: { select: { rsvps: { where: { status: 'APPROVED' } } } },
        },
      }),
      prisma.event.count({ where }),
    ])

    return NextResponse.json({
      events: await Promise.all(events.map(async event => {
        const summary = serializeEventSummary(event)
        const profileVisible = await canViewProfile(userId, event.proposerId)
        return { ...summary, galaxy: event.galaxy, userInterested: event.interests.length > 0,
          onlineUrl: summary.userHasRSVPed || event.proposerId === userId ? summary.onlineUrl : null,
          rejectionReason: event.proposerId === userId ? summary.rejectionReason : null,
          proposer: profileVisible ? summary.proposer : { ...summary.proposer, planetTexture: null, planetConfig: null },
        }
      })),
      page,
      pageSize: EVENT_PAGE_SIZE,
      total,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}
