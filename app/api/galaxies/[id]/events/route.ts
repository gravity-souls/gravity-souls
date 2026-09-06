import { readJson, safeApiError } from '@/lib/api-input'
import { eventSchema } from '@/lib/input-schemas'
import { EventStatus, NotificationType, type Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { createNotification } from '@/lib/createNotification'
import { getAdminUserIds, getCommunityAccess, jsonError, parseEventCategory, serializeEventSummary, EVENT_PAGE_SIZE } from '@/lib/galaxy-events'
import { grantXP } from '@/lib/grantXP'
import { requireUser } from '@/lib/session'
import { updatePassedEvents } from '@/lib/updatePassedEvents'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let session
    try {
      session = await requireUser()
    } catch (res) {
      return res as Response
    }

    await updatePassedEvents()

    const { id } = await params
    const userId = session.user.id
    const access = await getCommunityAccess(id, userId)

    if (!access) return jsonError('Galaxy not found', 404)
    if (!access.isMember && !access.isAdmin) return jsonError('Join this galaxy to view events', 403)

    const url = new URL(request.url)
    const status = url.searchParams.get('status') ?? 'upcoming'
    const category = parseEventCategory(url.searchParams.get('category'))
    const search = (url.searchParams.get('search') ?? '').trim()
    const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)

    const where: Prisma.EventWhereInput = { galaxyId: id }

    if (status === 'pending') {
      if (!access.isAdmin) return jsonError('Only galaxy admins can view pending proposals', 403)
      where.status = EventStatus.PENDING
    } else if (status === 'passed') {
      where.status = EventStatus.PASSED
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
          proposer: { select: { id: true, name: true, planetTexture: true, userLevel: true } },
          rsvps: { where: { userId }, select: { userId: true } },
          _count: { select: { rsvps: true } },
        },
      }),
      prisma.event.count({ where }),
    ])

    return NextResponse.json({
      events: events.map(serializeEventSummary),
      page,
      pageSize: EVENT_PAGE_SIZE,
      total,
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
    let session
    try {
      session = await requireUser()
    } catch (res) {
      return res as Response
    }

    const { id } = await params
    const userId = session.user.id
    const access = await getCommunityAccess(id, userId)

    if (!access) return jsonError('Galaxy not found', 404)
    if (!access.isMember && !access.isAdmin) return jsonError('Join this galaxy before proposing events', 403)

    const input = await readJson(request, eventSchema)
    if (!input.ok) return input.response
    const body = input.data
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const date = typeof body.date === 'string' ? new Date(body.date) : null
    const category = parseEventCategory(body.category)
    const location = typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null
    const onlineUrl = typeof body.onlineUrl === 'string' && body.onlineUrl.trim() ? body.onlineUrl.trim() : null
    const coverImage = typeof body.coverImage === 'string' && body.coverImage.trim() ? body.coverImage.trim() : null
    const maxAttendees = body.maxAttendees === undefined || body.maxAttendees === null
      ? null
      : Number(body.maxAttendees)

    if (!title || title.length > 80) return jsonError('Title is required and must be 80 characters or fewer', 400)
    if (!description || description.length > 500) return jsonError('Description is required and must be 500 characters or fewer', 400)
    if (!category) return jsonError('Choose a valid event category', 400)
    if (!date || Number.isNaN(date.getTime()) || date <= new Date()) return jsonError('Event date must be in the future', 400)
    if (maxAttendees !== null && (!Number.isInteger(maxAttendees) || maxAttendees < 2)) {
      return jsonError('Max attendees must be at least 2', 400)
    }

    const event = await prisma.event.create({
      data: {
        galaxyId: id,
        proposerId: userId,
        title,
        description,
        date,
        location,
        onlineUrl,
        maxAttendees,
        category,
        coverImage,
        status: EventStatus.PENDING,
      },
      include: {
        proposer: { select: { id: true, name: true, planetTexture: true, userLevel: true } },
        rsvps: { where: { userId }, select: { userId: true } },
        _count: { select: { rsvps: true } },
      },
    })

    const adminUserIds = (await getAdminUserIds(id)).filter((adminId) => adminId !== userId)
    await Promise.all(adminUserIds.map((adminId) => createNotification({
      userId: adminId,
      type: NotificationType.GALAXY_NEW_EVENT,
      title: 'New event proposed',
      body: `${event.proposer.name} proposed "${title}" in ${access.community.name}`,
      actionUrl: `/galaxies/${id}/events/pending`,
    })))

    const xpEvent = await grantXP(userId, 'EVENT_PROPOSED')

    return NextResponse.json({ event: serializeEventSummary(event), xpEvent, leveledUp: xpEvent.leveledUp }, { status: 201 })

  } catch (error) {
    return safeApiError(error)
  }
}