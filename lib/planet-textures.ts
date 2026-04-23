/**
 * Maps personality tags to planet texture files in /public/textures/.
 * Textures sourced from Solar System Scope (CC BY 4.0).
 */

const TAG_TO_TEXTURE: Record<string, string> = {
  melancholic:   'jupiter.jpg',
  solitary:      'jupiter.jpg',
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
}

const DEFAULT_TEXTURE = 'moon.jpg'

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

/**
 * Derive a glow color from a planet's coreColor or default to a violet hue.
 */
export function getDefaultGlowColor(coreColor?: string): string {
  return coreColor ?? '#a78bfa'
}
