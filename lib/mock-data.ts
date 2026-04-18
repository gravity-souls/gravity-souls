import type { Universe, EmotionTone, ExpressionStyle, MatchType } from '@/types/universe'

// Re-export so existing imports from '@/lib/mock-data' keep working
export type { Universe, EmotionTone, ExpressionStyle, MatchType }
/** Backward-compat alias  -  prefer Universe directly */
export type MatchedUniverse = Universe

// --- Universe pool (internal) ------------------------------------------------
// Keyed object used by getMatchesFromInput for O(1) lookup.

const pool = {
  velaris: {
    id: 'u-velaris',
    name: 'Velaris-9',
    avatarSymbol: '⊛',
    tagline: 'A mind that dreams at the edge of silence',
    coreThemes: ['liminality', 'sound & silence', 'unfinished things', 'inner cartography'],
    emotionTone: 'melancholic' as EmotionTone,
    expressionStyle: 'fragmented' as ExpressionStyle,
    driftDirection: 'inward',
    resonanceReason: 'This is your origin universe. All resonances are mapped from here.',
    summary:
      'Velaris-9 is built from half-finished sentences and the particular light at 4am. It orbits questions no one thought to ask, drawn to the liminal  -  the moment before sleep, the pause between notes, the space where meaning almost forms. Its emotional core is melancholic, not in defeat, but in the way a long fog carries its own beauty. Expression flows through image and negative space. This universe does not seek resolution. It prefers the weight of the open.',
  },

  // -- Similar pool ---------------------------------------------------------
  somnara: {
    id: 'u-somnara',
    name: 'Somnara',
    avatarSymbol: '◈',
    tagline: 'Dreaming while awake in fractal light',
    coreThemes: ['memory', 'dream logic', 'inherited symbols', 'soft surrealism'],
    emotionTone: 'melancholic' as EmotionTone,
    expressionStyle: 'visual' as ExpressionStyle,
    driftDirection: 'inward',
    resonanceReason:
      'Both universes orbit silence and the half-formed. You share an inward drift and visual expression. Somnara would feel like reading your own journal, written by someone who understood differently.',
    resonanceScore: 91,
    summary:
      'Somnara lives at the intersection of memory and invention, weaving meaning from imagery that feels inherited rather than made. Like Velaris-9, it values the unspoken  -  but tends to archive rather than release, building an ever-growing interior library no one else can fully enter.',
  },

  elareth: {
    id: 'u-elareth',
    name: 'Elareth',
    avatarSymbol: '⊙',
    tagline: 'Where the fog is a kind of knowing',
    coreThemes: ['threshold moments', 'fog', 'slow time', 'longing'],
    emotionTone: 'cool' as EmotionTone,
    expressionStyle: 'fragmented' as ExpressionStyle,
    driftDirection: 'spiral',
    resonanceReason:
      'Elareth and Velaris-9 share the same emotional weather  -  a comfort with incompleteness, a love of the threshold. Where you reach inward, Elareth spirals back. The gap between you is small and meaningful.',
    resonanceScore: 84,
    summary:
      'Elareth moves slowly, almost imperceptibly. It spirals through threshold moments  -  the pause between one era and the next, the breath before an answer. Its fragmented expression strips meaning to its barest form. Longing is its native tongue.',
  },

  // -- Complementary pool ---------------------------------------------------
  kindra: {
    id: 'u-kindra',
    name: 'Kindra-Flux',
    avatarSymbol: '◉',
    tagline: 'Outward always  -  light into the system',
    coreThemes: ['momentum', 'creation over reflection', 'systems thinking', 'radical presence'],
    emotionTone: 'warm' as EmotionTone,
    expressionStyle: 'narrative' as ExpressionStyle,
    driftDirection: 'outward',
    resonanceReason:
      'Kindra-Flux carries the energy you hold in reserve. Where you stay still, it moves. Where you ask, it acts. Together you form a complete arc  -  contemplation and execution in rare balance.',
    resonanceScore: 78,
    summary:
      'Kindra-Flux is kinetic and extroverted, turning inward tension into outward creation. Where Velaris-9 dissolves at the threshold, Kindra-Flux leaps across it. It is the answer to the questions you prefer to leave open.',
  },

  orvaan: {
    id: 'u-orvaan',
    name: 'Orvaan',
    avatarSymbol: '◍',
    tagline: 'The stories that move through us, not from us',
    coreThemes: ['myth-making', 'ritual', 'collective memory', 'embodied knowing'],
    emotionTone: 'playful' as EmotionTone,
    expressionStyle: 'narrative' as ExpressionStyle,
    driftDirection: 'oscillating',
    resonanceReason:
      'Orvaan holds the outer world the way Velaris-9 holds the inner one. Your private cartographies meet its love of shared stories. The encounter between you would feel like translating  -  each word finding its equivalent.',
    resonanceScore: 72,
    summary:
      'Orvaan dwells where the personal opens into the collective  -  myth, ritual, the deep grammar of shared memory. Its expression is grand and embodied; it does not think abstractly but feels through narrative. Where Velaris-9 maps the inner world, Orvaan maps the world that came before.',
  },

  // -- Distant --------------------------------------------------------------
  axiom: {
    id: 'u-axiom',
    name: 'Axiom-Zero',
    avatarSymbol: '○',
    tagline: 'Pure structure. Pure cold. Pure clarity.',
    coreThemes: ['formal systems', 'mathematical truth', 'reduction', 'zero-state thinking'],
    emotionTone: 'neutral' as EmotionTone,
    expressionStyle: 'analytical' as ExpressionStyle,
    driftDirection: 'lateral',
    resonanceReason:
      'Axiom-Zero is built from what you tend to avoid. But distance here is not rejection  -  it is the far shore. Spending time in this universe may reveal the skeleton beneath your poetry. Worth the trip.',
    resonanceScore: 34,
    summary:
      'Axiom-Zero strips everything to first principles. No metaphor, no ambiguity  -  only precision and proof. It exists in the furthest orbital from Velaris-9, built from logic where Velaris-9 is built from feeling. Its serenity is not peace; it is the absence of noise.',
  },
} satisfies Record<string, Universe>

// --- Public exports ----------------------------------------------------------

export const demoUniverse: Universe = pool.velaris

export const matchedUniverses: Universe[] = [
  { ...pool.somnara, matchType: 'similar' },
  { ...pool.elareth, matchType: 'similar' },
  { ...pool.kindra,  matchType: 'complementary' },
  { ...pool.orvaan,  matchType: 'complementary' },
  { ...pool.axiom,   matchType: 'distant' },
]

// --- Mood selector -----------------------------------------------------------

export const moodOptions = [
  { value: 'calm',          label: 'Calm',          symbol: '◌' },
  { value: 'turbulent',     label: 'Turbulent',     symbol: '◎' },
  { value: 'expansive',     label: 'Expansive',     symbol: '◍' },
  { value: 'introspective', label: 'Introspective', symbol: '●' },
  { value: 'electric',      label: 'Electric',      symbol: '◉' },
  { value: 'melancholic',   label: 'Melancholic',   symbol: '○' },
]

// --- Attribute descriptions --------------------------------------------------

export const toneDescriptions: Record<EmotionTone, string> = {
  warm:        'Radiates outward. Draws others in with its heat.',
  cool:        'Measured and clear. Moves without urgency.',
  melancholic: 'Carries weight gracefully. Knows beauty in the unresolved.',
  playful:     'Light and generative. Finds wonder in the ordinary.',
  neutral:     'Neither gains nor loses. A steady, reliable signal.',
}

export const styleDescriptions: Record<ExpressionStyle, string> = {
  fragmented:  'Shards that hold meaning. The gaps are part of the text.',
  narrative:   'Story as the primary frame. Everything has a through-line.',
  analytical:  'Structure as a lens. Precision as a kind of beauty.',
  visual:      'Meaning through image. Sensation over statement.',
}

// driftDirection is a plain string  -  descriptions keyed by the values used in data
export const driftDescriptions: Record<string, string> = {
  inward:      'Centripetal. The universe folds toward its own center.',
  outward:     'Centrifugal. Energy escapes and expands perpetually.',
  lateral:     'Parallel motion. Moving alongside rather than toward.',
  spiral:      'Returns to origins transformed. Never the same twice.',
  oscillating: 'Between states. Both, neither, always shifting.',
}

// --- Emotion tone → glow color -----------------------------------------------

export const toneColor: Record<EmotionTone, string> = {
  warm:        '#f97316',
  cool:        '#60a5fa',
  melancholic: '#a78bfa',
  playful:     '#34d399',
  neutral:     '#94a3b8',
}

// --- getMatchesFromInput -----------------------------------------------------
//
// Maps a user's free-text expression + selected mood to one universe per
// match category. Uses simple keyword scoring  -  no ML required.
//
// Selection pools:
//   similar       → Somnara (melancholic, visual)  vs  Elareth (cool, fragmented)
//   complementary → Kindra-Flux (warm, narrative)  vs  Orvaan (playful, narrative)
//   distant       → Axiom-Zero (always  -  furthest from any emotional input)

export function getMatchesFromInput(input: {
  text: string
  mood: string
}): { similar: Universe; complementary: Universe; distant: Universe } {
  const text = input.text.toLowerCase()
  const mood = input.mood.toLowerCase()

  const has  = (words: string[]) => words.some((w) => text.includes(w))
  const isMood = (moods: string[]) => moods.some((m) => mood.includes(m))

  // -- Similar: Somnara vs Elareth ------------------------------------------
  // Somnara favoured by: melancholic/introspective mood, visual/memory keywords
  // Elareth favoured by: calm/quiet mood, threshold/silence keywords
  const somnaraScore =
    (isMood(['melancholic', 'introspective']) ? 2 : 0) +
    (has(['dream', 'memory', 'image', 'color', 'light', 'picture', 'shadow', 'blur', 'see']) ? 1 : 0)

  const elarethScore =
    (isMood(['calm', 'serene', 'quiet']) ? 2 : 0) +
    (has(['fog', 'silence', 'slow', 'pause', 'threshold', 'barely', 'half', 'almost', 'edge', 'night']) ? 1 : 0)

  const similar = somnaraScore >= elarethScore ? pool.somnara : pool.elareth

  // -- Complementary: Kindra-Flux vs Orvaan ---------------------------------
  // Kindra favoured by: electric/turbulent mood, action/build keywords
  // Orvaan favoured by: expansive/playful mood, story/collective keywords
  const kindraScore =
    (isMood(['electric', 'turbulent']) ? 2 : 0) +
    (has(['build', 'create', 'make', 'push', 'system', 'forward', 'momentum', 'action', 'do']) ? 1 : 0)

  const orvaanScore =
    (isMood(['expansive', 'playful']) ? 2 : 0) +
    (has(['story', 'myth', 'ritual', 'people', 'together', 'collective', 'share', 'we', 'us']) ? 1 : 0)

  const complementary = kindraScore >= orvaanScore ? pool.kindra : pool.orvaan

  // -- Distant: always Axiom-Zero --------------------------------------------
  return {
    similar:       { ...similar,    matchType: 'similar' },
    complementary: { ...complementary, matchType: 'complementary' },
    distant:       { ...pool.axiom, matchType: 'distant' },
  }
}
