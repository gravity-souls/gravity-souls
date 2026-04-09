import type { PlanetProfile, Mood, PlanetStyle, Lifestyle, RingStyle, SurfaceStyle } from '@/types/planet'
import type { PlanetDraft } from '@/types/creation'
import { CLIMATE_OPTIONS } from '@/types/creation'

// ─── Climate → planet property mapping ───────────────────────────────────────

const CLIMATE_TO_MOOD: Record<string, Mood> = {
  calm:          'calm',
  melancholic:   'melancholic',
  introspective: 'melancholic',
  electric:      'intense',
  turbulent:     'intense',
  expansive:     'mixed',
}

const CLIMATE_TO_STYLE: Record<string, PlanetStyle> = {
  calm:          'minimal',
  melancholic:   'fractured',
  introspective: 'dense',
  electric:      'fluid',
  turbulent:     'fractured',
  expansive:     'fluid',
}

const CLIMATE_TO_RING: Record<string, RingStyle> = {
  calm:          'single',
  melancholic:   'broken',
  introspective: 'double',
  electric:      'double',
  turbulent:     'broken',
  expansive:     'single',
}

const CLIMATE_TO_SURFACE: Record<string, SurfaceStyle> = {
  calm:          'smooth',
  melancholic:   'cracked',
  introspective: 'nebulous',
  electric:      'crystalline',
  turbulent:     'cracked',
  expansive:     'nebulous',
}

// ─── Lifestyle → satellite count ──────────────────────────────────────────────

const LIFESTYLE_TO_SATELLITES: Record<Lifestyle, number> = {
  solitary: 1,
  rooted:   2,
  nomadic:  3,
  communal: 4,
}

// ─── Name generation (seed-stable) ───────────────────────────────────────────

const PLANET_NAME_BASES = [
  'Veloth', 'Kyndra', 'Sorvael', 'Elaris', 'Driftus',
  'Noctar', 'Lumivex', 'Orbalin', 'Spirax', 'Calenv',
  'Aelion', 'Vaelith', 'Solvara', 'Noctis', 'Lumira',
]

const AVATAR_SYMBOLS = ['⊙', '◉', '◈', '◎', '◍', '⊛', '○', '◌', '⊕', '◑', '◐', '◆']

function seedFromId(id: string): number {
  return id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
}

function generatePlanetName(userId: string): string {
  const seed = seedFromId(userId)
  const base   = PLANET_NAME_BASES[seed % PLANET_NAME_BASES.length]
  const suffix = (seed % 90) + 10
  return `${base}-${suffix}`
}

function generateAvatarSymbol(userId: string): string {
  const seed = seedFromId(userId)
  return AVATAR_SYMBOLS[seed % AVATAR_SYMBOLS.length]
}

// ─── Emotional bar derivation ─────────────────────────────────────────────────

function deriveEmotionalBars(draft: PlanetDraft) {
  const intro   = draft.introspectiveAxis
  const climate = draft.climateKey ?? 'calm'
  const warmth  = climate === 'electric' ? 85 : climate === 'turbulent' ? 72 : climate === 'calm' ? 38 : climate === 'expansive' ? 62 : 50
  const clarity = draft.abstractAxis > 60 ? 38 : 75

  return [
    { label: 'Depth',     value: intro,   color: '#a78bfa' },
    { label: 'Warmth',    value: warmth,  color: '#f97316' },
    { label: 'Clarity',   value: clarity, color: '#60a5fa' },
    { label: 'Resonance', value: 65,      color: '#34d399' },
  ]
}

// ─── Tagline derivation ───────────────────────────────────────────────────────

function deriveTagline(draft: PlanetDraft): string {
  const climateLabel = CLIMATE_OPTIONS.find((c) => c.key === draft.climateKey)?.description
  if (climateLabel) return climateLabel
  if (draft.selectedThemes.length > 0) return `Orbits ${draft.selectedThemes[0]} and what surrounds it.`
  return 'A world in formation.'
}

// ─── Reverse mapping: PlanetProfile → PlanetDraft ────────────────────────────

const MOOD_TO_CLIMATE: Record<Mood, string> = {
  calm:        'calm',
  melancholic: 'melancholic',
  intense:     'electric',
  cold:        'introspective',
  mixed:       'expansive',
}

/**
 * Convert a saved PlanetProfile back to a PlanetDraft for editing.
 * Used by the settings page to pre-fill the form.
 */
export function planetProfileToDraft(planet: PlanetProfile): PlanetDraft {
  return {
    climateKey:         MOOD_TO_CLIMATE[planet.mood] ?? 'calm',
    selectedThemes:     planet.coreThemes,
    lifestyle:          planet.lifestyle,
    communicationStyle: planet.communicationStyle,
    abstractAxis:       planet.cognitiveAxes.abstract,
    introspectiveAxis:  planet.cognitiveAxes.introspective,
    location:           planet.location,
    languages:          planet.languages ?? [],
    travelCities:       planet.travelCities ?? [],
    culturalTags:       planet.culturalTags ?? [],
    matchPreference:    planet.matchPreference,
    connectionTypes:    [],  // not stored on profile currently
  }
}

// ─── Main builder: PlanetDraft → PlanetProfile ────────────────────────────────

/**
 * Converts 5-step onboarding draft into a full PlanetProfile.
 * Deterministic: same draft + userId → same planet name + symbol.
 * Called on every draft change for live preview, and on final save.
 */
export function buildPlanetFromDraft(draft: PlanetDraft, userId: string): PlanetProfile {
  const climateKey = draft.climateKey ?? 'calm'
  const climate    = CLIMATE_OPTIONS.find((c) => c.key === climateKey)
  const coreColor  = climate?.coreColor  ?? '#a78bfa'
  const accentColor = climate?.accentColor ?? '#c4b5fd'

  const lifestyle     = draft.lifestyle    ?? 'solitary'
  const satellites    = LIFESTYLE_TO_SATELLITES[lifestyle]
  const themes        = draft.selectedThemes.length > 0
    ? draft.selectedThemes
    : ['inner drift']

  // Content fragments: derive from themes for the preview
  const contentFragments = themes.slice(0, 3).map((t) => `Drawn to ${t}.`)

  return {
    id:           userId,
    name:         generatePlanetName(userId),
    avatarSymbol: generateAvatarSymbol(userId),
    tagline:      deriveTagline(draft),
    role:         'resonator',
    mood:         CLIMATE_TO_MOOD[climateKey]   ?? 'mixed',
    style:        CLIMATE_TO_STYLE[climateKey]  ?? 'fluid',
    lifestyle,
    coreThemes:   themes,
    contentFragments,

    visual: {
      coreColor,
      accentColor,
      ringStyle:      CLIMATE_TO_RING[climateKey]    as RingStyle    ?? 'single',
      surfaceStyle:   CLIMATE_TO_SURFACE[climateKey] as SurfaceStyle ?? 'smooth',
      satelliteCount: satellites,
      size:           'lg',
    },

    cognitiveAxes: {
      abstract:      draft.abstractAxis,
      introspective: draft.introspectiveAxis,
    },

    emotionalBars: deriveEmotionalBars(draft),

    // Extended fields
    communicationStyle: draft.communicationStyle,
    location:           draft.location,
    languages:          draft.languages.length > 0 ? draft.languages : undefined,
    travelCities:       draft.travelCities.length > 0 ? draft.travelCities : undefined,
    culturalTags:       draft.culturalTags.length > 0 ? draft.culturalTags : undefined,
    matchPreference:    draft.matchPreference,
    activeStatus:       'active',

    createdAt: new Date().toISOString(),
    userId,
  }
}
