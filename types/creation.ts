import type { CommunicationStyle, Lifestyle } from '@/types/planet'

// --- Planet draft -------------------------------------------------------------
// Structured state collected across the 5 onboarding steps.
// Converted to PlanetProfile by lib/planet-builder.ts.

export interface PlanetDraft {
  // -- Step 1: Emotional tone -----------------------------------------------
  /** One of the 6 climate keys (calm, melancholic, introspective, electric, turbulent, expansive) */
  climateKey?: string

  // -- Step 2: Interest ecology ---------------------------------------------
  /** Up to 5 theme labels (maps to biome bands in PlanetScene) */
  selectedThemes: string[]
  lifestyle?: Lifestyle
  /** Optional explicit texture choice saved into visual.textureFile */
  textureFile?: string

  // -- Step 3: Atmosphere and expression -----------------------------------
  communicationStyle?: CommunicationStyle
  /** 0 = very concrete, 100 = highly abstract */
  abstractAxis: number
  /** 0 = outward / social, 100 = deeply introspective */
  introspectiveAxis: number

  // -- Step 4: Cultural paths ------------------------------------------------
  location?: string
  /** Display-format language labels, e.g. ['中文', 'English'] */
  languages: string[]
  travelCities: string[]
  culturalTags: string[]

  // -- Step 5: Relational gravity --------------------------------------------
  matchPreference?: 'similar' | 'complementary' | 'mixed'
  /** Slugs from CONNECTION_TYPES */
  connectionTypes: string[]
}

// --- Initial empty draft -----------------------------------------------------

export const INITIAL_DRAFT: PlanetDraft = {
  climateKey:         undefined,
  selectedThemes:     [],
  lifestyle:          undefined,
  textureFile:        undefined,
  communicationStyle: undefined,
  abstractAxis:       50,
  introspectiveAxis:  50,
  location:           undefined,
  languages:          [],
  travelCities:       [],
  culturalTags:       [],
  matchPreference:    undefined,
  connectionTypes:    [],
}

// --- Climate options ----------------------------------------------------------

export const CLIMATE_OPTIONS: Array<{
  key: string
  label: string
  symbol: string
  description: string
  coreColor: string
  accentColor: string
}> = [
  { key: 'calm',          label: 'Still',     symbol: '◌', description: 'Depth without turbulence. A quiet that listens.',   coreColor: '#60a5fa', accentColor: '#93c5fd' },
  { key: 'melancholic',   label: 'Heavy',     symbol: '○', description: 'A fog you know well. Beauty inside the weight.',     coreColor: '#818cf8', accentColor: '#6366f1' },
  { key: 'introspective', label: 'Inward',    symbol: '⊙', description: 'The interior is vast. You are its cartographer.',    coreColor: '#a78bfa', accentColor: '#c4b5fd' },
  { key: 'electric',      label: 'Charged',   symbol: '◉', description: 'Frequency on. You generate momentum.',               coreColor: '#fbbf24', accentColor: '#fde68a' },
  { key: 'turbulent',     label: 'Restless',  symbol: '◎', description: 'Energy seeking form. Not settled  -  not lost.',       coreColor: '#f97316', accentColor: '#fb923c' },
  { key: 'expansive',     label: 'Open',      symbol: '◍', description: 'Generous with space. Wide orbit. Collects things.',  coreColor: '#34d399', accentColor: '#6ee7b7' },
]

// --- Theme options ------------------------------------------------------------

export const THEME_OPTIONS: Array<{
  key: string
  label: string
  color: string
  description: string
}> = [
  { key: 'night & silence',       label: 'Night & silence',       color: '#4338ca', description: 'Darkness as habitat' },
  { key: 'memory',                label: 'Memory',                color: '#818cf8', description: 'What stays, transformed' },
  { key: 'dream logic',           label: 'Dream logic',           color: '#c4b5fd', description: 'The rules of the interior' },
  { key: 'emotional texture',     label: 'Emotional texture',     color: '#f97316', description: 'The weight of feeling' },
  { key: 'visual sensation',      label: 'Visual sensation',      color: '#2dd4bf', description: 'Light, image, surface' },
  { key: 'inner structure',       label: 'Inner structure',       color: '#60a5fa', description: 'Pattern beneath things' },
  { key: 'solitude & connection', label: 'Solitude & connection', color: '#34d399', description: 'The paradox of togetherness' },
  { key: 'language & culture',    label: 'Language & culture',    color: '#e879f9', description: 'How words shape worlds' },
  { key: 'making & craft',        label: 'Making & craft',        color: '#fb923c', description: 'Creation as thinking' },
  { key: 'movement & place',      label: 'Movement & place',      color: '#a3e635', description: 'Where you are and have been' },
]

// --- Lifestyle options --------------------------------------------------------

export const LIFESTYLE_OPTIONS: Array<{
  key: Lifestyle
  label: string
  symbol: string
  description: string
}> = [
  { key: 'solitary',  label: 'Solitary',  symbol: '○', description: 'Depth over breadth. Space to think.' },
  { key: 'communal',  label: 'Communal',  symbol: '◉', description: 'Energy from others. Together is generative.' },
  { key: 'nomadic',   label: 'Nomadic',   symbol: '◎', description: 'Roots in motion. Transit as home.' },
  { key: 'rooted',    label: 'Rooted',    symbol: '◈', description: 'Anchored. Depth from staying.' },
]

// --- Communication style options ----------------------------------------------

export const COMM_STYLE_OPTIONS: Array<{
  key: CommunicationStyle
  label: string
  symbol: string
  description: string
}> = [
  { key: 'poetic',     label: 'Poetic',     symbol: '◌', description: 'Meaning arrives through image and suggestion.' },
  { key: 'direct',     label: 'Direct',     symbol: '→', description: 'Clarity first. You say what you mean.' },
  { key: 'analytical', label: 'Analytical', symbol: '◈', description: 'Structure before intuition. Precision as care.' },
  { key: 'reflective', label: 'Reflective', symbol: '⊙', description: 'You listen twice before you speak once.' },
  { key: 'playful',    label: 'Playful',    symbol: '◍', description: 'Lightness as a mode. Wit alongside depth.' },
]

// --- Language options ---------------------------------------------------------

export const LANGUAGE_OPTIONS = [
  '中文', 'English', 'Français', 'Deutsch', 'Español',
  '日本語', '한국어', 'ภาษาไทย', 'Português', 'Italiano',
  'Русский', 'العربية',
]

// --- Match preference options -------------------------------------------------

export const MATCH_PREF_OPTIONS: Array<{
  key: 'similar' | 'complementary' | 'mixed'
  label: string
  symbol: string
  description: string
  color: string
}> = [
  { key: 'similar',       label: 'Resonance',  symbol: '⊙', description: 'You gravitate toward kindred spirits. Shared frequency matters.', color: '#a78bfa' },
  { key: 'mixed',         label: 'Open orbit', symbol: '◎', description: 'Space for both resonance and contrast. Your orbit is wide.',      color: '#fbbf24' },
  { key: 'complementary', label: 'Contrast',   symbol: '◈', description: 'Drawn to what you lack. Difference as productive gravity.',      color: '#34d399' },
]

// --- Connection type options --------------------------------------------------

export const CONNECTION_TYPE_OPTIONS: Array<{
  key: string
  label: string
  description: string
}> = [
  { key: 'deep-conversation',   label: 'Deep conversation',    description: 'Slow, meaningful exchange.' },
  { key: 'activity-buddy',      label: 'Activity companion',   description: 'Shared projects or interests.' },
  { key: 'friendship',          label: 'Mutual orbit',         description: 'Long-term resonance.' },
  { key: 'community-companion', label: 'Community companion',  description: 'Galaxy co-membership.' },
  { key: 'chat',                label: 'Casual signal',        description: 'Light, occasional.' },
]
