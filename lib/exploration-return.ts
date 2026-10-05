import type { PersonalMapCollection, PersonalMapLayer } from '@/types/star-map'

type PersonalMapOrigin = `personal-star-map-${PersonalMapCollection | 'galaxies' | 'activities'}${'' | '-list'}`
export type ExplorationOrigin = 'star-map' | 'home-star-map' | PersonalMapOrigin
const personalOrigins = new Set<string>(['all', 'saved', 'following', 'mutual', 'galaxies', 'activities'].flatMap(collection => [
  `personal-star-map-${collection}`, `personal-star-map-${collection}-list`,
]))
export function personalMapOrigin(collection: PersonalMapCollection, listOnly: boolean, layer: PersonalMapLayer = 'planets'): PersonalMapOrigin {
  return `personal-star-map-${layer === 'planets' ? collection : layer}${listOnly ? '-list' : ''}`
}
export function explorationOrigin(value: string | null | undefined): ExplorationOrigin | null {
  return value && (value === 'star-map' || value === 'home-star-map' || personalOrigins.has(value)) ? value as ExplorationOrigin : null
}
export function explorationReturnHref(origin: ExplorationOrigin): string {
  if (origin === 'home-star-map') return '/'
  if (origin.startsWith('personal-star-map-')) {
    const list = origin.endsWith('-list')
    const collection = origin.slice('personal-star-map-'.length).replace(/-list$/, '')
    return `/star-map?mode=personal&${collection === 'galaxies' || collection === 'activities' ? `layer=${collection}` : `collection=${collection}`}${list ? '&view=list' : ''}`
  }
  return '/star-map?mode=discover'
}
export function withExplorationOrigin(href: string, origin?: ExplorationOrigin | null): string {
  if (!origin) return href
  const url = new URL(href, 'https://local.invalid')
  if (url.origin !== 'https://local.invalid') return href
  url.searchParams.set('from', origin)
  return url.pathname + url.search + url.hash
}
