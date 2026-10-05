import { discoveryQueryFields, eventDiscoveryWhere } from '@/lib/discovery-filters'
import { preferenceFit, selectWithExploration } from '@/lib/preference-matching'
import { EventStatus, type Prisma } from '@prisma/client'
import { z } from 'zod'
import { safeApiError } from '@/lib/api-input'
import { eventProposerWhere } from '@/lib/event-visibility'
import { canViewProfile, blockedUserIds } from '@/lib/visibility'
import { NextResponse } from 'next/server'
import { EVENT_PAGE_SIZE, serializeEventSummary } from '@/lib/galaxy-events'
import { requireUser } from '@/lib/session'
import { updatePassedEvents } from '@/lib/updatePassedEvents'
import { managedGalaxyWhere } from '@/lib/galaxy-workflow'
import { isOperatorEmail } from '@/lib/operator'
import { prisma } from '@/lib/prisma'
import { USER_PLANET_CONFIG_SELECT } from '@/lib/user-planet-config'

export async function GET(request: Request) {
  try {
    const session = await requireUser()
    const userId = session.user.id
    const query = z.object({
      ...discoveryQueryFields,
      status: z.enum(['upcoming', 'going', 'passed', 'mine', 'requests', 'interested', 'review']).default('upcoming'),
      page: z.coerce.number().int().min(1).max(10000).default(1),
      search: z.string().trim().max(80).default(''),
      category: z.enum(['MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER']).optional(),
    }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!query.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const { status, page, search, category, sort } = query.data
    const viewer = await prisma.user.findUnique({ where: { id: userId }, select: { deletedAt: true } })
    if (!viewer || viewer.deletedAt) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const hidden = [...await blockedUserIds(userId)]
    const pendingAttendance = { status: 'PENDING' as const, user: { deletedAt: null, id: { notIn: hidden } } }
    await updatePassedEvents()
    const where: Prisma.EventWhereInput = {
      ...await eventProposerWhere(userId),
      galaxy: { OR: [{ memberships: { some: { userId } } }, { creatorId: userId }] },
    }

    if (status === 'review') {
      where.galaxy = undefined
      where.date = { gt: new Date() }
      where.AND = [{ OR: [
        { status: 'PENDING', galaxy: managedGalaxyWhere(session.user) },
        { status: 'APPROVED', rsvps: { some: pendingAttendance }, OR: [
          { proposerId: userId }, { galaxy: managedGalaxyWhere(session.user) },
        ] },
      ] }]
    } else if (status === 'mine') {
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

    const extraFilters = eventDiscoveryWhere(query.data)
    if (extraFilters.length) where.AND = [...(Array.isArray(where.AND) ? where.AND : []), ...extraFilters]
    const recommended = sort === 'recommended' && status === 'upcoming'
    const preferences = await prisma.registrationBasics.findUnique({ where: { userId } })
    const [pool, totalCount] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: [{ date: status === 'passed' ? 'desc' : 'asc' }, { id: 'asc' }],
        skip: recommended ? 0 : (page - 1) * EVENT_PAGE_SIZE,
        take: recommended ? 200 : EVENT_PAGE_SIZE,
        include: {
          interests: { where: { userId }, select: { id: true } },
          galaxy: { select: { id: true, name: true, slug: true, accentColor: true, creatorId: true, memberships: { where: { userId }, select: { role: true } } } },
          proposer: { select: { id: true, name: true, userLevel: true, ...USER_PLANET_CONFIG_SELECT } },
          rsvps: { where: { userId }, select: { userId: true, status: true } },
          _count: { select: { rsvps: { where: { status: 'APPROVED' } } } },
        },
      }),
      prisma.event.count({ where }),
    ])

    const fits = new Map(pool.map(event => [event.id, preferenceFit(preferences, { location: event.location, languages: event.languages, interestTags: event.interestTags, connectionGoals: event.connectionGoals, gatheringPreferences: event.gatheringPreferences })]))
    const rankedBase = recommended ? [...pool].sort((a,b) => (fits.get(b.id)?.score ?? 50) - (fits.get(a.id)?.score ?? 50) || a.date.getTime()-b.date.getTime() || a.id.localeCompare(b.id)) : pool
    const selection = recommended ? selectWithExploration(rankedBase.map(event => ({ event, score: fits.get(event.id)?.score ?? 50 })), row => row.event.id, `${userId}:${new Date().toISOString().slice(0,10)}`, EVENT_PAGE_SIZE) : []
    const firstIds = new Set(selection.map(row => row.event.id))
    const explorationIds = new Set(selection.filter(row => row.exploration).map(row => row.event.id))
    const ranked = recommended ? [...selection.map(row => row.event), ...rankedBase.filter(event => !firstIds.has(event.id))] : rankedBase
    const events = recommended ? ranked.slice((page-1)*EVENT_PAGE_SIZE, page*EVENT_PAGE_SIZE) : ranked
    const total = recommended ? pool.length : totalCount
    // Only managers receive aggregate pending attendance, for this bounded page.
    const managedIds = events.filter(e => e.proposerId === userId || e.galaxy.creatorId === userId || e.galaxy.memberships.some(m => m.role === 'ADMIN') || isOperatorEmail(session.user.email)).map(e => e.id)
    const pendingCounts = managedIds.length ? await prisma.eventRSVP.groupBy({ by: ['eventId'], where: { eventId: { in: managedIds }, ...pendingAttendance }, _count: { _all: true } }) : []
    const pendingById = new Map(pendingCounts.map(row => [row.eventId, row._count._all]))
    return NextResponse.json({
      events: await Promise.all(events.map(async event => {
        const summary = serializeEventSummary(event)
        const profileVisible = await canViewProfile(userId, event.proposerId)
        const canReviewEvent = event.galaxy.creatorId === userId || event.galaxy.memberships.some(m => m.role === 'ADMIN') || isOperatorEmail(session.user.email)
        const canManage = canReviewEvent || event.proposerId === userId
        const { id, name, slug, accentColor } = event.galaxy
        return { ...summary, recommendation: fits.get(event.id) ? { ...fits.get(event.id), exploration: explorationIds.has(event.id) } : explorationIds.has(event.id) ? { exploration: true } : null, galaxy: { id, name, slug, accentColor }, canManage, canReviewEvent,
          ...(canManage ? { pendingAttendanceCount: pendingById.get(event.id) ?? 0 } : {}), userInterested: event.interests.length > 0,
          onlineUrl: summary.userHasRSVPed || event.proposerId === userId ? summary.onlineUrl : null,
          rejectionReason: event.proposerId === userId ? summary.rejectionReason : null,
          proposer: profileVisible ? summary.proposer : { ...summary.proposer, planetTexture: null, planetConfig: null },
        }
      })),
      page,
      recommendationPoolLimited: recommended && totalCount > 200,
      pageSize: EVENT_PAGE_SIZE,
      total,
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}
