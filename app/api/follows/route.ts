import { getUserLocale } from '@/lib/notification-i18n'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { followSchema } from '@/lib/input-schemas'
import { canContact, blockedUserIds } from '@/lib/visibility'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { NotificationTemplates } from '@/lib/createNotification'
import {
  resolveUserPlanetConfig,
  USER_PLANET_CONFIG_SELECT,
} from '@/lib/user-planet-config'

const PLANET_SUMMARY_SELECT = {
  id: true,
  name: true,
  avatarSymbol: true,
  tagline: true,
  visual: true,
} as const

async function planetSummaries(userIds: string[]) {
  const rows =
    userIds.length === 0
      ? []
      : await prisma.planet.findMany({
          where: { userId: { in: userIds }, active: true, user: { deletedAt: null } },
          select: {
            ...PLANET_SUMMARY_SELECT,
            userId: true,
            mood: true,
            lifestyle: true,
            coreThemes: true,
            user: { select: USER_PLANET_CONFIG_SELECT },
          },
        })
  return new Map(
    rows.map((r) => [
      r.userId,
      {
        id: r.id,
        name: r.name,
        avatarSymbol: r.avatarSymbol,
        tagline: r.tagline,
        visual: r.visual,
        mood: r.mood,
        planetConfig: resolveUserPlanetConfig(r.user, r),
      },
    ]),
  )
}

// GET /api/follows - my outgoing follows and my followers (owner-only)
export async function GET() {
  try {
    const session = await requireUser()
    const userId = session.user.id

    const excluded = [...(await blockedUserIds(userId))]
    const [following, followers] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId, followingId: { notIn: excluded }, following: { deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        select: { followingId: true, createdAt: true },
      }),
      prisma.follow.findMany({
        where: { followingId: userId, followerId: { notIn: excluded }, follower: { deletedAt: null } },
        orderBy: { createdAt: 'desc' },
        select: { followerId: true, createdAt: true },
      }),
    ])

    const summaries = await planetSummaries(
      Array.from(
        new Set([
          ...following.map((f) => f.followingId),
          ...followers.map((f) => f.followerId),
        ]),
      ),
    )

    return Response.json({
      following: following.map((f) => ({
        userId: f.followingId,
        since: f.createdAt,
        planet: summaries.get(f.followingId) ?? null,
      })),
      followers: followers.map((f) => ({
        userId: f.followerId,
        since: f.createdAt,
        planet: summaries.get(f.followerId) ?? null,
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return safeApiError(error)
  }
}

// POST /api/follows - follow a user
export async function POST(request: Request) {
  try {
    const session = await requireUser()
    const userId = session.user.id

    const input = await readJson(request, followSchema)
    if (!input.ok) return input.response
    const { userId: targetUserId } = input.data

    if (targetUserId === userId)
      return Response.json({ error: 'Cannot follow yourself' }, { status: 400 })

    const target = await prisma.user.findFirst({
      where: { id: targetUserId, deletedAt: null },
      select: { id: true },
    })
    if (!target)
      return Response.json({ error: 'Planet not found' }, { status: 404 })

    if (!(await canContact(userId, targetUserId))) {
      return Response.json(
        { error: 'This planet is not reachable' },
        { status: 403 },
      )
    }

    const allowed = await checkRateLimit(
      rateLimitKey('FOLLOW', userId),
      RATE_LIMITS.FOLLOW.limit,
      RATE_LIMITS.FOLLOW.windowMs,
    )
    if (!allowed)
      return Response.json(
        { error: 'Too many follow actions. Try again later.' },
        { status: 429 },
      )

    const myPlanet = await prisma.planet.findFirst({
      where: { userId, active: true },
      select: { id: true },
    })
    const notification = await NotificationTemplates.newFollower(
      session.user.name ?? '',
      myPlanet ? `/planet/${myPlanet.id}` : '/relationships',
      await getUserLocale(targetUserId),
    )
    const created = await prisma.$transaction(async (tx) => {
      const rows = await tx.follow.createMany({
        data: { followerId: userId, followingId: targetUserId },
        skipDuplicates: true,
      })
      if (rows.count)
        await tx.notification.create({
          data: { userId: targetUserId, ...notification },
        })
      return rows.count
    })

    return Response.json({ following: true }, { status: created ? 201 : 200 })
  } catch (error) {
    return safeApiError(error)
  }
}
