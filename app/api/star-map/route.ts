import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { discoveryPlanetWhere, personalMapPlanetWhere } from '@/lib/visibility'
import { safeApiError } from '@/lib/api-input'
import {
  USER_PLANET_CONFIG_SELECT,
  resolveUserPlanetConfig,
} from '@/lib/user-planet-config'
import { MAP_COLORS } from '@/lib/star-map'
import type { StarMapData } from '@/types/star-map'

const querySchema = z
  .object({
    mode: z.enum(['discover', 'galaxies', 'personal']).default('discover'),
    collection: z.enum(['all', 'saved', 'following', 'mutual']).optional(),
    group: z
      .enum(['calm', 'melancholic', 'intense', 'cold', 'mixed', 'other'])
      .optional(),
    cursor: z.string().min(1).max(100).optional(),
    search: z.string().trim().max(80).default(''),
  })
  .strict()
const MOODS = ['calm', 'melancholic', 'intense', 'cold', 'mixed']
const PAGE_SIZE = 36
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const parsed = querySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!parsed.success)
      return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const { mode, group, cursor, search, collection } = parsed.data
    if (collection && mode !== 'personal')
      return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const viewer = await prisma.user.findUnique({ where: { id: user.id }, select: { deletedAt: true } })
    if (!viewer || viewer.deletedAt) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (mode === 'galaxies') {
      const where = search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { keywords: { has: search } },
            ],
          }
        : {}
      const [rows, total] = await Promise.all([
        prisma.community.findMany({
          where,
          orderBy: { id: 'asc' },
          take: 25,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            name: true,
            slug: true,
            tagline: true,
            accentColor: true,
            _count: { select: { memberships: { where: { user: { deletedAt: null } } } } },
          },
        }),
        prisma.community.count({ where }),
      ])
      const more = rows.length > 24
      if (more) rows.pop()
      const data: StarMapData = {
        groups: rows.map((c) => ({
          id: c.id,
          name: c.name,
          count: c._count.memberships,
          color: /^#[\da-f]{6}$/i.test(c.accentColor)
            ? c.accentColor
            : '#b89afa',
        })),
        nodes: rows.map((c) => ({
          id: c.id,
          groupId: c.id,
          name: c.name,
          tagline: c.tagline,
          memberCount: c._count.memberships,
          href: `/galaxy/${c.slug}`,
        })),
        total,
        nextCursor: more ? rows.at(-1)!.id : null,
        scope: 'batch',
      }
      return Response.json(data, {
        headers: { 'Cache-Control': 'private, no-store' },
      })
    }
    const base = mode === 'personal'
      ? await personalMapPlanetWhere(user.id, collection ?? 'all')
      : await discoveryPlanetWhere(user.id)
    if (search) base.name = { contains: search, mode: 'insensitive' }
    const where = {
      ...base,
      ...(group ? { mood: group === 'other' ? { notIn: MOODS } : group } : {}),
    }
    const [rows, total, counts] = await Promise.all([
      prisma.planet.findMany({
        where,
        orderBy: { id: 'asc' },
        take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          userId: true,
          name: true,
          tagline: true,
          mood: true,
          style: true,
          lifestyle: true,
          coreThemes: true,
          abstractAxis: true,
          introspectiveAxis: true,
          visual: true,
          user: { select: { userLevel: true, ...USER_PLANET_CONFIG_SELECT } },
        },
      }),
      prisma.planet.count({ where: base }),
      prisma.planet.groupBy({
        by: ['mood'],
        where: base,
        _count: { _all: true },
      }),
    ])
    const more = rows.length > PAGE_SIZE
    if (more) rows.pop()
    // Only the viewer's relationships to the bounded, permitted batch are read.
    // Saved collections and conversation IDs are never queried for another viewer.
    const targetIds = [...new Set(rows.map((p) => p.userId))]
    const [saved, follows, conversations] = rows.length ? await Promise.all([
      prisma.savedPlanet.findMany({
        where: { userId: user.id, planetId: { in: rows.map((p) => p.id) } },
        select: { planetId: true },
      }),
      prisma.follow.findMany({
        where: { OR: [
          { followerId: user.id, followingId: { in: targetIds } },
          { followingId: user.id, followerId: { in: targetIds } },
        ] },
        select: { followerId: true, followingId: true },
      }),
      prisma.conversationThread.findMany({
        where: { OR: [
          { userAId: user.id, userBId: { in: targetIds } },
          { userBId: user.id, userAId: { in: targetIds } },
        ] },
        select: { id: true, userAId: true, userBId: true },
      }),
    ]) : [[], [], []]
    const savedIds = new Set(saved.map((row) => row.planetId))
    const followingIds = new Set(follows.filter((row) => row.followerId === user.id).map((row) => row.followingId))
    const followerIds = new Set(follows.filter((row) => row.followingId === user.id).map((row) => row.followerId))
    const threadIds = new Map(conversations.map((row) => [row.userAId === user.id ? row.userBId : row.userAId, row.id]))
    const nodes = rows.map((p) => ({
      id: p.id,
      userId: p.userId,
      relationship: {
        saved: savedIds.has(p.id),
        following: followingIds.has(p.userId),
        followedBy: followerIds.has(p.userId),
        conversationId: threadIds.get(p.userId) ?? null,
      },
      name: p.name,
      tagline: p.tagline,
      href: `/planet/${p.id}`,
      groupId: MOODS.includes(p.mood) ? p.mood : 'other',
      planetConfig: resolveUserPlanetConfig(p.user, p) ?? undefined,
      level: p.user.userLevel,
    }))
    const groups = [...MOODS, 'other'].map((id) => ({
      id,
      color: MAP_COLORS[id],
      count: counts
        .filter((row) => (MOODS.includes(row.mood) ? row.mood : 'other') === id)
        .reduce((sum, row) => sum + row._count._all, 0),
    }))
    return Response.json(
      {
        groups,
        nodes,
        total,
        nextCursor: more ? rows.at(-1)!.id : null,
        scope: mode === 'personal' ? 'personal' : 'allVisible',
      } satisfies StarMapData,
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return safeApiError(error)
  }
}
