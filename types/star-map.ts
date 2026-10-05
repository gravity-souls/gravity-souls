import type { PlanetConfig } from './planet'
export type StarMapMode = 'discover' | 'galaxies' | 'personal'
export type PersonalMapLayer = 'planets' | 'galaxies' | 'activities' | 'constellations'
export type PersonalMapCollection = 'all' | 'saved' | 'following' | 'mutual'
export interface StarMapGroup {
  id: string
  name?: string
  count: number
  color: string
  phase?: 'active' | 'past'
}
export interface StarMapNode {
  avatarUrl?: string | null
  displayName?: string
  publicTags?: { key: string; value: string }[]
  id: string
  kind?: 'planet' | 'galaxy' | 'activity'
  date?: string
  eventStatus?: 'APPROVED' | 'PASSED' | 'CANCELLED'
  userAttendance?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null
  userInterested?: boolean
  activityState?: 'going' | 'requested' | 'interested' | 'past'
  userId?: string
  relationship?: StarMapRelationship
  galaxyRelationship?: { created: boolean; joined: boolean }
  groupId: string
  name: string
  tagline?: string | null
  href: string
  planetConfig?: PlanetConfig
  level?: number
  score?: number
  memberCount?: number
}
export interface StarMapRelationship {
  saved: boolean
  following: boolean
  followedBy: boolean
  conversationId: string | null
}
export interface StarMapSelfPlanet {
  avatarUrl?: string | null
  displayName?: string
  id: string
  name: string
  href: string
  planetConfig?: PlanetConfig
  level: number
}
export interface StarMapData {
  groupScope?: 'batch'
  selfPlanet?: StarMapSelfPlanet | null
  groups: StarMapGroup[]
  nodes: StarMapNode[]
  total: number
  nextCursor: string | null
  scope: 'allVisible' | 'batch' | 'personal'
  requiresPlanet?: boolean
}
