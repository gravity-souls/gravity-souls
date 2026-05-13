import { resolvePlanetHasRing, resolvePlanetTexture } from '@/lib/planet-textures'
import type { PlanetConfig, PlanetProfile } from '@/types/planet'

export const DEFAULT_PLANET_VISUAL: PlanetProfile['visual'] = {
  coreColor: '#a78bfa',
  accentColor: '#c4b5fd',
  ringStyle: 'single',
  surfaceStyle: 'smooth',
  satelliteCount: 1,
  size: 'lg',
}

export interface UserPlanetConfigSource {
  planetTexture?: string | null
  planetTint?: string | null
  planetAtmoColor?: string | null
  planetAtmoDensity?: number | null
  planetHasRing?: boolean | null
  planetRingColor?: string | null
  planetRotationSpeed?: number | null
  planetCloudOpacity?: number | null
  planetCustomTexture?: string | null
}

export interface PlanetVisualSource {
  mood: string
  lifestyle: string
  coreThemes: string[]
  visual: unknown
}

export function normalizePlanetVisual(value: unknown): PlanetProfile['visual'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_PLANET_VISUAL
  return { ...DEFAULT_PLANET_VISUAL, ...(value as Partial<PlanetProfile['visual']>) }
}

export function planetConfigFromUser(source: UserPlanetConfigSource | null | undefined): PlanetConfig | null {
  if (!source) return null

  return {
    baseTexture: source.planetTexture ?? 'jupiter.jpg',
    tintColor: source.planetTint ?? '#7c4dbf',
    atmosphereColor: source.planetAtmoColor ?? '#b39ddb',
    atmosphereDensity: source.planetAtmoDensity ?? 0.12,
    hasRing: source.planetHasRing ?? false,
    ringColor: source.planetRingColor ?? '#9b7de0',
    rotationSpeed: source.planetRotationSpeed ?? 0.018,
    cloudOpacity: source.planetCloudOpacity ?? 0,
    customTextureUrl: source.planetCustomTexture ?? undefined,
  }
}

export function planetConfigFromVisual(planet: PlanetVisualSource): PlanetConfig {
  const visual = normalizePlanetVisual(planet.visual)

  return {
    baseTexture: resolvePlanetTexture({
      mood: planet.mood as PlanetProfile['mood'],
      lifestyle: planet.lifestyle as PlanetProfile['lifestyle'],
      coreThemes: planet.coreThemes,
      visual,
    }),
    tintColor: visual.coreColor,
    atmosphereColor: visual.accentColor,
    atmosphereDensity: 0.12,
    hasRing: resolvePlanetHasRing(),
    ringColor: visual.accentColor,
    rotationSpeed: 0.018,
    cloudOpacity: 0,
    customTextureUrl: undefined,
  }
}

export function resolveUserPlanetConfig(
  user: UserPlanetConfigSource | null | undefined,
  planet?: PlanetVisualSource | null,
): PlanetConfig | null {
  return planetConfigFromUser(user) ?? (planet ? planetConfigFromVisual(planet) : null)
}