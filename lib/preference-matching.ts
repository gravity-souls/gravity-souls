
type PreferenceSource = { region: string; languages: string[]; interests: string[]; connectionGoals: string[]; gatheringPreferences: string[]; peoplePreferences: string[] }
export type PreferenceFit = { score: number; coverage: number; sourcePlanetId?: string }
export type AudienceMetadata = { region?: string | null; location?: string | null; languages?: string[]; interests?: string[]; interestTags?: string[]; connectionGoals?: string[]; gatheringPreferences?: string[] }
const normalized = (value: string) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
const city = (value: string) => normalized(value.split(/[,，·]/)[0])
export function sameRegion(a: string, b: string): boolean {
  const first = city(a), second = city(b)
  return !!first && !!second && (first === second || ` ${second} `.includes(` ${first} `) || ` ${first} `.includes(` ${second} `))
}
function overlap(a: string[] = [], b: string[] = []): number | null {
  const first = [...new Set(a.filter(v => v !== 'noPreference' && v !== 'other'))], second = [...new Set(b.filter(v => v !== 'noPreference' && v !== 'other'))]
  if (!first.length || !second.length) return null
  return first.filter(v => second.includes(v)).length / new Set([...first, ...second]).size * 100
}
// Missing answers are unscored, not treated as incompatibility. No gender,
// birthday or age evidence enters the calculation or its public result.
export function preferenceFit(source: PreferenceSource | null, target: AudienceMetadata | null, differentPerspectives?: boolean): PreferenceFit | null {
  if (!source || !target) return null
  const terms: [number | null, number][] = [
    [overlap(source.languages, target.languages), 3],
    [source.region && (target.region || target.location) ? (sameRegion(source.region, target.region || target.location || '') ? 100 : 0) : null, 3],
    [overlap(source.interests, (target.interestTags ?? target.interests)), 4],
    [overlap(source.connectionGoals, target.connectionGoals), 3],
    [overlap(source.gatheringPreferences, target.gatheringPreferences), 2],
  ]
  const people: number[] = []
  if (source.peoplePreferences.includes('sharedInterests')) { const value = overlap(source.interests, (target.interestTags ?? target.interests)); if (value !== null) people.push(value) }
  if (source.peoplePreferences.includes('localPeople') && source.region && (target.region || target.location)) people.push(sameRegion(source.region, target.region || target.location || '') ? 100 : 0)
  if (source.peoplePreferences.includes('international') && source.region && (target.region || target.location)) people.push(sameRegion(source.region, target.region || target.location || '') ? 0 : 100)
  if (source.peoplePreferences.includes('differentPerspectives') && differentPerspectives !== undefined) people.push(differentPerspectives ? 100 : 0)
  terms.push([people.length ? people.reduce((a,b) => a+b, 0) / people.length : null, 2])
  const measured = terms.filter(([value]) => value !== null)
  const weight = measured.reduce((sum, [,w]) => sum+w, 0)
  if (!weight) return null
  return { score: Math.round(measured.reduce((sum,[value,w]) => sum+value!*w, 0) / weight), coverage: weight / 17 }
}
export function adjustedPreferenceScore(base: number, fit?: PreferenceFit | null): number {
  const safe = Math.min(100, Math.max(0, base))
  if (!fit || !Number.isFinite(fit.score) || !Number.isFinite(fit.coverage)) return Math.round(safe)
  const weight = .15 * Math.min(1, Math.max(0, fit.coverage))
  return Math.round(safe * (1-weight) + Math.min(100, Math.max(0, fit.score)) * weight)
}
function stable(value: string): number {
  let hash = 2166136261
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return (hash >>> 0) / 4294967296
}
// Selection changes, never the displayed score. Hard permissions/filters must
// already have been applied. Refreshes remain stable within a UTC date.
export function selectWithExploration<T extends { score: number }>(ranked: T[], id: (item: T) => string, seed: string, limit = 5): (T & { exploration?: boolean })[] {
  const primary = ranked.slice(0, limit)
  if (limit < 2 || ranked.length <= limit) return primary
  const cutoff = Math.max(35, ranked[0].score - 35)
  const pool = ranked.slice(limit-1).filter(item => item.score >= cutoff)
  if (!pool.length) return primary
  const choice = [...pool].sort((a,b) => stable(`${seed}:${id(a)}`)-stable(`${seed}:${id(b)}`) || id(a).localeCompare(id(b)))[0]
  return [...ranked.slice(0,limit-1), { ...choice, exploration: true }].sort((a,b) => b.score-a.score || id(a).localeCompare(id(b)))
}
