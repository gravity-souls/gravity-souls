export type RegionSuggestion = { value: string; label: string }
/** Only city/region names, never house numbers or precise coordinates. */
export function regionSuggestions(data: unknown): RegionSuggestion[] {
  if (!data || typeof data !== 'object' || !('features' in data) || !Array.isArray(data.features)) return []
  const values = new Map<string, RegionSuggestion>()
  for (const feature of data.features.slice(0, 20)) {
    const p = feature?.properties
    if (!p || typeof p.name !== 'string') continue
    const city = typeof p.city === 'string' ? p.city : p.name
    const country = typeof p.countrycode === 'string' ? p.countrycode.toUpperCase() : p.country
    if (typeof country !== 'string') continue
    const value = `${city}, ${country}`.slice(0,120)
    const state = typeof p.state === 'string' && p.state !== city ? ` · ${p.state}` : ''
    values.set(value, { value, label: `${value}${state}` })
  }
  return [...values.values()].slice(0,6)
}
export function regionCity(value: string) { return value.split(',')[0].trim() }
