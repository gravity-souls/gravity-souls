import type { Relationship, SavedPlanet } from '@/types/social'

// ─── Mock relationships for p-aelion ─────────────────────────────────────────
// Ladder: signal → orbit → resonant → aligned

export const mockRelationships: Relationship[] = [
  {
    id: 'rel-driftan',
    planetAId: 'p-aelion', planetBId: 'p-driftan',
    status: 'resonant',
    initiatedAt: '2026-03-08T22:00:00Z',
    updatedAt:   '2026-03-30T04:00:00Z',
    lastInteractionAt: '2026-03-30T04:00:00Z',
  },
  {
    id: 'rel-lumira',
    planetAId: 'p-aelion', planetBId: 'p-lumira',
    status: 'orbit',
    initiatedAt: '2026-03-22T14:00:00Z',
    updatedAt:   '2026-03-29T09:15:00Z',
    lastInteractionAt: '2026-03-29T09:15:00Z',
  },
  {
    id: 'rel-sorvae',
    planetAId: 'p-aelion', planetBId: 'p-sorvae',
    status: 'orbit',
    initiatedAt: '2026-03-18T10:00:00Z',
    updatedAt:   '2026-03-18T10:00:00Z',
  },
  {
    id: 'rel-vaelith',
    planetAId: 'p-aelion', planetBId: 'p-vaelith',
    status: 'signal',
    initiatedAt: '2026-03-27T16:30:00Z',
    updatedAt:   '2026-03-27T16:30:00Z',
  },
]

// ─── Mock star chart entries for p-aelion ────────────────────────────────────

export const mockSavedPlanets: SavedPlanet[] = [
  { planetId: 'p-noctaris', savedAt: '2026-03-14T20:00:00Z', label: 'Interesting cognitive axis' },
  { planetId: 'p-spirax',   savedAt: '2026-03-23T11:00:00Z' },
  { planetId: 'p-orbalin',  savedAt: '2026-03-27T08:00:00Z', label: 'Dream logic overlap' },
]
