import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'
import {
  moodLabel,
  lifestyleLabel,
  themeLabel,
  commStyleLabel,
} from '@/lib/planet-labels'
import { planetDisplayName } from '@/lib/planet-display-name'
type T = {
  (key: string, values?: Record<string, string | number>): string
  has(key: string): boolean
}
const common = (a: string[] | undefined, b: string[] | undefined) =>
  (a ?? []).filter((x) => (b ?? []).includes(x))
/** Presentation-only: never reranks or changes the canonical match scores/identities. */
export function localizeResonanceMatch(
  match: OrbitMatch,
  source: PlanetProfile,
  target: PlanetProfile,
  t: T,
  traits: T,
): OrbitMatch {
  const similarities: string[] = []
  const differences: string[] = []
  const themes = common(source.coreThemes, target.coreThemes)
  if (themes.length)
    similarities.push(
      t('sharedThemes', {
        values: themes
          .slice(0, 2)
          .map((x) => themeLabel(traits, x))
          .join(' · '),
      }),
    )
  if (source.mood === target.mood)
    similarities.push(t('sameMood', { value: moodLabel(traits, source.mood) }))
  for (const [a, b, key] of [
    [source.travelCities, target.travelCities, 'sharedCities'],
    [source.culturalTags, target.culturalTags, 'sharedCulture'],
    [source.musicTaste, target.musicTaste, 'sharedMusic'],
    [source.bookTaste, target.bookTaste, 'sharedBooks'],
    [source.filmTaste, target.filmTaste, 'sharedFilms'],
  ] as const) {
    const values = common(a, b)
    if (values.length)
      similarities.push(t(key, { values: values.slice(0, 2).join(' · ') }))
  }
  if (source.lifestyle !== target.lifestyle)
    differences.push(
      t('differentLifestyle', {
        source: lifestyleLabel(traits, source.lifestyle),
        target: lifestyleLabel(traits, target.lifestyle),
      }),
    )
  if (
    Math.abs(source.cognitiveAxes.abstract - target.cognitiveAxes.abstract) > 25
  )
    differences.push(t('differentCognition'))
  if (
    source.communicationStyle &&
    target.communicationStyle &&
    source.communicationStyle !== target.communicationStyle
  )
    differences.push(
      t('differentCommunication', {
        source: commStyleLabel(traits, source.communicationStyle),
        target: commStyleLabel(traits, target.communicationStyle),
      }),
    )
  if (source.mood !== target.mood)
    differences.push(
      t('differentMood', {
        source: moodLabel(traits, source.mood),
        target: moodLabel(traits, target.mood),
      }),
    )
  return {
    ...match,
    resonanceNote: t(`note_${match.primaryReason}`, {
      source: planetDisplayName(source),
      target: planetDisplayName(target),
    }),
    similarities: similarities.slice(0, 4),
    differences: differences.slice(0, 3),
  }
}
