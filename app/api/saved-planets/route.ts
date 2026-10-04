import { z } from 'zod'
import { readJson, safeApiError } from '@/lib/api-input'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import {
  resolveUserPlanetConfig,
  USER_PLANET_CONFIG_SELECT,
} from '@/lib/user-planet-config'
import { canViewProfile } from '@/lib/visibility'

// GET /api/saved-planets — return the authenticated user's saved planets (newest first)
export async function GET() {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const savedPlanets = await prisma.savedPlanet.findMany({
    where: {
      userId: session.user.id,
      planet: { active: true, user: { deletedAt: null } },
    },
    orderBy: { savedAt: 'desc' },
    include: {
      planet: {
        select: {
          id: true,
          userId: true,
          name: true,
          avatarSymbol: true,
          tagline: true,
          mood: true,
          lifestyle: true,
          coreThemes: true,
          visual: true,
          user: { select: USER_PLANET_CONFIG_SELECT },
        },
      },
    },
  })

  const visibility = await Promise.all(
    savedPlanets.map(({ planet }) =>
      canViewProfile(session.user.id, planet.userId),
    ),
  )
  return NextResponse.json({
    savedPlanets: savedPlanets
      .filter((_, index) => visibility[index])
      .map(({ planet, ...saved }) => {
        const { user, ...planetData } = planet
        return {
          ...saved,
          planet: {
            ...planetData,
            planetConfig: resolveUserPlanetConfig(user, planet),
          },
        }
      }),
  })
}

// POST /api/saved-planets — save a planet for the authenticated user (idempotent, always 200)
export async function POST(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  try {
    const input = await readJson(
      request,
      z.object({ planetId: z.string().min(1).max(100) }).strict(),
    )
    if (!input.ok) return input.response
    const { planetId } = input.data
    const planet = await prisma.planet.findFirst({
      where: { id: planetId, active: true, user: { deletedAt: null } },
    })
    if (!planet || !(await canViewProfile(session.user.id, planet.userId)))
      return NextResponse.json({ error: 'Planet not found' }, { status: 404 })
    if (planet.userId === session.user.id)
      return NextResponse.json(
        { error: 'Cannot save your own planet' },
        { status: 400 },
      )

    const saved = await prisma.savedPlanet.upsert({
      where: { userId_planetId: { userId: session.user.id, planetId } },
      create: { userId: session.user.id, planetId },
      update: {},
    })

    return NextResponse.json(saved)
  } catch (error) {
    return safeApiError(error)
  }
}
