import { EventStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { resolveUserPlanetConfig } from '@/lib/user-planet-config'

const USER_PLANET_SELECT = {
  id: true,
  name: true,
  planetTexture: true,
  planetTint: true,
  planetAtmoColor: true,
  planetAtmoDensity: true,
  planetHasRing: true,
  planetRingColor: true,
  planetRotationSpeed: true,
  planetCloudOpacity: true,
  planetCustomTexture: true,
  userLevel: true,
  planets: {
    where: { active: true },
    take: 1,
    select: { mood: true, lifestyle: true, coreThemes: true, visual: true },
  },
} as const

function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))
}

export async function GET() {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const userId = session.user.id
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const memberships = await prisma.communityMembership.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
    include: {
      community: {
        include: {
          memberships: {
            take: 8,
            orderBy: { joinedAt: 'desc' },
            include: { user: { select: USER_PLANET_SELECT } },
          },
          _count: { select: { memberships: true } },
        },
      },
    },
  })

  const galaxies = await Promise.all(memberships.map(async ({ community }) => {
    const [recentPosts, recentEvents, upcomingEventsCount] = await Promise.all([
      prisma.communityPost.count({ where: { communityId: community.id, createdAt: { gte: sevenDaysAgo } } }),
      prisma.event.count({ where: { galaxyId: community.id, createdAt: { gte: sevenDaysAgo } } }),
      prisma.event.count({ where: { galaxyId: community.id, status: EventStatus.APPROVED, date: { gte: new Date() } } }),
    ])

    return {
      id: community.id,
      slug: community.slug,
      name: community.name,
      symbol: community.symbol,
      description: community.description,
      tagline: community.tagline,
      keywords: community.keywords,
      mood: community.mood,
      maturity: community.maturity,
      accentColor: community.accentColor,
      memberCount: community._count.memberships,
      recentActivityScore: clampMetric(recentPosts + recentEvents),
      topTags: community.keywords.slice(0, 6),
      upcomingEventsCount,
      members: community.memberships.map(({ user }) => ({
        id: user.id,
        name: user.name,
        planetConfig: resolveUserPlanetConfig(user, user.planets[0]) ?? {
          baseTexture: 'jupiter.jpg',
          tintColor: '#7c4dbf',
          atmosphereColor: '#b39ddb',
          atmosphereDensity: 0.12,
          hasRing: false,
          ringColor: '#9b7de0',
          rotationSpeed: 0.018,
          cloudOpacity: 0,
        },
        userLevel: user.userLevel,
      })),
    }
  }))

  return Response.json({ galaxies })
}
