import type { PlanetProfile } from '@/types/planet'

/**
 * Maps personality tags to planet texture files in /public/textures/.
 * Textures sourced from Solar System Scope (CC BY 4.0).
 */

export const PLANET_TEXTURE_OPTIONS = [
  { file: 'earth_day.jpg', label: 'Earth', tone: 'living / rooted' },
  { file: 'mars.jpg', label: 'Mars', tone: 'active / nomadic' },
  { file: 'mercury.jpg', label: 'Mercury', tone: 'precise / quiet' },
  { file: 'moon.jpg', label: 'Moon', tone: 'night / minimal' },
  { file: 'neptune.jpg', label: 'Neptune', tone: 'deep / reflective' },
  { file: 'venus_surface.jpg', label: 'Venus', tone: 'warm / sensory' },
  { file: 'jupiter.jpg', label: 'Jupiter', tone: 'storm / expansive' },
] as const

const TAG_TO_TEXTURE: Record<string, string> = {
  melancholic:   'jupiter.jpg',
  solitary:      'mercury.jpg',
  adventurous:   'mars.jpg',
  curious:       'mars.jpg',
  empathy:       'earth_day.jpg',
  dreamer:       'earth_day.jpg',
  reflective:    'neptune.jpg',
  thinker:       'neptune.jpg',
  energetic:     'venus_surface.jpg',
  trailblazer:   'venus_surface.jpg',
  observer:      'mercury.jpg',
  'night owl':   'mercury.jpg',
  calm:           'earth_day.jpg',
  intense:        'mars.jpg',
  cold:           'mercury.jpg',
  mixed:          'neptune.jpg',
  fluid:          'venus_surface.jpg',
  dense:          'neptune.jpg',
  fractured:      'jupiter.jpg',
  minimal:        'mercury.jpg',
  communal:       'earth_day.jpg',
  rooted:         'earth_day.jpg',
  nomadic:        'mars.jpg',
  'night & silence':       'moon.jpg',
  memory:                  'earth_day.jpg',
  'dream logic':           'neptune.jpg',
  'emotional texture':     'venus_surface.jpg',
  'inner structure':       'mercury.jpg',
  'visual sensation':      'venus_surface.jpg',
  'solitude & connection': 'earth_day.jpg',
}

const DEFAULT_TEXTURE = 'neptune.jpg'

function isKnownTexture(file: string | undefined): file is string {
  return !!file && PLANET_TEXTURE_OPTIONS.some((option) => option.file === file)
}

/**
 * Resolve a texture filename from personality tags / core themes / mood.
 * Walks the tags looking for the first match, falls back to moon.jpg.
 */
export function getTextureFile(tags: string[]): string {
  const normalised = tags.map((t) => t.toLowerCase().trim())
  for (const tag of normalised) {
    if (TAG_TO_TEXTURE[tag]) return TAG_TO_TEXTURE[tag]
    // Also check if the tag *contains* a keyword (e.g. "night owl writer")
    for (const [keyword, file] of Object.entries(TAG_TO_TEXTURE)) {
      if (tag.includes(keyword)) return file
    }
  }
  return DEFAULT_TEXTURE
}

export function resolvePlanetTexture(planet: Pick<PlanetProfile, 'mood' | 'lifestyle' | 'coreThemes' | 'visual'>): string {
  const selected = planet.visual.textureFile
  return isKnownTexture(selected) ? selected : getTextureFile([planet.mood, planet.lifestyle, ...planet.coreThemes])
}

/**
 * Derive a glow color from a planet's coreColor or default to a violet hue.
 */
export function getDefaultGlowColor(coreColor?: string): string {
  return coreColor ?? '#a78bfa'
}
