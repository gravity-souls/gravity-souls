import { EventStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { getCommunityAccess, jsonError, serializeEventDetail } from '@/lib/galaxy-events'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(
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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      proposer: { select: { id: true, name: true, planetTexture: true, userLevel: true } },
      rsvps: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, name: true, planetTexture: true, userLevel: true } } },
      },
      _count: { select: { rsvps: true } },
    },
  })

  if (!event || event.galaxyId !== id) return jsonError('Event not found', 404)

  const isProposer = event.proposerId === userId
  const canView =
    ([EventStatus.APPROVED, EventStatus.PASSED] as EventStatus[]).includes(event.status)
      ? access.isMember || access.isAdmin
      : event.status === EventStatus.PENDING
        ? access.isAdmin || isProposer
        : isProposer

  if (!canView) return jsonError('Event not found', 404)

  return NextResponse.json({
    event: serializeEventDetail({
      ...event,
      userHasRSVPed: event.rsvps.some((rsvp) => rsvp.userId === userId),
    }),
    isAdmin: access.isAdmin,
  })
}