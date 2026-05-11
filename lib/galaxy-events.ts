import { EventStatus, type EventCategory, type Community, type CommunityMembership } from '@prisma/client'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const EVENT_PAGE_SIZE = 20

type CommunityAccess = {
  community: Pick<Community, 'id' | 'name' | 'slug' | 'creatorId'>
  membership: Pick<CommunityMembership, 'id' | 'role'> | null
  isMember: boolean
  isAdmin: boolean
}

export async function getCommunityAccess(galaxyId: string, userId: string): Promise<CommunityAccess | null> {
  const community = await prisma.community.findUnique({
    where: { id: galaxyId },
    select: {
      id: true,
      name: true,
      slug: true,
      creatorId: true,
      memberships: {
        where: { userId },
        select: { id: true, role: true },
        take: 1,
      },
    },
  })

  if (!community) return null

  const membership = community.memberships[0] ?? null
  const isAdmin = community.creatorId === userId || membership?.role === 'ADMIN'

  return {
    community: {
      id: community.id,
      name: community.name,
      slug: community.slug,
      creatorId: community.creatorId,
    },
    membership,
    isMember: !!membership,
    isAdmin,
  }
}

export async function getAdminUserIds(galaxyId: string) {
  const community = await prisma.community.findUnique({
    where: { id: galaxyId },
    select: {
      creatorId: true,
      memberships: {
        where: { role: 'ADMIN' },
        select: { userId: true },
      },
    },
  })

  if (!community) return []

  return Array.from(new Set([
    community.creatorId,
    ...community.memberships.map((membership) => membership.userId),
  ].filter((id): id is string => !!id)))
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function parseEventCategory(value: unknown): EventCategory | null {
  if (typeof value !== 'string') return null
  const normalized = value.toUpperCase()
  if (['MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER'].includes(normalized)) {
    return normalized as EventCategory
  }
  return null
}

type EventSummaryInput = {
  id: string
  galaxyId: string
  title: string
  description: string
  date: Date
  location: string | null
  onlineUrl: string | null
  maxAttendees: number | null
  category: EventCategory
  status: EventStatus
  coverImage: string | null
  createdAt: Date
  updatedAt: Date
  proposer: { id: string; name: string; planetTexture: string | null; userLevel?: number | null }
  rsvps?: { userId: string }[]
  _count: { rsvps: number }
  userHasRSVPed?: boolean
}

type EventDetailInput = Omit<EventSummaryInput, 'rsvps'> & {
  rsvps: {
    userId: string
    user: { id: string; name: string; planetTexture: string | null; userLevel: number }
  }[]
}

export function serializeEventSummary(event: EventSummaryInput) {
  return {
    id: event.id,
    galaxyId: event.galaxyId,
    title: event.title,
    description: event.description,
    date: event.date.toISOString(),
    location: event.location,
    onlineUrl: event.onlineUrl,
    maxAttendees: event.maxAttendees,
    category: event.category,
    status: event.status,
    coverImage: event.coverImage,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    rsvpCount: event._count.rsvps,
    userHasRSVPed: event.userHasRSVPed ?? (event.rsvps?.length ?? 0) > 0,
    proposer: {
      id: event.proposer.id,
      name: event.proposer.name,
      planetTexture: event.proposer.planetTexture,
      userLevel: event.proposer.userLevel ?? 1,
    },
  }
}

export function serializeEventDetail(event: EventDetailInput) {
  const summary = serializeEventSummary(event)
  const spotsRemaining = event.maxAttendees == null
    ? null
    : Math.max(0, event.maxAttendees - event._count.rsvps)

  return {
    ...summary,
    rsvps: event.rsvps.map((rsvp) => ({
      id: rsvp.user.id,
      name: rsvp.user.name,
      planetTexture: rsvp.user.planetTexture,
      userLevel: rsvp.user.userLevel,
    })),
    spotsRemaining,
  }
}