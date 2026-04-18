import type { ResonanceSession } from '@/types/match'

// --- Hand-crafted daily resonance session for p-aelion -----------------------
// Used as the default session when the viewer is p-aelion (the demo planet).
// Richly narrated: similarities, differences, notes, suggested types.

export const mockResonanceSession: ResonanceSession = {
  sourcePlanetId: 'p-aelion',
  date: '2026-03-30',
  matches: [
    {
      planetId:      'p-driftan',
      score:         88,
      orbitColor:    'purple',
      primaryReason: 'expression-style',
      dimensions: {
        interests:  75,
        expression: 92,
        emotion:    80,
        culture:    55,
        arts:       60,
        worldview:  45,
      },
      similarities: [
        'Both write with a poetic, fragmented voice',
        'Shared themes: night & silence and memory',
        'Same emotional register  -  both melancholic',
        'Touchstones: Murakami, border cinema, melancholy',
      ],
      differences: [
        'You are solitary; they drift between cities  -  complementary pull',
        'Driftan thinks in four languages simultaneously; you anchor in one',
        'Their nomadic rootlessness contrasts your practiced stillness',
      ],
      suggestedTypes:  ['deep-conversation', 'friendship'],
      resonanceNote: 'How they speak is almost the same. What they say diverges beautifully.',
    },
    {
      planetId:      'p-lumira',
      score:         72,
      orbitColor:    'green',
      primaryReason: 'culture-travel',
      dimensions: {
        interests:  60,
        expression: 55,
        emotion:    58,
        culture:    88,
        arts:       72,
        worldview:  62,
      },
      similarities: [
        'Both orbit Kyoto as a recurring touchstone',
        'Shared love of analog and memory-as-medium',
        'Film sensibility: slow cinema, emotional residue',
        'Both hold Murakami somewhere in their formation',
      ],
      differences: [
        'You are solitary; they are nomadic  -  complementary pull',
        'Lumira collects warmth; you distill from coolness',
        'Their communal warmth expands where your solitude condenses',
      ],
      suggestedTypes:  ['community-companion', 'friendship'],
      resonanceNote: 'They have stood in the same cities and wondered the same things.',
    },
    {
      planetId:      'p-vaelith',
      score:         65,
      orbitColor:    'red',
      primaryReason: 'emotional-theme',
      dimensions: {
        interests:  50,
        expression: 45,
        emotion:    85,
        culture:    60,
        arts:       68,
        worldview:  38,
      },
      similarities: [
        'Both share emotional texture as a core theme',
        'Shared orbit cities: Kyoto',
        'Both return to the same few things when the world is loud',
        'Slow cinema  -  An Elephant Sitting Still, quiet attention',
      ],
      differences: [
        'Vaelith makes with hands; you compose with fragments of language',
        'Their warmth (88) contrasts your cooler register (38)',
        'They are rooted; your interiority moves in wider, darker arcs',
      ],
      suggestedTypes:  ['deep-conversation', 'activity-buddy'],
      resonanceNote: 'Their emotional frequencies hum at the same register.',
    },
    {
      planetId:      'p-sorvae',
      score:         58,
      orbitColor:    'blue',
      primaryReason: 'shared-interest',
      dimensions: {
        interests:  72,
        expression: 40,
        emotion:    65,
        culture:    42,
        arts:       30,
        worldview:  35,
      },
      similarities: [
        'Shared themes: emotional texture and inner structure',
        'Both write with care for the single sentence',
        'Sorvae: "Clarity is a form of care"  -  you understand this',
        'Shared galaxy: slow-thinkers',
      ],
      differences: [
        'Sorvae maps clearly; you prefer the productive ambiguity of fog',
        'Communication style contrast: analytical meets poetic',
        'Their rooted clarity anchors what your drifting dissolves',
      ],
      suggestedTypes:  ['activity-buddy', 'friendship'],
      resonanceNote: 'Aelion-42 and Sorvae-88 orbit the same interior territory.',
    },
    {
      planetId:      'p-spirax',
      score:         48,
      orbitColor:    'orange',
      primaryReason: 'worldview-complement',
      dimensions: {
        interests:  35,
        expression: 55,
        emotion:    40,
        culture:    20,
        arts:       30,
        worldview:  80,
      },
      similarities: [
        'Both drawn to night & silence and dream logic',
        'High introspective axis  -  both turn inward before outward',
        'Both spend hours on a sentence',
        'Shared cold solitary attentiveness',
      ],
      differences: [
        'Spirax values precise axioms; you value productive dissolution',
        'Cold precision vs melancholic ambiguity  -  generative friction',
        'You are solitary; they are solitary differently  -  structured vs unstructured',
      ],
      suggestedTypes:  ['deep-conversation', 'chat'],
      resonanceNote: 'Where Aelion-42 ends, Spirax-14 begins. A productive gravity.',
    },
  ],
}
