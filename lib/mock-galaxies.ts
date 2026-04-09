// ─── Mock Galaxy data ──────────────────────────────────────────────────────
// 8 diverse galaxies covering different thematic clusters.
// Planet IDs reference lib/mock-planets.ts — prefix 'p-' + slug.

import type { Galaxy, GalaxyPreview } from '@/types/galaxy'

export const MOCK_GALAXIES: Galaxy[] = [
  {
    id:          'gx-001',
    slug:        'slow-thinkers',
    name:        'Slow Thinkers',
    symbol:      '◎',
    tagline:     'Where ideas arrive late, and linger longer.',
    description: 'A quiet cluster for people who process the world slowly and deeply. Philosophy, introspection, long essays, and the courage to sit with uncertainty.',
    keywords:    ['philosophy', 'introspection', 'writing', 'slow living', 'deep thought'],
    mood:        'contemplative',
    memberCount: 312,
    maturity:    'active',
    activePlanetIds: ['p-aelion', 'p-noctaris', 'p-vaelith'],
    accentColor: '#a78bfa',
    createdAt:   '2025-01-12T00:00:00Z',
    updatedAt:   '2026-03-20T00:00:00Z',
  },
  {
    id:          'gx-002',
    slug:        'signal-noise',
    name:        'Signal & Noise',
    symbol:      '◍',
    tagline:     'Technology as lived experience, not just tool.',
    description: 'For builders, tinkerers, and those who feel the texture of software. Code aesthetics, systems thinking, indie making, and digital craft.',
    keywords:    ['technology', 'software', 'building', 'systems', 'craft', 'indie'],
    mood:        'technical',
    memberCount: 548,
    maturity:    'established',
    activePlanetIds: ['p-novaxis', 'p-spirax', 'p-kindus'],
    accentColor: '#60a5fa',
    createdAt:   '2024-11-03T00:00:00Z',
    updatedAt:   '2026-03-27T00:00:00Z',
  },
  {
    id:          'gx-003',
    slug:        'dusk-archives',
    name:        'Dusk Archives',
    symbol:      '◉',
    tagline:     'Books, ruins, and the dust of remembered things.',
    description: 'Literature, poetry, obscure cinema, forgotten music. For those who keep receipts from every emotional experience and call it a library.',
    keywords:    ['books', 'literature', 'poetry', 'film', 'music', 'memory', 'art'],
    mood:        'contemplative',
    memberCount: 204,
    maturity:    'active',
    activePlanetIds: ['p-sorvae', 'p-elarith', 'p-lumira'],
    accentColor: '#fbbf24',
    createdAt:   '2025-03-08T00:00:00Z',
    updatedAt:   '2026-03-25T00:00:00Z',
  },
  {
    id:          'gx-004',
    slug:        'warm-frequency',
    name:        'Warm Frequency',
    symbol:      '◌',
    tagline:     'Conversations that feel like coming home.',
    description: 'Emotionally open, socially warm. For people who think care is a practice. Vulnerability, mutual aid, small kindnesses at scale.',
    keywords:    ['community', 'care', 'warmth', 'connection', 'vulnerability', 'support'],
    mood:        'intimate',
    memberCount: 437,
    maturity:    'active',
    activePlanetIds: ['p-orbalin', 'p-elarith', 'p-vaelith'],
    accentColor: '#fb923c',
    createdAt:   '2025-02-14T00:00:00Z',
    updatedAt:   '2026-03-26T00:00:00Z',
  },
  {
    id:          'gx-005',
    slug:        'image-makers',
    name:        'Image Makers',
    symbol:      '◐',
    tagline:     'Visual language for things words leave blurry.',
    description: 'Photography, illustration, graphic design, video, spatial aesthetics. For people who see the composition in everything.',
    keywords:    ['photography', 'design', 'illustration', 'visual', 'aesthetics', 'film'],
    mood:        'creative',
    memberCount: 671,
    maturity:    'established',
    activePlanetIds: ['p-spirax', 'p-driftan', 'p-calenvix'],
    accentColor: '#34d399',
    createdAt:   '2024-09-17T00:00:00Z',
    updatedAt:   '2026-03-28T00:00:00Z',
  },
  {
    id:          'gx-006',
    slug:        'threshold-states',
    name:        'Threshold States',
    symbol:      '⊗',
    tagline:     'Liminal, between, in-transit. Always becoming.',
    description: 'For nomads, third-culture people, those who belong to multiple places and none. Migration, identity, home as feeling not location.',
    keywords:    ['travel', 'nomad', 'culture', 'identity', 'diaspora', 'belonging'],
    mood:        'contemplative',
    memberCount: 183,
    maturity:    'active',
    activePlanetIds: ['p-driftan', 'p-lumira', 'p-novaxis'],
    accentColor: '#a78bfa',
    createdAt:   '2025-05-22T00:00:00Z',
    updatedAt:   '2026-03-19T00:00:00Z',
  },
  {
    id:          'gx-007',
    slug:        'body-clocks',
    name:        'Body Clocks',
    symbol:      '⊕',
    tagline:     'Movement, stillness, and the intelligence of the physical.',
    description: 'Sport, training, somatic practice, dance, sleep. For people who treat the body as a second mind and listen when it speaks.',
    keywords:    ['sport', 'movement', 'health', 'dance', 'body', 'somatic', 'nature'],
    mood:        'vibrant',
    memberCount: 289,
    maturity:    'active',
    activePlanetIds: ['p-kindus', 'p-calenvix', 'p-orbalin'],
    accentColor: '#34d399',
    createdAt:   '2025-07-09T00:00:00Z',
    updatedAt:   '2026-03-22T00:00:00Z',
  },
  {
    id:          'gx-008',
    slug:        'late-night-economics',
    name:        'Late Night Economics',
    symbol:      '⊘',
    tagline:     'Money, power, and the systems beneath everything.',
    description: 'Political economy, finance, startups, labour, urban planning. For people who want to understand the engine room of the world they live in.',
    keywords:    ['economics', 'politics', 'startups', 'finance', 'systems', 'cities', 'work'],
    mood:        'technical',
    memberCount: 394,
    maturity:    'active',
    activePlanetIds: ['p-noctaris', 'p-spirax', 'p-sorvae'],
    accentColor: '#60a5fa',
    createdAt:   '2025-04-30T00:00:00Z',
    updatedAt:   '2026-03-24T00:00:00Z',
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getGalaxyBySlug(slug: string): Galaxy | undefined {
  return MOCK_GALAXIES.find((g) => g.slug === slug)
}

export function getGalaxyPreviews(): GalaxyPreview[] {
  return MOCK_GALAXIES.map(({ id, slug, name, symbol, tagline, keywords, mood, memberCount, maturity, accentColor }) => ({
    id, slug, name, symbol, tagline, keywords, mood, memberCount, maturity, accentColor,
  }))
}

/** Return galaxies whose keywords overlap with a given set */
export function getRelatedGalaxies(keywords: string[], excludeSlug?: string): Galaxy[] {
  return MOCK_GALAXIES
    .filter((g) => g.slug !== excludeSlug)
    .map((g) => ({
      galaxy: g,
      overlap: g.keywords.filter((k) => keywords.includes(k)).length,
    }))
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map(({ galaxy }) => galaxy)
}

/** Search galaxies by name, keywords, or tagline */
export function searchGalaxies(query: string): Galaxy[] {
  const q = query.toLowerCase().trim()
  if (!q) return MOCK_GALAXIES
  return MOCK_GALAXIES.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.keywords.some((k) => k.toLowerCase().includes(q)) ||
      g.tagline?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q)
  )
}
