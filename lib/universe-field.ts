import { resolvePlanetTexture } from '@/lib/planet-textures'
import type { PlanetConfig, PlanetProfile, PlanetVisualConfig } from '@/types/planet'

// Shape returned by GET /api/universe
export interface UniversePlanet {
  id: string
  name: string
  avatarSymbol: string
  tagline: string | null
  mood: string
  style: string
  lifestyle: string
  coreThemes: string[]
  visual: PlanetVisualConfig | Record<string, unknown>
  abstractAxis: number
  introspectiveAxis: number
  planetConfig?: PlanetConfig | null
}

// --- Universe field: planet positions (% within the field container) ---------
// Grouped near their thematic galaxy zones.
export const UNIVERSE_PLANET_POSITIONS = [
  // Zone 1  -  contemplative cluster (top-left: introspection, slow thought)
  { id: 'p-aelion',   x: 12, y: 18, size: 72, depth: 1.00 },
  { id: 'p-noctaris', x: 25, y: 44, size: 42, depth: 0.65 },
  { id: 'p-vaelith',  x:  9, y: 62, size: 54, depth: 0.82 },
  // Zone 2  -  technical cluster (top-right: systems, building)
  { id: 'p-kindus',   x: 70, y: 14, size: 64, depth: 0.92 },
  { id: 'p-novaxis',  x: 84, y: 34, size: 58, depth: 0.86 },
  { id: 'p-spirax',   x: 62, y: 50, size: 40, depth: 0.60 },
  // Zone 3  -  emotional/warm cluster (center-bottom)
  { id: 'p-elarith',  x: 44, y: 58, size: 66, depth: 0.94 },
  { id: 'p-orbalin',  x: 56, y: 76, size: 52, depth: 0.76 },
  { id: 'p-calenvix', x: 36, y: 82, size: 78, depth: 1.00 },
  // Zone 4  -  nomadic/wandering cluster (bottom edges)
  { id: 'p-driftan',  x: 18, y: 82, size: 56, depth: 0.84 },
  { id: 'p-lumira',   x: 76, y: 72, size: 70, depth: 0.96 },
  // Free-drifting
  { id: 'p-sorvae',   x: 42, y: 22, size: 50, depth: 0.78 },
] as const

export const NEBULA_ZONES = [
  { id: 'contemplative', labelKey: 'nebulaContemplative', x: 14, y: 35, color: '#a78bfa', size: 340, galaxySlug: 'slow-thinkers' },
  { id: 'technical',     labelKey: 'nebulaTechnical', x: 72, y: 30, color: '#60a5fa', size: 290, galaxySlug: 'signal-noise'  },
  { id: 'emotional',     labelKey: 'nebulaEmotional', x: 46, y: 68, color: '#f9a8d4', size: 320, galaxySlug: 'warm-frequency' },
  { id: 'wandering',     labelKey: 'nebulaWandering', x: 19, y: 76, color: '#34d399', size: 240, galaxySlug: 'threshold-states' },
] as const

export const ORBIT_PATHS = [
  { d: 'M 9 23 C 22 5, 48 9, 70 18 S 93 51, 76 69', color: '#a78bfa', opacity: 0.32 },
  { d: 'M 17 78 C 29 59, 44 50, 62 51 S 82 58, 86 35', color: '#60a5fa', opacity: 0.26 },
  { d: 'M 35 82 C 39 68, 49 58, 56 75 S 70 86, 76 72', color: '#f9a8d4', opacity: 0.34 },
  { d: 'M 12 18 C 20 42, 26 58, 45 58 S 62 49, 70 14', color: '#34d399', opacity: 0.22 },
] as const

export function universePlanetToProfile(p: UniversePlanet): PlanetProfile {
  const v = (p.visual && typeof p.visual === 'object') ? p.visual as PlanetVisualConfig : {
    coreColor: '#a78bfa', accentColor: '#6366f1',
    ringStyle: 'none' as const, surfaceStyle: 'smooth' as const,
    satelliteCount: 1, size: 'md' as const,
  }
  const profile: PlanetProfile = {
    id: p.id,
    name: p.name,
    avatarSymbol: p.avatarSymbol,
    tagline: p.tagline ?? undefined,
    role: 'explorer' as const,
    mood: (p.mood as PlanetProfile['mood']) || 'calm',
    style: (p.style as PlanetProfile['style']) || 'minimal',
    lifestyle: (p.lifestyle as PlanetProfile['lifestyle']) || 'solitary',
    coreThemes: p.coreThemes,
    contentFragments: [],
    visual: v,
    cognitiveAxes: { abstract: p.abstractAxis, introspective: p.introspectiveAxis },
    emotionalBars: [],
    createdAt: '',
    userId: '',
    planetConfig: p.planetConfig ?? undefined,
  }
  profile.visual = { ...profile.visual, textureFile: resolvePlanetTexture(profile) }
  return profile
}

/** Maps real API planets onto as many zone-layout slots as there are real planets — no mock backfill. */
export function buildRealPositionedPlanets(apiPlanets: UniversePlanet[]) {
  return apiPlanets.slice(0, UNIVERSE_PLANET_POSITIONS.length).map((planet, i) => ({
    position: UNIVERSE_PLANET_POSITIONS[i],
    planet: universePlanetToProfile(planet),
  }))
}
