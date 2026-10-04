import { readJson, safeApiError } from '@/lib/api-input'
import { eventSchema } from '@/lib/input-schemas'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { updatePassedEvents } from '@/lib/updatePassedEvents'
import { serializeEventSummary, EVENT_PAGE_SIZE } from '@/lib/galaxy-events'
import {
  galaxyAccess,
  deny,
  adminIds,
  notify,
  reward,
} from '@/lib/galaxy-workflow'
import { USER_PLANET_CONFIG_SELECT } from '@/lib/user-planet-config'
import type { Prisma } from '@prisma/client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const access = await galaxyAccess(prisma, id, user)
    if (!access.membership && !access.isAdmin) deny('joinFirst')
    await updatePassedEvents()
    const url = new URL(request.url),
      status = url.searchParams.get('status') ?? 'upcoming'
    const page = Math.max(
      1,
      Math.floor(Number(url.searchParams.get('page')) || 1),
    )
    const where: Prisma.EventWhereInput = { galaxyId: id }
    if (status === 'pending') {
      if (!access.isAdmin) deny('adminOnly')
      where.status = 'PENDING'
    } else if (status === 'mine') where.proposerId = user.id
    else if (status === 'passed') where.status = 'PASSED'
    else {
      where.status = 'APPROVED'
      where.date = { gt: new Date() }
    }
    const category = url.searchParams.get('category')
    if (
      category &&
      [
        'MEETUP',
        'ONLINE',
        'WORKSHOP',
        'STARGAZING',
        'DISCUSSION',
        'OTHER',
      ].includes(category)
    )
      where.category = category as Prisma.EnumEventCategoryFilter['equals']
    const search = (url.searchParams.get('search') ?? '').trim()
    if (search)
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { date: status === 'passed' ? 'desc' : 'asc' },
        skip: (page - 1) * EVENT_PAGE_SIZE,
        take: EVENT_PAGE_SIZE,
        include: {
          proposer: {
            select: {
              id: true,
              name: true,
              userLevel: true,
              ...USER_PLANET_CONFIG_SELECT,
            },
          },
          rsvps: {
            where: { userId: user.id },
            select: { userId: true, status: true },
          },
          _count: { select: { rsvps: { where: { status: 'APPROVED' } } } },
        },
      }),
      prisma.event.count({ where }),
    ])
    return Response.json({
      events: events.map(serializeEventSummary),
      total,
      page,
      pageSize: EVENT_PAGE_SIZE,
      isAdmin: access.isAdmin,
    })
  } catch (error) {
    return safeApiError(error)
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const input = await readJson(request, eventSchema)
    if (!input.ok) return input.response
    const event = await prisma.$transaction(async (tx) => {
      const access = await galaxyAccess(tx, id, user, true)
      if (!access.membership && !access.isAdmin) deny('joinFirst')
      const reviewers = await adminIds(tx, id)
      if (!reviewers.length) deny('noReviewer', 409)
      const date = new Date(input.data.date)
      if (Number.isNaN(date.getTime()) || date <= new Date())
        deny('futureDate', 400)
      const event = await tx.event.create({
        data: {
          ...input.data,
          date,
          galaxyId: id,
          proposerId: user.id,
          status: 'PENDING',
        },
        include: {
          proposer: {
            select: {
              id: true,
              name: true,
              userLevel: true,
              ...USER_PLANET_CONFIG_SELECT,
            },
          },
          _count: { select: { rsvps: true } },
        },
      })
      await notify(
        tx,
        reviewers,
        'galaxyEventProposed',
        `/galaxy/${access.galaxy.slug}?events=pending#events`,
        { title: event.title, galaxy: access.galaxy.name },
      )
      await reward(tx, user.id, 'EVENT_PROPOSED')
      return event
    })
    return Response.json(
      { event: serializeEventSummary(event) },
      { status: 201 },
    )
  } catch (error) {
    return safeApiError(error)
  }
}
