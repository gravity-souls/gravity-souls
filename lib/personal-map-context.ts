import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { blockedUserIds } from '@/lib/visibility'
import { eventProposerWhere } from '@/lib/event-visibility'
import type { StarMapData } from '@/types/star-map'
import { constellationGroup, constellationGroups, parseConstellationGroup } from '@/lib/activity-constellations'

const LIMIT = 24
const COLORS: Record<string, string> = { owned: '#b89afa', joined: '#68d8bd', interested: '#e9c779', going: '#68d8bd', requested: '#7babf5', past: '#a3abbc' }
type Query = { layer: 'galaxies' | 'activities' | 'constellations'; search: string; group?: string; cursor?: string }
export async function personalMapContext(userId: string, { layer, search, group, cursor }: Query): Promise<StarMapData> {
  if (layer === 'galaxies') {
    const blocked = [...await blockedUserIds(userId)]
    const base: Prisma.CommunityWhereInput = { AND: [
      { OR: [{ creatorId: userId }, { memberships: { some: { userId } } }] },
      { OR: [{ creatorId: null }, { creator: { deletedAt: null, id: { notIn: blocked } } }] },
      ...(search ? [{ name: { contains: search, mode: 'insensitive' as const } }] : []),
    ] }
    const filters: Record<string, Prisma.CommunityWhereInput> = {
      owned: { creatorId: userId },
      joined: { OR: [{ creatorId: null }, { creatorId: { not: userId } }], memberships: { some: { userId } } },
    }
    const where: Prisma.CommunityWhereInput = { AND: [base, ...(group ? [filters[group]] : [])] }
    if (cursor && !await prisma.community.findFirst({ where: { AND: [where, { id: cursor }] }, select: { id: true } })) throw Response.json({ error: 'invalidCursor' }, { status: 400 })
    const [rows, counts] = await Promise.all([
      prisma.community.findMany({ where, orderBy: { id: 'asc' }, take: LIMIT + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, name: true, slug: true, tagline: true, creatorId: true, memberships: { where: { userId }, select: { id: true } }, _count: { select: { memberships: { where: { user: { deletedAt: null } } } } } } }),
      Promise.all(Object.entries(filters).map(async ([id, filter]) => ({ id, color: COLORS[id], count: await prisma.community.count({ where: { AND: [base, filter] } }) }))),
    ])
    const more = rows.length > LIMIT
    if (more) rows.pop()
    return { groups: counts, nodes: rows.map(row => ({ id: row.id, kind: 'galaxy', galaxyRelationship: { created: row.creatorId === userId, joined: row.memberships.length > 0 }, groupId: row.creatorId === userId ? 'owned' : 'joined', name: row.name, tagline: row.tagline, memberCount: row._count.memberships, href: `/galaxy/${encodeURIComponent(row.slug)}` })), total: counts.reduce((sum, g) => sum + g.count, 0), nextCursor: more ? rows.at(-1)!.id : null, scope: 'personal' }
  }
  const now = new Date()
  const base: Prisma.EventWhereInput = { AND: [
    await eventProposerWhere(userId),
    { galaxy: { OR: [{ creatorId: userId }, { memberships: { some: { userId } } }] } },
    { status: { in: ['APPROVED', 'PASSED', 'CANCELLED'] } },
    { OR: [{ interests: { some: { userId } } }, { rsvps: { some: { userId, status: { in: ['PENDING', 'APPROVED', 'CANCELLED'] } } } }] },
    ...(search ? [{ title: { contains: search, mode: 'insensitive' as const } }] : []),
  ] }
  const upcoming = { status: 'APPROVED' as const, date: { gt: now } }
  const filters: Record<string, Prisma.EventWhereInput> = {
    going: { ...upcoming, rsvps: { some: { userId, status: 'APPROVED' } } },
    requested: { ...upcoming, rsvps: { some: { userId, status: 'PENDING' } } },
    interested: { ...upcoming, interests: { some: { userId } }, rsvps: { none: { userId, status: { in: ['PENDING', 'APPROVED', 'CANCELLED'] } } } },
    past: { OR: [{ date: { lte: now } }, { status: { in: ['PASSED', 'CANCELLED'] } }, { rsvps: { some: { userId, status: 'CANCELLED' } } }] },
  }
  const constellation = layer === 'constellations' && group ? parseConstellationGroup(group) : null
  if (layer === 'constellations' && group && !constellation) throw Response.json({ error: 'invalidQuery' }, { status: 400 })
  const constellationFilter: Prisma.EventWhereInput | null = constellation ? { AND: [
    { galaxyId: constellation.galaxyId },
    constellation.past ? filters.past : { NOT: filters.past },
  ] } : null
  const where: Prisma.EventWhereInput = { AND: [base, ...(constellationFilter ? [constellationFilter] : layer === 'activities' && group ? [filters[group]] : [])] }
  if (cursor && !await prisma.event.findFirst({ where: { AND: [where, { id: cursor }] }, select: { id: true } })) throw Response.json({ error: 'invalidCursor' }, { status: 400 })
  const [rows, counts] = await Promise.all([
    prisma.event.findMany({ where, orderBy: { id: 'asc' }, take: LIMIT + 1, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, title: true, date: true, status: true, galaxy: { select: { id: true, name: true, slug: true } }, interests: { where: { userId }, select: { id: true } }, rsvps: { where: { userId }, select: { status: true } } } }),
    Promise.all(Object.entries(filters).map(async ([id, filter]) => ({ id, color: COLORS[id], count: await prisma.event.count({ where: { AND: [base, filter] } }) }))),
  ])
  const more = rows.length > LIMIT
  if (more) rows.pop()
  const nodes = rows.map(row => {
    const attendance = row.rsvps[0]?.status ?? null
    const ended = row.status !== 'APPROVED' || row.date <= now
    const activityState = ended || attendance === 'CANCELLED' ? 'past' as const : attendance === 'APPROVED' ? 'going' as const : attendance === 'PENDING' ? 'requested' as const : 'interested' as const
    const groupId = layer === 'constellations' ? constellationGroup(row.galaxy.id, activityState === 'past') : activityState
    return { id: row.id, kind: 'activity' as const, activityState, groupId, name: row.title, tagline: row.galaxy.name, date: row.date.toISOString(), eventStatus: row.status === 'CANCELLED' ? 'CANCELLED' as const : ended ? 'PASSED' as const : 'APPROVED' as const, userAttendance: attendance, userInterested: row.interests.length > 0, href: `/galaxy/${encodeURIComponent(row.galaxy.slug)}?event=${encodeURIComponent(row.id)}#events` }
  })
  return { groups: layer === 'constellations' ? constellationGroups(nodes) : counts, nodes, ...(layer === 'constellations' ? { groupScope: 'batch' as const } : {}), total: counts.reduce((sum, g) => sum + g.count, 0), nextCursor: more ? rows.at(-1)!.id : null, scope: 'personal' }
}
