import { prisma } from '@/lib/prisma'
import { resolveUserPlanetConfig, USER_PLANET_CONFIG_SELECT } from '@/lib/user-planet-config'
import type { StarMapSelfPlanet } from '@/types/star-map'

/** Only the authenticated owner's live, active planet. Never part of collection counts. */
export async function personalMapSelf(userId: string): Promise<StarMapSelfPlanet | null> {
  const planet = await prisma.planet.findFirst({
    where: { userId, active: true, user: { deletedAt: null } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true, name: true, mood: true, lifestyle: true, coreThemes: true, visual: true, user: { select: { name: true, image: true, userLevel: true, ...USER_PLANET_CONFIG_SELECT } } },
  })
  if (!planet) return null
  return { avatarUrl: planet.user.planetCustomTexture || planet.user.image, displayName: planet.user.name, id: planet.id, name: planet.name, href: `/planet/${encodeURIComponent(planet.id)}`, level: planet.user.userLevel, planetConfig: resolveUserPlanetConfig(planet.user, planet) ?? undefined }
}
