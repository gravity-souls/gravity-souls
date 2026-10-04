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
  groupId: string
  name: string
  tagline?: string | null
  href: string
  planetConfig?: PlanetConfig
  level?: number
  score?: number
  memberCount?: number
}
export interface StarMapData {
  groups: StarMapGroup[]
  nodes: StarMapNode[]
  total: number
  nextCursor: string | null
  scope: 'allVisible' | 'batch'
  requiresPlanet?: boolean
}
