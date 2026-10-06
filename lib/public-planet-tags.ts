import { ageFromBirthDate, BASIC_OPTIONS } from '@/lib/registration-basics'
export type PublicPlanetTag = { key: 'age'; value: number } | { key: string; value: string }
type TagSource = { birthDate?: string | Date | null; gender?: string; region?: string; languages?: string[]; interests?: string[]; connectionGoals?: string[]; peoplePreferences?: string[]; gatheringPreferences?: string[]; publicTags?: string[] }
export function availablePublicTags(source: TagSource, now = new Date()): { token: string; tag: PublicPlanetTag }[] {
  const tags: { token: string; tag: PublicPlanetTag }[] = []
  const age = ageFromBirthDate(source.birthDate, now)
  if (age !== null && age >= 18) tags.push({ token: 'age', tag: { key: 'age', value: age } })
  if (source.region?.trim()) tags.push({ token: 'region', tag: { key: 'region', value: source.region } })
  if (source.gender && source.gender !== 'undisclosed' && BASIC_OPTIONS.gender.includes(source.gender as never)) tags.push({ token: `gender:${source.gender}`, tag: { key: 'gender', value: source.gender } })
  for (const key of ['languages','interests','connectionGoals','peoplePreferences','gatheringPreferences'] as const) {
    for (const value of new Set(source[key] ?? [])) if (value !== 'noPreference' && value !== 'other' && BASIC_OPTIONS[key].includes(value as never)) tags.push({ token: `${key}:${value}`, tag: { key, value } })
  }
  return tags
}
export function publicPlanetTags(source: TagSource | null | undefined, now = new Date()): PublicPlanetTag[] {
  if (!source) return []
  const selected = new Set(source.publicTags ?? [])
  return availablePublicTags(source, now).filter(item => selected.has(item.token)).slice(0,12).map(item => item.tag)
}

export function normalizedPublicTags(source: TagSource): string[] {
  const allowed = new Set(availablePublicTags(source).map(item => item.token))
  return [...new Set(source.publicTags ?? [])].filter(token => allowed.has(token)).slice(0, 12)
}

type TagTranslator = { (key: string, values?: { age: number }): string; has(key: string): boolean }
export function publicPlanetTagLabel(t: TagTranslator, tag: PublicPlanetTag): string {
  if (typeof tag.value === 'number') return t('exactAge', { age: tag.value })
  return tag.key === 'region' ? tag.value : t.has(`options.${tag.value}`) ? t(`options.${tag.value}`) : tag.value
}
