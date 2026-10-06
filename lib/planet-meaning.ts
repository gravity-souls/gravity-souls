import { CLIMATE_OPTIONS } from '@/types/creation'
import { MOOD_TO_CLIMATE } from './planet-builder'
import type { PlanetProfile } from '@/types/planet'

type Translator = { (key: string): string; has(key: string): boolean }

export function planetClimateKey(planet: PlanetProfile): string {
  const exact = CLIMATE_OPTIONS.find(c => c.key === planet.visual.climateKey)
  return exact?.key ?? CLIMATE_OPTIONS.find(c => c.description === planet.tagline)?.key ?? MOOD_TO_CLIMATE[planet.mood] ?? 'calm'
}

/** Translate only known generated copy. Personal writing remains untouched. */
export function localizedPlanetTagline(planet: PlanetProfile, t: Translator): string | undefined {
  const generated = CLIMATE_OPTIONS.find(c => c.description === planet.tagline)
  if (generated && t.has(`climateOptions.${generated.key}.description`)) return t(`climateOptions.${generated.key}.description`)
  return planet.tagline
}
