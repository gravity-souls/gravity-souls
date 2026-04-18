import type { Universe, EmotionTone, ExpressionStyle } from '@/types/universe'
import type { PlanetProfile, Mood, PlanetStyle, Lifestyle, RingStyle, SurfaceStyle } from '@/types/planet'

// --- Storage keys -------------------------------------------------------------

const USER_ID_KEY = 'gravitysoul_user_id'

export function sbtiStorageKey(userId: string): string {
  return `gravitysoul_sbti_${userId}`
}

export function universeStorageKey(userId: string): string {
  return `gravitysoul_universe_${userId}`
}

export function planetStorageKey(userId: string): string {
  return `gravitysoul_planet_${userId}`
}

export interface StoredSbtiResult {
  typeCode: string
  typeCn: string
  patternString: string
  scores: Record<string, 'L' | 'M' | 'H'>
  confidencePercent: number
  completedAt: string
}

// --- Pseudo-auth --------------------------------------------------------------

export function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    // usr_ + 9 random alphanumeric chars  -  no external dependency needed
    id = 'usr_' + Math.random().toString(36).slice(2, 11)
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

// --- StoredUniverse -----------------------------------------------------------

export interface StoredUniverse extends Universe {
  expression: string
  mood: string | null
  createdAt: string
}

// --- Universe builder ---------------------------------------------------------

const COSMIC_NAMES = [
  'Velara', 'Kyndris', 'Sorvan', 'Elarethos', 'Driftmere',
  'Noctara', 'Lumivex', 'Orbalis', 'Spiraxis', 'Calenvast',
]

const MOOD_SYMBOL: Record<string, string> = {
  calm:          '○',
  turbulent:     '◎',
  expansive:     '◍',
  introspective: '⊙',
  electric:      '◉',
  melancholic:   '◈',
}

const MOOD_TO_TONE: Record<string, EmotionTone> = {
  electric:      'warm',
  turbulent:     'warm',
  expansive:     'playful',
  calm:          'cool',
  introspective: 'melancholic',
  melancholic:   'melancholic',
}

const MOOD_TO_DRIFT: Record<string, string> = {
  electric:      'outward',
  turbulent:     'outward',
  expansive:     'oscillating',
  calm:          'inward',
  introspective: 'inward',
  melancholic:   'spiral',
}

function detectStyle(text: string): ExpressionStyle {
  const t = text.toLowerCase()
  if (['data', 'system', 'logic', 'math', 'structure', 'proof'].some((w) => t.includes(w))) return 'analytical'
  if (['story', 'people', 'journey', 'told', 'happened', 'narrative'].some((w) => t.includes(w))) return 'narrative'
  if (['image', 'color', 'light', 'shadow', 'picture', 'see', 'dream', 'visual'].some((w) => t.includes(w))) return 'visual'
  return 'fragmented'
}

export function buildUniverseFromInput(
  expression: string,
  mood: string | null,
  userId: string,
): StoredUniverse {
  const moodKey = mood ?? 'introspective'
  // Derive a stable name from the userId so it doesn't change on reload
  const seed = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const nameBase = COSMIC_NAMES[seed % COSMIC_NAMES.length]
  const nameSuffix = (seed % 90) + 10  // 10–99

  const firstLine = expression.split(/[.!?\n]/)[0]?.trim() ?? ''

  return {
    id: userId,
    name: `${nameBase}-${nameSuffix}`,
    avatarSymbol:    MOOD_SYMBOL[moodKey] ?? '⊛',
    emotionTone:     MOOD_TO_TONE[moodKey] ?? 'neutral',
    expressionStyle: detectStyle(expression),
    driftDirection:  MOOD_TO_DRIFT[moodKey] ?? 'lateral',
    coreThemes:      detectThemes(expression),
    resonanceReason: 'Your origin universe. All resonances are mapped from here.',
    tagline:         firstLine.length > 80 ? firstLine.slice(0, 77) + '…' : firstLine,
    summary:         expression.length > 400 ? expression.slice(0, 397) + '…' : expression,
    expression,
    mood,
    createdAt: new Date().toISOString(),
  }
}

// --- Persistence --------------------------------------------------------------

export function saveUserUniverse(universe: StoredUniverse): void {
  const userId = getOrCreateUserId()
  localStorage.setItem(universeStorageKey(userId), JSON.stringify(universe))
}

export function getUserUniverse(): StoredUniverse | null {
  try {
    const userId = getOrCreateUserId()
    const raw = localStorage.getItem(universeStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as StoredUniverse
  } catch {
    return null
  }
}

// --- Planet persistence -------------------------------------------------------

export function savePlanetProfile(planet: PlanetProfile): void {
  const userId = getOrCreateUserId()
  localStorage.setItem(planetStorageKey(userId), JSON.stringify(planet))
}

export function getPlanetProfile(): PlanetProfile | null {
  try {
    const userId = getOrCreateUserId()
    const raw = localStorage.getItem(planetStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as PlanetProfile
  } catch {
    return null
  }
}

export function saveSbtiResult(result: StoredSbtiResult): void {
  const userId = getOrCreateUserId()
  localStorage.setItem(sbtiStorageKey(userId), JSON.stringify(result))
}

export function getSbtiResult(): StoredSbtiResult | null {
  try {
    const userId = getOrCreateUserId()
    const raw = localStorage.getItem(sbtiStorageKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as StoredSbtiResult
  } catch {
    return null
  }
}

// --- Role detection -----------------------------------------------------------

/** Returns 'resonator' if the user has saved a planet, 'explorer' otherwise */
export function getUserRole(): 'explorer' | 'resonator' {
  try {
    const userId = getOrCreateUserId()
    const hasPlanet = !!localStorage.getItem(planetStorageKey(userId))
    return hasPlanet ? 'resonator' : 'explorer'
  } catch {
    return 'explorer'
  }
}

// --- Planet builder -----------------------------------------------------------

const MOOD_TO_PLANET_MOOD: Record<string, Mood> = {
  calm:          'calm',
  introspective: 'melancholic',
  melancholic:   'melancholic',
  turbulent:     'intense',
  electric:      'intense',
  expansive:     'mixed',
}

const MOOD_TO_STYLE: Record<string, PlanetStyle> = {
  calm:          'minimal',
  introspective: 'dense',
  melancholic:   'fractured',
  turbulent:     'fractured',
  electric:      'fluid',
  expansive:     'fluid',
}

const MOOD_TO_LIFESTYLE: Record<string, Lifestyle> = {
  calm:          'rooted',
  introspective: 'solitary',
  melancholic:   'solitary',
  turbulent:     'nomadic',
  electric:      'communal',
  expansive:     'nomadic',
}

const MOOD_TO_RING: Record<string, RingStyle> = {
  calm:          'single',
  introspective: 'double',
  melancholic:   'broken',
  turbulent:     'broken',
  electric:      'double',
  expansive:     'single',
}

const MOOD_TO_SURFACE: Record<string, SurfaceStyle> = {
  calm:          'smooth',
  introspective: 'nebulous',
  melancholic:   'cracked',
  turbulent:     'cracked',
  electric:      'crystalline',
  expansive:     'nebulous',
}

const MOOD_CORE_COLOR: Record<string, string> = {
  calm:          '#60a5fa',
  introspective: '#a78bfa',
  melancholic:   '#818cf8',
  turbulent:     '#f97316',
  electric:      '#fbbf24',
  expansive:     '#34d399',
}

const MOOD_ACCENT_COLOR: Record<string, string> = {
  calm:          '#93c5fd',
  introspective: '#c4b5fd',
  melancholic:   '#6366f1',
  turbulent:     '#fb923c',
  electric:      '#fde68a',
  expansive:     '#6ee7b7',
}

const PLANET_NAMES = [
  'Veloth', 'Kyndra', 'Sorvael', 'Elaris', 'Driftus',
  'Noctar', 'Lumivex', 'Orbalin', 'Spirax', 'Calenv',
]

export function buildPlanetFromInput(
  expression: string,
  mood: string | null,
  userId: string,
): PlanetProfile {
  const moodKey = mood ?? 'introspective'
  const seed = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const nameBase = PLANET_NAMES[seed % PLANET_NAMES.length]
  const nameSuffix = (seed % 90) + 10

  const fragments = expression
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8)
    .slice(0, 6)

  const themes = detectThemes(expression)
  const abstract = Math.min(100, 40 + (themes.includes('dream logic') ? 20 : 0) + (themes.includes('inner structure') ? -10 : 0))
  const introspective = Math.min(100, 50 + (themes.includes('night & silence') ? 15 : 0) + (themes.includes('solitude & connection') ? 10 : 0))

  return {
    id:           userId,
    name:         `${nameBase}-${nameSuffix}`,
    avatarSymbol: MOOD_SYMBOL[moodKey] ?? '⊛',
    tagline:      (expression.split(/[.!?\n]/)[0]?.trim() ?? '').slice(0, 80),
    role:         'resonator',
    mood:         MOOD_TO_PLANET_MOOD[moodKey] ?? 'mixed',
    style:        MOOD_TO_STYLE[moodKey] ?? 'fluid',
    lifestyle:    MOOD_TO_LIFESTYLE[moodKey] ?? 'nomadic',
    coreThemes:   themes,
    contentFragments: fragments.length > 0 ? fragments : [expression.slice(0, 120)],
    visual: {
      coreColor:      MOOD_CORE_COLOR[moodKey] ?? '#a78bfa',
      accentColor:    MOOD_ACCENT_COLOR[moodKey] ?? '#6366f1',
      ringStyle:      MOOD_TO_RING[moodKey] as RingStyle ?? 'single',
      surfaceStyle:   MOOD_TO_SURFACE[moodKey] as SurfaceStyle ?? 'smooth',
      satelliteCount: Math.min(4, themes.length),
      size:           'lg',
    },
    cognitiveAxes: { abstract, introspective },
    emotionalBars: [
      { label: 'Depth',      value: introspective,            color: '#a78bfa' },
      { label: 'Warmth',     value: moodKey === 'calm' ? 40 : moodKey === 'electric' ? 85 : 55, color: '#f97316' },
      { label: 'Clarity',    value: abstract > 60 ? 35 : 70,  color: '#60a5fa' },
      { label: 'Resonance',  value: 65,                        color: '#34d399' },
    ],
    createdAt: new Date().toISOString(),
    userId,
  }
}

// --- helpers (re-used from universe builder  -  kept local) ---------------------

function detectThemes(text: string): string[] {
  const t = text.toLowerCase()
  const themes: string[] = []
  if (['night', 'dark', '3am', 'sleep', 'quiet', 'silence'].some((w) => t.includes(w))) themes.push('night & silence')
  if (['memory', 'remember', 'past', 'forget', 'once'].some((w) => t.includes(w)))       themes.push('memory')
  if (['dream', 'imagine', 'vision', 'floating'].some((w) => t.includes(w)))              themes.push('dream logic')
  if (['feel', 'feeling', 'emotion', 'sense', 'heart'].some((w) => t.includes(w)))        themes.push('emotional texture')
  if (['light', 'shadow', 'color', 'blur', 'haze'].some((w) => t.includes(w)))            themes.push('visual sensation')
  if (['system', 'logic', 'pattern', 'structure', 'rule'].some((w) => t.includes(w)))     themes.push('inner structure')
  if (['people', 'together', 'alone', 'other', 'us', 'we'].some((w) => t.includes(w)))    themes.push('solitude & connection')
  if (themes.length === 0) themes.push('inner drift', 'unformed thoughts')
  return themes.slice(0, 4)
}
