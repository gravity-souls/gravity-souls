import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { followSchema } from '@/lib/input-schemas'
import { canContact } from '@/lib/visibility'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { NotificationTemplates, createNotification } from '@/lib/createNotification'

const PLANET_SUMMARY_SELECT = {
  id: true,
  name: true,
  avatarSymbol: true,
  tagline: true,
  visual: true,
} as const

async function planetSummaries(userIds: string[]) {
  const rows = userIds.length === 0 ? [] : await prisma.planet.findMany({
    where: { userId: { in: userIds }, active: true },
    select: { ...PLANET_SUMMARY_SELECT, userId: true },
  })
  return new Map(rows.map((r) => [r.userId, r]))
}

// GET /api/follows - my outgoing follows and my followers (owner-only)
export async function GET() {
  try {
    const session = await requireUser()
    const userId = session.user.id

    const [following, followers] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        select: { followingId: true, createdAt: true },
      }),
      prisma.follow.findMany({
        where: { followingId: userId },
        orderBy: { createdAt: 'desc' },
        select: { followerId: true, createdAt: true },
      }),
    ])

    const summaries = await planetSummaries(Array.from(new Set([
      ...following.map((f) => f.followingId),
      ...followers.map((f) => f.followerId),
    ])))

    return Response.json({
      following: following.map((f) => ({ userId: f.followingId, since: f.createdAt, planet: summaries.get(f.followingId) ?? null })),
      followers: followers.map((f) => ({ userId: f.followerId, since: f.createdAt, planet: summaries.get(f.followerId) ?? null })),
    })
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

    if (targetUserId === userId) return Response.json({ error: 'Cannot follow yourself' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!target) return Response.json({ error: 'Planet not found' }, { status: 404 })

    if (!(await canContact(userId, targetUserId))) {
      return Response.json({ error: 'This planet is not reachable' }, { status: 403 })
    }

    const allowed = await checkRateLimit(rateLimitKey('FOLLOW', userId), RATE_LIMITS.FOLLOW.limit, RATE_LIMITS.FOLLOW.windowMs)
    if (!allowed) return Response.json({ error: 'Too many follow actions. Try again later.' }, { status: 429 })

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetUserId } },
      select: { id: true },
    })

    if (!existing) {
      await prisma.follow.create({ data: { followerId: userId, followingId: targetUserId } })
      const myPlanet = await prisma.planet.findFirst({ where: { userId, active: true }, select: { id: true } })
      await createNotification({
        userId: targetUserId,
        ...NotificationTemplates.newFollower(session.user.name ?? 'A planet', myPlanet ? `/planet/${myPlanet.id}` : '/relationships'),
      }).catch(() => null)
    }

    return Response.json({ following: true }, { status: 201 })
  } catch (error) {
    return safeApiError(error)
  }
}
