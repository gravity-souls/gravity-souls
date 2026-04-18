// --- Galaxy  -  keyword-based community cluster ------------------------------
//
// A Galaxy is a thematic social cluster built around keywords / interests.
// Users can join, browse, and contribute to galaxies.
// Galaxies are the mid-layer between the Universe (macro) and a Planet (personal).

export type GalaxyMood =
  | 'vibrant'       // high-energy, social, active
  | 'contemplative' // slow, thoughtful, introverted
  | 'technical'     // structured, knowledge-heavy
  | 'creative'      // expressive, aesthetic-first
  | 'intimate'      // personal, vulnerable, warm

export type GalaxyMaturity =
  | 'forming'     // < 50 members, newly created
  | 'active'      // 50–500 members, healthy engagement
  | 'established' // 500+ members, a landmark in the universe

export interface Galaxy {
  id:          string
  slug:        string       // used in /galaxy/[slug]
  name:        string
  symbol:      string       // single glyph / emoji identifier
  tagline?:    string       // one-line poetic description
  description?: string      // longer optional description

  keywords:    string[]     // thematic tags; drives resonance matching
  mood:        GalaxyMood

  memberCount: number
  maturity:    GalaxyMaturity

  /** IDs of recently active planets in this galaxy */
  activePlanetIds: string[]

  /** Accent colour for this galaxy's orbit ring (hex / css var) */
  accentColor: string

  createdAt:   string
  updatedAt:   string
}

// --- Galaxy preview (used in cards, lists) ---------------------------------

export interface GalaxyPreview {
  id:          string
  slug:        string
  name:        string
  symbol:      string
  tagline?:    string
  keywords:    string[]
  mood:        GalaxyMood
  memberCount: number
  maturity:    GalaxyMaturity
  accentColor: string
}
