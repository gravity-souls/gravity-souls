import type { PersonalMapLayer, StarMapNode } from '@/types/star-map'

export const RELATION_STYLES = {
  saved: { color: '#e9c779', dash: [2, 5], arrow: 'none' },
  following: { color: '#7babf5', dash: [], arrow: 'out' },
  mutual: { color: '#68d8bd', dash: [], arrow: 'both' },
  created: { color: '#b89afa', dash: [], arrow: 'none' },
  joined: { color: '#68d8bd', dash: [8, 4], arrow: 'none' },
  interested: { color: '#e9c779', dash: [2, 5], arrow: 'none' },
  requested: { color: '#7babf5', dash: [6, 5], arrow: 'none' },
  going: { color: '#68d8bd', dash: [], arrow: 'none' },
  past: { color: '#a3abbc', dash: [2, 7], arrow: 'none' },
} as const
export type PersonalMapRelation = keyof typeof RELATION_STYLES
export const LAYER_RELATIONS: Record<PersonalMapLayer, PersonalMapRelation[]> = {
  planets: ['saved', 'following', 'mutual'],
  galaxies: ['created', 'joined'],
  activities: ['interested', 'requested', 'going', 'past'],
  constellations: ['interested', 'requested', 'going', 'past'],
}

// Relationship evidence, never decorative clusters, scores, chat or a received beam.
export function personalNodeRelations(node: StarMapNode): PersonalMapRelation[] {
  if (node.kind === 'galaxy') {
    return [
      ...(node.galaxyRelationship?.created ? ['created' as const] : []),
      ...(node.galaxyRelationship?.joined ? ['joined' as const] : []),
    ]
  }
  if (node.kind === 'activity') {
    // History describes the current lifecycle, not an active attendance promise.
    if (node.activityState === 'past' || node.groupId === 'past') return ['past']
    return [
      ...(node.userInterested ? ['interested' as const] : []),
      ...(node.userAttendance === 'PENDING' ? ['requested' as const] : []),
      ...(node.userAttendance === 'APPROVED' ? ['going' as const] : []),
    ]
  }
  const relation = node.relationship
  return [
    ...(relation?.saved ? ['saved' as const] : []),
    ...(relation?.following ? [relation.followedBy ? 'mutual' as const : 'following' as const] : []),
  ]
}

// Stable offsets within each existing group; no extra query or duplicate node.
export function personalNodeOffset(index: number, count: number) {
  const angle = index * 2.3999632297
  const radius = count <= 1 ? 0 : 18 + 42 * Math.sqrt((index + 0.5) / count)
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.7 }
}
