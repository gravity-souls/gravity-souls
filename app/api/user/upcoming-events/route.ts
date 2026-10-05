import { z } from 'zod'
import { serializeEventSummary } from '@/lib/galaxy-events'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { eventProposerWhere } from '@/lib/event-visibility'
import { canViewProfile } from '@/lib/visibility'
import { prisma } from '@/lib/prisma'
import { USER_PLANET_CONFIG_SELECT } from '@/lib/user-planet-config'

const query = z.object({ limit: z.coerce.number().int().min(1).max(6).default(1) }).strict()
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const parsed = query.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const userId = user.id
    if (!await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { id: true } })) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    const now = new Date()
    const base = {
      ...await eventProposerWhere(userId), status: 'APPROVED' as const, date: { gt: now },
      galaxy: { OR: [{ creatorId: userId }, { memberships: { some: { userId } } }] },
    }
    const include = {
      galaxy: { select: { id: true, name: true, slug: true, accentColor: true } },
      proposer: { select: { id: true, name: true, userLevel: true, ...USER_PLANET_CONFIG_SELECT } },
      rsvps: { where: { userId }, select: { userId: true, status: true } },
      _count: { select: { rsvps: { where: { status: 'APPROVED' } } } },
    } as const
    const orderBy = [{ date: 'asc' as const }, { id: 'asc' as const }]
    // Confirmed attendance comes first. Galaxy suggestions do not become reminders.
    const going = await prisma.event.findMany({ where: { ...base, rsvps: { some: { userId, status: 'APPROVED' } } }, orderBy, take: parsed.data.limit, include })
    const remaining = parsed.data.limit - going.length
    const suggestions = remaining ? await prisma.event.findMany({ where: { ...base, rsvps: { none: { userId } } }, orderBy, take: remaining, include }) : []
    const events = await Promise.all([...going, ...suggestions].map(async event => {
      const summary = serializeEventSummary(event)
      const profileVisible = await canViewProfile(userId, event.proposer.id)
      return {
        ...summary, galaxy: event.galaxy, rejectionReason: null,
        onlineUrl: summary.userHasRSVPed || event.proposer.id === userId ? summary.onlineUrl : null,
        reminderState: summary.userHasRSVPed ? event.date.getTime() - now.getTime() <= 24 * 60 * 60 * 1000 ? 'soon' : 'scheduled' : null,
        proposer: profileVisible ? summary.proposer : { ...summary.proposer, planetTexture: null, planetConfig: null },
      }
    }))
    return Response.json({ event: events[0] ?? null, events }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}
