import type { PlanetConfig } from '@/types/planet'
export const SHARE_KINDS = ['planet', 'galaxy', 'event'] as const
export type ShareKind = typeof SHARE_KINDS[number]
export type ShareSelection = { kind: ShareKind; targetId: string }
export type SharedCard = { available: false } | {
  available: true; kind: ShareKind; id: string; title: string; href: string
  planetConfig?: PlanetConfig | null; date?: string
}
export function isShareKind(value: string | null | undefined): value is ShareKind {
  return SHARE_KINDS.some(kind => kind === value)
}
