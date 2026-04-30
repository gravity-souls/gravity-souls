import type { PlanetProfile, ResonancePlanet, ResonanceType, BeamColor } from '@/types/planet'
import type {
  OrbitMatch, OrbitReasonKey, OrbitColor, MatchDimensions,
  RelationshipType, ResonanceSession,
} from '@/types/match'

// --- Scoring weights ----------------------------------------------------------

const MOOD_DISTANCE: Record<string, Record<string, number>> = {
  calm:        { calm: 0, melancholic: 1, mixed: 2, intense: 3, cold: 2 },
  melancholic: { melancholic: 0, calm: 1, mixed: 2, cold: 2, intense: 3 },
  intense:     { intense: 0, mixed: 1, cold: 1, calm: 3, melancholic: 3 },
  cold:        { cold: 0, intense: 1, mixed: 2, calm: 2, melancholic: 2 },
  mixed:       { mixed: 0, calm: 1, melancholic: 1, intense: 1, cold: 2 },
}

const LIFESTYLE_COMPLEMENT: Record<string, string> = {
  solitary:  'communal',
  communal:  'solitary',
  nomadic:   'rooted',
  rooted:    'nomadic',
}

const BEAM_COLOR_FOR_TYPE: Record<ResonanceType, BeamColor> = {
  emotion:   'violet',
  interest:  'teal',
  thought:   'amber',
  lifestyle: 'blue',
}

// --- Scoring ------------------------------------------------------------------

function scoreThemeOverlap(a: string[], b: string[]): number {
  const setB = new Set(b)
  return a.filter((t) => setB.has(t)).length
}

function dominantResonanceType(
  themeOverlap: number,
  moodDist: number,
  lifestyleComplement: boolean,
  cogDiff: number,
): ResonanceType {
  if (themeOverlap >= 2) return 'interest'
  if (moodDist <= 1)     return 'emotion'
  if (lifestyleComplement) return 'lifestyle'
  if (cogDiff < 20)      return 'thought'
  return 'interest'
}

interface ScoredPlanet {
  planet:    PlanetProfile
  score:     number
  resType:   ResonanceType
}

function scorePair(source: PlanetProfile, candidate: PlanetProfile): ScoredPlanet {
  const moodDist        = MOOD_DISTANCE[source.mood]?.[candidate.mood] ?? 3
  const themeOverlap    = scoreThemeOverlap(source.coreThemes, candidate.coreThemes)
  const lifestyleMatch  = candidate.lifestyle === source.lifestyle
  const lifestyleComp   = candidate.lifestyle === LIFESTYLE_COMPLEMENT[source.lifestyle]
  const cogDiff         = Math.abs(source.cognitiveAxes.abstract - candidate.cognitiveAxes.abstract)
  const introDiff       = Math.abs(source.cognitiveAxes.introspective - candidate.cognitiveAxes.introspective)

  const score =
    (3 - moodDist) * 20 +         // 0–60  (mood closeness)
    themeOverlap * 15 +            // 0–60  (shared themes)
    (lifestyleMatch ? 10 : 0) +    // 0–10  (same lifestyle)
    (lifestyleComp  ? 8  : 0) +    // 0–8   (complementary lifestyle)
    Math.max(0, 20 - cogDiff / 5) +// 0–20  (cognitive proximity)
    Math.max(0, 10 - introDiff / 10) // 0–10 (introspection proximity)

  const resType = dominantResonanceType(themeOverlap, moodDist, lifestyleComp, cogDiff)
  return { planet: candidate, score: Math.min(100, Math.round(score)), resType }
}

// --- Public API ---------------------------------------------------------------

/**
 * Given a planet profile and a list of candidates, returns up to `limit`
 * `ResonancePlanet` objects sorted by resonance score descending.
 */
export function getResonanceMatches(
  source: PlanetProfile,
  candidates: PlanetProfile[],
  limit = 4,
): ResonancePlanet[] {
  return candidates
    .filter((c) => c.id !== source.id)
    .map((c) => scorePair(source, c))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ planet, score, resType }) => ({
      id:            planet.id,
      name:          planet.name,
      avatarSymbol:  planet.avatarSymbol,
      coreColor:     planet.visual.coreColor,
      resonanceType: resType,
      beamColor:     BEAM_COLOR_FOR_TYPE[resType],
      strength:      score,
      tagline:       planet.tagline,
    }))
}

// --- Rich orbit match builder -------------------------------------------------

const ORBIT_COLOR_HEX: Record<OrbitColor, string> = {
  blue:   '#60a5fa',
  purple: '#a78bfa',
  red:    '#f87171',
  green:  '#34d399',
  gold:   '#fbbf24',
  orange: '#fb923c',
}

function intersect<T>(a: T[] | undefined, b: T[] | undefined): T[] {
  if (!a || !b) return []
  const setB = new Set(b)
  return a.filter((x) => setB.has(x))
}

function deriveOrbitReason(
  source: PlanetProfile,
  target: PlanetProfile,
  themeOverlap: number,
  moodDist: number,
  lifestyleComp: boolean,
): { primaryReason: OrbitReasonKey; orbitColor: OrbitColor } {
  const sharedCities = intersect(source.travelCities, target.travelCities).length > 0
  const sharedCulture = intersect(source.culturalTags, target.culturalTags).length > 0
  const sharedArts = (
    intersect(source.musicTaste, target.musicTaste).length > 0 ||
    intersect(source.bookTaste,  target.bookTaste).length  > 0 ||
    intersect(source.filmTaste,  target.filmTaste).length  > 0
  )
  const expressionMatch =
    source.communicationStyle &&
    target.communicationStyle &&
    source.communicationStyle === target.communicationStyle

  if (themeOverlap >= 2) return { primaryReason: 'shared-interest',      orbitColor: 'blue'   }
  if (moodDist <= 1)     return { primaryReason: 'emotional-theme',       orbitColor: 'red'    }
  if (expressionMatch)   return { primaryReason: 'expression-style',      orbitColor: 'purple' }
  if (sharedCities || sharedCulture)
                         return { primaryReason: 'culture-travel',        orbitColor: 'green'  }
  if (sharedArts)        return { primaryReason: 'art-books-music',       orbitColor: 'gold'   }
  if (lifestyleComp)     return { primaryReason: 'worldview-complement',  orbitColor: 'orange' }
  if (themeOverlap >= 1) return { primaryReason: 'shared-interest',       orbitColor: 'blue'   }
  return                        { primaryReason: 'worldview-complement',  orbitColor: 'orange' }
}

function deriveDimensions(
  source: PlanetProfile,
  target: PlanetProfile,
  themeOverlap: number,
  moodDist: number,
): MatchDimensions {
  const cogDiff   = Math.abs(source.cognitiveAxes.abstract - target.cognitiveAxes.abstract)
  const introDiff = Math.abs(source.cognitiveAxes.introspective - target.cognitiveAxes.introspective)

  const culturalOverlap = intersect(source.culturalTags, target.culturalTags).length
  const cityOverlap     = intersect(source.travelCities, target.travelCities).length
  const musicOverlap    = intersect(source.musicTaste,   target.musicTaste).length
  const bookOverlap     = intersect(source.bookTaste,    target.bookTaste).length
  const filmOverlap     = intersect(source.filmTaste,    target.filmTaste).length

  return {
    interests:  Math.min(100, themeOverlap * 25 + 10),
    expression: Math.min(100, Math.max(0, 80 - cogDiff - introDiff / 2)),
    emotion:    Math.min(100, Math.max(0, 80 - moodDist * 22)),
    culture:    Math.min(100, (culturalOverlap * 18) + (cityOverlap * 22)),
    arts:       Math.min(100, (musicOverlap + bookOverlap + filmOverlap) * 20),
    worldview:  source.lifestyle !== target.lifestyle ? 72 : 40,
  }
}

const RESONANCE_NOTES = {
  'shared-interest':      (a, b) => `${a.name} and ${b.name} orbit the same interior territory.`,
  'emotional-theme':      () => `Their emotional frequencies hum at the same register.`,
  'expression-style':     () => `How they speak is almost the same. What they say diverges beautifully.`,
  'culture-travel':       () => `They have stood in the same cities and wondered the same things.`,
  'art-books-music':      () => `The art that moves them is the same art. That is rarely coincidence.`,
  'worldview-complement': (a, b) => `Where ${a.name} ends, ${b.name} begins. A productive gravity.`,
} satisfies Record<OrbitReasonKey, (...planets: PlanetProfile[]) => string>

function deriveSimilarities(source: PlanetProfile, target: PlanetProfile): string[] {
  const results: string[] = []
  const themes  = intersect(source.coreThemes, target.coreThemes)
  const cities  = intersect(source.travelCities, target.travelCities)
  const culture = intersect(source.culturalTags, target.culturalTags)
  const music   = intersect(source.musicTaste, target.musicTaste)
  const books   = intersect(source.bookTaste, target.bookTaste)
  const films   = intersect(source.filmTaste, target.filmTaste)

  if (themes.length > 0)
    results.push(`Shared themes: ${themes.slice(0, 2).join(' & ')}`)
  if (source.mood === target.mood)
    results.push(`Same emotional register  -  both ${source.mood}`)
  if (cities.length > 0)
    results.push(`Both orbit ${cities.slice(0, 2).join(' and ')}`)
  if (culture.length > 0)
    results.push(`Shared touchstones: ${culture.slice(0, 2).join(', ')}`)
  if (music.length > 0)
    results.push(`Listening to the same sound: ${music[0]}`)
  if (books.length > 0)
    results.push(`Both read ${books[0]}`)
  if (films.length > 0)
    results.push(`Both hold ${films[0]} somewhere close`)

  return results.slice(0, 4)
}

function deriveDifferences(source: PlanetProfile, target: PlanetProfile): string[] {
  const results: string[] = []
  const LIFESTYLE_LABEL: Record<string, string> = {
    solitary: 'solitary', communal: 'communal', nomadic: 'nomadic', rooted: 'rooted',
  }
  if (source.lifestyle !== target.lifestyle)
    results.push(
      `You are ${LIFESTYLE_LABEL[source.lifestyle] ?? source.lifestyle}; they are ${LIFESTYLE_LABEL[target.lifestyle] ?? target.lifestyle}  -  complementary pull`,
    )
  const cogDiff = Math.abs(source.cognitiveAxes.abstract - target.cognitiveAxes.abstract)
  if (cogDiff > 25)
    results.push(`Different cognitive mode: one maps abstractions, one anchors in the concrete`)
  if (source.communicationStyle && target.communicationStyle && source.communicationStyle !== target.communicationStyle)
    results.push(`Communication style contrast: ${source.communicationStyle} meets ${target.communicationStyle}`)
  if (source.mood !== target.mood)
    results.push(`Mood offset  -  ${source.mood} encountering ${target.mood} creates productive friction`)
  return results.slice(0, 3)
}

function deriveSuggestedTypes(
  score: number,
  primaryReason: OrbitReasonKey,
): RelationshipType[] {
  const types: RelationshipType[] = []
  if (score >= 60) types.push('friendship')
  if (primaryReason === 'emotional-theme' || primaryReason === 'expression-style')
    types.push('deep-conversation')
  if (primaryReason === 'shared-interest')
    types.push('activity-buddy')
  if (primaryReason === 'culture-travel')
    types.push('community-companion')
  if (types.length === 0) types.push('chat')
  return types.slice(0, 3)
}

/**
 * Builds rich `OrbitMatch[]` from a source planet against a candidate pool.
 * Returns up to `limit` matches sorted by resonance score descending.
 */
export function buildOrbitMatches(
  source: PlanetProfile,
  candidates: PlanetProfile[],
  limit = 5,
): OrbitMatch[] {
  return candidates
    .filter((c) => c.id !== source.id)
    .map((target) => {
      const moodDist      = MOOD_DISTANCE[source.mood]?.[target.mood] ?? 3
      const themeOverlap  = scoreThemeOverlap(source.coreThemes, target.coreThemes)
      const lifestyleComp = target.lifestyle === LIFESTYLE_COMPLEMENT[source.lifestyle]
      const cogDiff       = Math.abs(source.cognitiveAxes.abstract - target.cognitiveAxes.abstract)
      const introDiff     = Math.abs(source.cognitiveAxes.introspective - target.cognitiveAxes.introspective)
      const lifestyleMatch = target.lifestyle === source.lifestyle

      const rawScore =
        (3 - moodDist) * 20 +
        themeOverlap * 15 +
        (lifestyleMatch ? 10 : 0) +
        (lifestyleComp  ? 8  : 0) +
        Math.max(0, 20 - cogDiff / 5) +
        Math.max(0, 10 - introDiff / 10)
      const score = Math.min(100, Math.round(rawScore))

      const { primaryReason, orbitColor } = deriveOrbitReason(source, target, themeOverlap, moodDist, lifestyleComp)
      const dimensions = deriveDimensions(source, target, themeOverlap, moodDist)

      return {
        planetId:      target.id,
        score,
        orbitColor,
        primaryReason,
        dimensions,
        similarities:    deriveSimilarities(source, target),
        differences:     deriveDifferences(source, target),
        suggestedTypes:  deriveSuggestedTypes(score, primaryReason),
        resonanceNote:   RESONANCE_NOTES[primaryReason](source, target),
      } satisfies OrbitMatch
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Builds a full `ResonanceSession` for the given source planet.
 */
export function buildResonanceSession(
  source: PlanetProfile,
  candidates: PlanetProfile[],
): ResonanceSession {
  return {
    sourcePlanetId: source.id,
    matches:        buildOrbitMatches(source, candidates, 5),
    date:           new Date().toISOString().slice(0, 10),
  }
}

/** Hex value for a given orbit color */
export function orbitColorHex(color: OrbitColor): string {
  return ORBIT_COLOR_HEX[color]
}
