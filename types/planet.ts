// ─── Enum-like literal unions ──────────────────────────────────────────────

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

// ─── Exploration trace ─────────────────────────────────────────────────────

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

// ─── Visual config ─────────────────────────────────────────────────────────

export interface PlanetVisualConfig {
  /** Primary colour for the planet surface glow */
  coreColor:    string
  /** Secondary accent colour */
  accentColor:  string
  ringStyle:    RingStyle
  surfaceStyle: SurfaceStyle
  /** Number of orbiting satellite dots (0–4) */
  satelliteCount: number
  /** Overall rendered size */
  size: 'sm' | 'md' | 'lg' | 'xl'
}

// ─── Resonance planet (used inside ResonanceMap) ───────────────────────────

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

// ─── Full planet profile ───────────────────────────────────────────────────

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
  resonances?: ResonancePlanet[]

  // ── Extended profile fields (optional, added progressively) ──────────────

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
  /** How this planet communicates — shapes atmosphere halo in PlanetScene */
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

  // Metadata
  createdAt: string
  userId:    string
}
