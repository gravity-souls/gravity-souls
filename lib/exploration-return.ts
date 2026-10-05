import type { PersonalMapCollection } from '@/types/star-map'

type PersonalMapOrigin = `personal-star-map-${PersonalMapCollection}${'' | '-list'}`
export type ExplorationOrigin = 'star-map' | 'home-star-map' | PersonalMapOrigin
const personalOrigins = new Set<string>(['all', 'saved', 'following', 'mutual'].flatMap(collection => [
  `personal-star-map-${collection}`, `personal-star-map-${collection}-list`,
]))
export function personalMapOrigin(collection: PersonalMapCollection, listOnly: boolean): PersonalMapOrigin {
  return `personal-star-map-${collection}${listOnly ? '-list' : ''}`
}
export function explorationOrigin(value: string | null | undefined): ExplorationOrigin | null {
  return value && (value === 'star-map' || value === 'home-star-map' || personalOrigins.has(value)) ? value as ExplorationOrigin : null
}
export function explorationReturnHref(origin: ExplorationOrigin): string {
  if (origin === 'home-star-map') return '/'
  if (origin.startsWith('personal-star-map-')) {
    const list = origin.endsWith('-list')
    const collection = origin.slice('personal-star-map-'.length).replace(/-list$/, '')
    return `/star-map?mode=personal&collection=${collection}${list ? '&view=list' : ''}`
  }
  return '/star-map?mode=discover'
}
export function withExplorationOrigin(href: string, origin?: ExplorationOrigin | null): string {
  return origin ? `${href}${href.includes('?') ? '&' : '?'}from=${origin}` : href
}
