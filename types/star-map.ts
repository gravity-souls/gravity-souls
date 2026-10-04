import type { PlanetConfig } from './planet'
export type StarMapMode = 'discover' | 'galaxies'
export interface StarMapGroup {
  id: string
  name?: string
  count: number
  color: string
}
export interface StarMapNode {
  id: string
  userId?: string
  relationship?: StarMapRelationship
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
export interface StarMapData {
  groups: StarMapGroup[]
  nodes: StarMapNode[]
  total: number
  nextCursor: string | null
  scope: 'allVisible' | 'batch'
  requiresPlanet?: boolean
}
