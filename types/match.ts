// --- Orbit / Resonance match types -----------------------------------------
//
// The daily resonance system shows the user's planet at the centre with
// up to 5 matched planets orbiting around it. Each orbit line is coloured
// to indicate the *primary reason* for the match.
//
// Color → reason mapping (canonical, must stay consistent across UI):
//
//   Blue   (#60a5fa)  -  shared interests
//   Purple (#a78bfa)  -  expression style resonance
//   Red    (#f87171)  -  emotional / inner-theme resonance
//   Green  (#34d399)  -  culture / travel resonance
//   Gold   (#fbbf24)  -  books / music / art resonance
//   Orange (#fb923c)  -  complementary worldview / productive difference

// --- Orbit color -----------------------------------------------------------

export type OrbitColor =
  | 'blue'    // shared interests
  | 'purple'  // expression style
  | 'red'     // emotional theme
  | 'green'   // culture & travel
  | 'gold'    // books, music, art
  | 'orange'  // worldview complement

// --- Match reason dimension keys -------------------------------------------

export type OrbitReasonKey =
  | 'shared-interest'      // → blue
  | 'expression-style'     // → purple
  | 'emotional-theme'      // → red
  | 'culture-travel'       // → green
  | 'art-books-music'      // → gold
  | 'worldview-complement' // → orange

/** Canonical mapping from reason key → orbit colour */
export const ORBIT_COLOR_MAP: Record<OrbitReasonKey, OrbitColor> = {
  'shared-interest':      'blue',
  'expression-style':     'purple',
  'emotional-theme':      'red',
  'culture-travel':       'green',
  'art-books-music':      'gold',
  'worldview-complement': 'orange',
}

// --- Suggested relationship types per match ---------------------------------

export type RelationshipType =
  | 'chat'                  // casual signal
  | 'friendship'            // mutual orbit
  | 'activity-buddy'        // shared-interest collaboration
  | 'community-companion'   // galaxy co-member
  | 'deep-conversation'     // emotional / philosophical resonance

// --- Match dimension scores -------------------------------------------------

export interface MatchDimensions {
  /** 0–100 per dimension; undefined means not scored */
  interests?:   number
  expression?:  number
  emotion?:     number
  culture?:     number
  arts?:        number
  worldview?:   number
}

// --- A single orbit match entry ---------------------------------------------

export interface OrbitMatch {
  /** ID of the matched planet */
  planetId:       string

  /** Overall resonance score 0–100 */
  score:          number

  /** Dominant orbit colour (driven by the strongest dimension) */
  orbitColor:     OrbitColor

  /** Primary reason key for this match */
  primaryReason:  OrbitReasonKey

  /** All dimension scores */
  dimensions:     MatchDimensions

  /** Specific shared traits / examples */
  similarities:   string[]

  /** Specific contrasting traits  -  presented as complementary, not negative */
  differences:    string[]

  /** Suggested ways to connect */
  suggestedTypes: RelationshipType[]

  /** Poetic one-liner explaining this resonance */
  resonanceNote:  string
}

// --- Daily resonance session -------------------------------------------------

export interface ResonanceSession {
  /** Source planet ID (the current user) */
  sourcePlanetId: string

  /** Up to 5 matched planets for today */
  matches:        OrbitMatch[]

  /** ISO date string  -  each session is date-keyed */
  date:           string
}
