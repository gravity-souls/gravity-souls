// --- Enum-like literal unions ----------------------------------------------

export type Mood        = 'calm' | 'melancholic' | 'intense' | 'cold' | 'mixed'
export type PlanetStyle = 'minimal' | 'dense' | 'fractured' | 'fluid'
export type Lifestyle   = 'solitary' | 'communal' | 'nomadic' | 'rooted'
export type RingStyle   = 'single' | 'double' | 'broken' | 'none'
export type SurfaceStyle = 'smooth' | 'cracked' | 'nebulous' | 'crystalline'
export type ResonanceType = 'emotion' | 'interest' | 'thought' | 'lifestyle'
export type BeamColor   = 'violet' | 'teal' | 'amber' | 'blue'

/** How a planet projects outward in conversation */
export type CommunicationStyle = 'direct' | 'poetic' | 'playful' | 'reflective' | 'analytical'

/** Active presence signal */
export type ActiveStatus = 'active' | 'drifting' | 'quiet'

// --- Exploration trace -----------------------------------------------------

export interface ExplorationTrace {
  /** Human label, e.g. "Deep thinkers" or "Night writers" */
  label: string
  /** Internal archetype slug, e.g. "melancholic-solitary" */
  planetType: string
  /** Number of recent interactions with this archetype */
  count: number
  /** Accent colour for the trace ring */
  color: string
  /** ISO timestamp of most recent interaction */
  recentAt: string
}

// --- Visual config ---------------------------------------------------------

export interface PlanetConfig {
  name?: string
  desc?: string
  baseTexture: string
  tintColor: string
  atmosphereColor: string
  atmosphereDensity: number
  /** Legacy compatibility field; rings are no longer supported. */
  hasRing: boolean
  ringColor: string
  rotationSpeed: number
  cloudOpacity: number
  customTextureUrl?: string
}

export const PRESET_PLANETS: PlanetConfig[] = [
  { name: 'Elaris',  baseTexture: 'jupiter.jpg',       tintColor: '#7c4dbf', atmosphereColor: '#b39ddb', atmosphereDensity: 0.12, hasRing: false,  ringColor: '', rotationSpeed: 0.018, cloudOpacity: 0, desc: 'The wandering deep thinker' },
  { name: 'Astraea', baseTexture: 'earth_day.jpg',     tintColor: '#2563eb', atmosphereColor: '#7dd3fc', atmosphereDensity: 0.12, hasRing: false, ringColor: '',        rotationSpeed: 0.018, cloudOpacity: 0.15, desc: 'The warm connector' },
  { name: 'Orionis', baseTexture: 'mars.jpg',          tintColor: '#c2410c', atmosphereColor: '#fdba74', atmosphereDensity: 0.1,  hasRing: false, ringColor: '',        rotationSpeed: 0.018, cloudOpacity: 0, desc: 'The restless explorer' },
  { name: 'Veylora', baseTexture: 'neptune.jpg',       tintColor: '#1d4ed8', atmosphereColor: '#a5f3fc', atmosphereDensity: 0.14, hasRing: false, ringColor: '',        rotationSpeed: 0.018, cloudOpacity: 0, desc: 'The silent observer' },
  { name: 'Caelion', baseTexture: 'venus_surface.jpg', tintColor: '#b45309', atmosphereColor: '#fde68a', atmosphereDensity: 0.16, hasRing: false, ringColor: '',        rotationSpeed: 0.018, cloudOpacity: 0.2, desc: 'The burning creator' },
  { name: 'Thalor',  baseTexture: 'mercury.jpg',       tintColor: '#4b5563', atmosphereColor: '#c4b5fd', atmosphereDensity: 0.08, hasRing: false, ringColor: '',        rotationSpeed: 0.018, cloudOpacity: 0, desc: 'The hidden sage' },
  { name: 'Lunaris', baseTexture: 'moon.jpg',          tintColor: '#6b7280', atmosphereColor: '#e5e7eb', atmosphereDensity: 0.06, hasRing: false, ringColor: '',        rotationSpeed: 0.018, cloudOpacity: 0, desc: 'Lonely but free' },
  { name: 'Solenne', baseTexture: 'saturn.jpg',        tintColor: '#92400e', atmosphereColor: '#fcd34d', atmosphereDensity: 0.12, hasRing: false,  ringColor: '', rotationSpeed: 0.018, cloudOpacity: 0, desc: 'The one with gravity' },
]

export interface PlanetVisualConfig {
  /** Original calibration choice; preserves climates that share a stored mood. */
  climateKey?: string
  /** Primary colour for the planet surface glow */
  coreColor:    string
  /** Secondary accent colour */
  accentColor:  string
  /** Chosen texture file from /public/textures */
  textureFile?: string
  /** Legacy style retained for stored profiles; renderers ignore it. */
  ringStyle:    RingStyle
  surfaceStyle: SurfaceStyle
  /** Number of orbiting satellite dots (0–4) */
  satelliteCount: number
  /** Overall rendered size */
  size: 'sm' | 'md' | 'lg' | 'xl'
}

// --- Resonance planet (used inside ResonanceMap) ---------------------------

export interface ResonancePlanet {
  id:            string
  name:          string
  avatarSymbol:  string
  coreColor:     string
  resonanceType: ResonanceType
  beamColor:     BeamColor
  /** 0–100 resonance strength */
  strength:      number
  tagline?:      string
}

// --- Full planet profile ---------------------------------------------------

export interface PlanetProfile {
  id:          string
  name:        string
  avatarSymbol: string
  tagline?:    string

  // Role
  role: 'explorer' | 'resonator'

  // Core attributes
  mood:      Mood
  style:     PlanetStyle
  lifestyle: Lifestyle

  // Thematic content
  coreThemes:    string[]
  contentFragments: string[]   // short phrases / sentences the user wrote

  // Derived visual config
  visual: PlanetVisualConfig

  // Cognitive + emotional axes (0–100)
  cognitiveAxes: {
    abstract:  number   // 0 = concrete, 100 = abstract
    introspective: number   // 0 = outward, 100 = introspective
  }
  emotionalBars: {
    label: string
    value: number  // 0–100
    color: string
  }[]

  // Resonance connections (populated after matching)
  publicTags?: { key: string; value: string }[]
  resonances?: ResonancePlanet[]
  /** Viewer-specific aggregate only; contains no other user’s private answers. */
  preferenceFit?: { score: number; coverage: number; sourcePlanetId?: string } | null

  // -- Extended profile fields (optional, added progressively) --------------

  /** City / region string, e.g. "Beijing · 3rd ring" */
  location?: string
  /** Language labels, e.g. ['中文', 'English', 'Français'] */
  languages?: string[]
  /** Galaxy slugs this planet belongs to */
  galaxyIds?: string[]
  /** Cultural touchstones: artists, authors, films, movements */
  culturalTags?: string[]
  /** Cities this planet has lived in or gravitates toward */
  travelCities?: string[]
  /** Whether this planet seeks similar or complementary companions */
  matchPreference?: 'similar' | 'complementary' | 'mixed'
  /** Rendered planet appearance shared across identity surfaces */
  planetConfig?: PlanetConfig
  /** How this planet communicates  -  shapes atmosphere halo in PlanetScene */
  communicationStyle?: CommunicationStyle
  /** Active presence state */
  activeStatus?: ActiveStatus
  /** Music artists / genres / playlists */
  musicTaste?: string[]
  /** Books / authors / genres */
  bookTaste?: string[]
  /** Films / directors / genres */
  filmTaste?: string[]
  /** Recent planet archetypes this user has explored */
  explorationTraces?: ExplorationTrace[]
  /** SBTI personality type code, e.g. "CTRL", "MONK", "HHHH" */
  sbtiType?: string
  /** SBTI Chinese name, e.g. "拿捏者" */
  sbtiCn?: string
  /** SBTI pattern string, e.g. "HHH-HMH-MHH-HHH-MHM" */
  sbtiPattern?: string
  /** Owner progression level */
  userLevel?: number

  // Metadata
  createdAt: string
  userId:    string
}
