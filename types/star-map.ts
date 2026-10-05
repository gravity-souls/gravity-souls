import type { PlanetConfig } from './planet'
export type StarMapMode = 'discover' | 'galaxies' | 'personal'
export type PersonalMapLayer = 'planets' | 'galaxies' | 'activities'
export type PersonalMapCollection = 'all' | 'saved' | 'following' | 'mutual'
export interface StarMapGroup {
  id: string
  name?: string
  count: number
  color: string
}
export interface StarMapNode {
  id: string
  kind?: 'planet' | 'galaxy' | 'activity'
  date?: string
  eventStatus?: 'APPROVED' | 'PASSED' | 'CANCELLED'
  userAttendance?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | null
  userInterested?: boolean
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
  id: string
  name: string
  href: string
  planetConfig?: PlanetConfig
  level: number
}
export interface StarMapData {
  selfPlanet?: StarMapSelfPlanet | null
  groups: StarMapGroup[]
  nodes: StarMapNode[]
  total: number
  nextCursor: string | null
  scope: 'allVisible' | 'batch' | 'personal'
  requiresPlanet?: boolean
}
