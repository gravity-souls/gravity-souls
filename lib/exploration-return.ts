export type ExplorationOrigin = 'star-map' | 'home-star-map'

export function explorationOrigin(value: string | null | undefined): ExplorationOrigin | null {
  return value === 'star-map' || value === 'home-star-map' ? value : null
}
export function explorationReturnHref(origin: ExplorationOrigin): string {
  return origin === 'home-star-map' ? '/' : '/star-map?mode=discover'
}
export function withExplorationOrigin(href: string, origin?: ExplorationOrigin | null): string {
  return origin ? `${href}${href.includes('?') ? '&' : '?'}from=${origin}` : href
}
