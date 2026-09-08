// --- Galaxy  -  keyword-based community cluster ------------------------------
//
// A Galaxy is a thematic social cluster built around keywords / interests.
// Users can join, browse, and contribute to galaxies.
// Galaxies are the mid-layer between the Universe (macro) and a Planet (personal).
//
// A galaxy is a naming/presentation layer over the real `Community` Prisma
// model — there is no separate Galaxy table (see
// docs/adr/0001-galaxy-content-model.md). Every field below is derived from a
// `Community` row returned by `GET /api/communities`; never hand-authored.

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

// --- Galaxy detail (used on /galaxy/[slug]) --------------------------------

export interface Galaxy extends GalaxyPreview {
  description?: string
}
