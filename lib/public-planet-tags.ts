import { BASIC_OPTIONS } from '@/lib/registration-basics'
export type PublicPlanetTag = { key: string; value: string }
type TagSource = { gender?: string; region?: string; languages?: string[]; interests?: string[]; connectionGoals?: string[]; gatheringPreferences?: string[]; publicTags?: string[] }
export function availablePublicTags(source: TagSource): { token: string; tag: PublicPlanetTag }[] {
  const tags: { token: string; tag: PublicPlanetTag }[] = []
  if (source.region?.trim()) tags.push({ token: 'region', tag: { key: 'region', value: source.region } })
  if (source.gender && source.gender !== 'undisclosed' && BASIC_OPTIONS.gender.includes(source.gender as never)) tags.push({ token: `gender:${source.gender}`, tag: { key: 'gender', value: source.gender } })
  for (const key of ['languages','interests','connectionGoals','gatheringPreferences'] as const) {
    for (const value of new Set(source[key] ?? [])) if (value !== 'noPreference' && value !== 'other' && BASIC_OPTIONS[key].includes(value as never)) tags.push({ token: `${key}:${value}`, tag: { key, value } })
  }
  return tags
}
export function publicPlanetTags(source: TagSource | null | undefined): PublicPlanetTag[] {
  if (!source) return []
  const selected = new Set(source.publicTags ?? [])
  return availablePublicTags(source).filter(item => selected.has(item.token)).slice(0,12).map(item => item.tag)
}
