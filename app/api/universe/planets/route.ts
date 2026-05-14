import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { normalizePlanetVisual, resolveUserPlanetConfig, type UserPlanetConfigSource } from '@/lib/user-planet-config'
import type { PlanetConfig, PlanetProfile } from '@/types/planet'

const ONLINE_WINDOW_MS = 5 * 60_000

type UniverseUser = UserPlanetConfigSource & {
  id: string
  name: string
  xp: number
  userLevel: number
  lastActiveAt: Date | null
  profile: {
    name: string
    culturalTags: string[]
  } | null
  memberships: {
    community: {
      id: string
      name: string
    }
  }[]
  planets: UniversePlanetRecord[]
}

type UniversePlanetRecord = {
  id: string
  userId: string
  name: string
  avatarSymbol: string
  tagline: string | null
  mood: string
  style: string
  lifestyle: string
  coreThemes: string[]
  contentFragments: string[]
  visual: unknown
  abstractAxis: number
  introspectiveAxis: number
  createdAt: Date
}

const USER_INCLUDE = {
  profile: { select: { name: true, culturalTags: true } },
  memberships: { include: { community: { select: { id: true, name: true } } } },
  planets: {
    where: { active: true },
    take: 1,
    select: {
      id: true,
      userId: true,
      name: true,
      avatarSymbol: true,
      tagline: true,
      mood: true,
      style: true,
      lifestyle: true,
      coreThemes: true,
      contentFragments: true,
      visual: true,
      abstractAxis: true,
      introspectiveAxis: true,
      createdAt: true,
    },
  },
} as const

const USER_SELECT = {
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
  xp: true,
  userLevel: true,
  lastActiveAt: true,
  ...USER_INCLUDE,
} as const

function clampMetric(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)))
}

function isOnline(lastActiveAt: Date | null) {
  return !!lastActiveAt && lastActiveAt.getTime() > Date.now() - ONLINE_WINDOW_MS
}

function planetConfigFor(user: UniverseUser, planet: UniversePlanetRecord): PlanetConfig {
  return resolveUserPlanetConfig(user, planet) ?? {
    baseTexture: 'jupiter.jpg',
    tintColor: '#7c4dbf',
    atmosphereColor: '#b39ddb',
    atmosphereDensity: 0.12,
    hasRing: false,
    ringColor: '#9b7de0',
    rotationSpeed: 0.018,
    cloudOpacity: 0,
  }
}

async function getTelemetry(user: UniverseUser, ownCommunityIds: Set<string>) {
  const [postCount, comments, sentMatches, sentThreads, matchConnections, threadConnections] = await Promise.all([
    prisma.post.count({ where: { authorId: user.id } }),
    prisma.postComment.findMany({ where: { authorId: user.id }, select: { content: true } }),
    prisma.match.count({ where: { userAId: user.id } }),
    prisma.conversationThread.count({ where: { userAId: user.id } }),
    prisma.match.findMany({
      where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
      select: { userAId: true, userBId: true },
    }),
    prisma.conversationThread.findMany({
      where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
      select: { userAId: true, userBId: true },
    }),
  ])

  const avgCommentLength = comments.length > 0
    ? comments.reduce((sum, comment) => sum + comment.content.length, 0) / comments.length
    : 0
  const attachedGalaxies = user.memberships.map((membership) => membership.community)
  const sharedGalaxies = attachedGalaxies.filter((galaxy) => ownCommunityIds.has(galaxy.id))
  const shownGalaxies = sharedGalaxies.length > 0 ? sharedGalaxies : attachedGalaxies
  const connectedUserIds = new Set<string>()
  for (const connection of matchConnections) connectedUserIds.add(connection.userAId === user.id ? connection.userBId : connection.userAId)
  for (const connection of threadConnections) connectedUserIds.add(connection.userAId === user.id ? connection.userBId : connection.userAId)
  const resonanceSentCount = sentMatches + sentThreads
  const successfulConnections = connectedUserIds.size
  const resonanceAcceptedCount = successfulConnections

  const clarity = [
    user.planetTexture ? 25 : 0,
    user.name || user.profile?.name ? 25 : 0,
    attachedGalaxies.length > 0 ? 25 : 0,
    postCount > 0 ? 25 : 0,
  ].reduce((sum, value) => sum + value, 0)

  return {
    cognitive: {
      abstract: clampMetric(postCount * 10),
      introspective: clampMetric(resonanceSentCount * 8),
    },
    emotional: {
      depth: clampMetric(avgCommentLength / 2),
      warmth: resonanceSentCount > 0 ? clampMetric((resonanceAcceptedCount / resonanceSentCount) * 100) : 0,
      clarity,
      resonance: clampMetric(successfulConnections * 10),
    },
    signalScore: clampMetric(Math.floor(user.xp / 20)),
    linkedPlanets: successfulConnections,
    attachedGalaxies: shownGalaxies,
  }
}

async function serializePlanet(user: UniverseUser, ownCommunityIds: Set<string>) {
  const planet = user.planets[0]
  if (!planet) return null

  const visual = normalizePlanetVisual(planet.visual)
  const telemetry = await getTelemetry(user, ownCommunityIds)
  const planetConfig = planetConfigFor(user, planet)
  const galaxies = telemetry.attachedGalaxies

  return {
    id: planet.id,
    userId: user.id,
    name: planet.name || user.name,
    avatarSymbol: planet.avatarSymbol,
    tagline: planet.tagline,
    role: 'resonator' as const,
    mood: planet.mood as PlanetProfile['mood'],
    style: planet.style as PlanetProfile['style'],
    lifestyle: planet.lifestyle as PlanetProfile['lifestyle'],
    coreThemes: planet.coreThemes,
    contentFragments: planet.contentFragments,
    visual,
    cognitiveAxes: telemetry.cognitive,
    emotionalBars: [
      { label: 'Depth', value: telemetry.emotional.depth, color: '#a78bfa' },
      { label: 'Warmth', value: telemetry.emotional.warmth, color: '#f97316' },
      { label: 'Clarity', value: telemetry.emotional.clarity, color: '#60a5fa' },
      { label: 'Resonance', value: telemetry.emotional.resonance, color: '#34d399' },
    ],
    createdAt: planet.createdAt.toISOString(),
    planetConfig,
    moodTags: Array.from(new Set([planet.mood, planet.lifestyle, ...planet.coreThemes, ...(user.profile?.culturalTags ?? [])])).slice(0, 5),
    userLevel: user.userLevel,
    isOnline: isOnline(user.lastActiveAt),
    galaxies,
    telemetry,
  }
}

export async function GET() {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const userId = session.user.id
  const [currentUser, matchConnections, threadConnections] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT }),
    prisma.match.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: USER_SELECT },
        userB: { select: USER_SELECT },
      },
    }),
    prisma.conversationThread.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        userA: { select: USER_SELECT },
        userB: { select: USER_SELECT },
      },
    }),
  ])

  if (!currentUser) return Response.json({ error: 'User not found' }, { status: 404 })

  const ownCommunityIds = new Set(currentUser.memberships.map((membership) => membership.community.id))
  const connectedUsers = [...matchConnections, ...threadConnections].map((connection) => (
    connection.userAId === userId ? connection.userB : connection.userA
  ))
  const uniqueConnectedUsers = Array.from(new Map(connectedUsers.map((user) => [user.id, user])).values())

  const [currentPlanet, connectedPlanets] = await Promise.all([
    serializePlanet(currentUser, ownCommunityIds),
    Promise.all(uniqueConnectedUsers.map((user) => serializePlanet(user, ownCommunityIds))),
  ])

  return Response.json({
    currentPlanet,
    planets: connectedPlanets.filter(Boolean),
  })
}
