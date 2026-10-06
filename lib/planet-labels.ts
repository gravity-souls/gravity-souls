// --- Planet trait label translation -------------------------------------------
// Mood, lifestyle, communicationStyle and coreThemes are stored as canonical
// English keys (see types/creation.ts). Anywhere a SAVED planet's traits are
// displayed, route them through these helpers + the `creationSteps` message
// namespace instead of rendering the raw stored string.
//
// Pre-existing rows (seed data, older accounts) can hold a value outside the
// current key space (e.g. a slug variant). `t.has()` guards every lookup so a
// stale value falls back to a readable raw label instead of next-intl's
// missing-key placeholder (the literal dotted key path).
import { MOOD_TO_CLIMATE } from '@/lib/planet-builder'
import type { Mood } from '@/types/planet'

type SafeT = {
  (key: string): string
  has(key: string): boolean
}

function titleCase(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Planet.mood is NOT the same key space as the onboarding step's
// CLIMATE_OPTIONS: it's a separate, smaller Mood enum (calm/melancholic/
// intense/cold/mixed) that planet-builder.ts derives via a lossy 6→5 mapping.
export function moodLabel(t: SafeT, mood: Mood, climateKey?: string): string {
  const key = `climateOptions.${climateKey ?? MOOD_TO_CLIMATE[mood] ?? mood}.label`
  return t.has(key) ? t(key) : titleCase(mood)
}

export function lifestyleLabel(t: SafeT, lifestyle: string): string {
  const key = `lifestyleOptions.${lifestyle}.label`
  return t.has(key) ? t(key) : titleCase(lifestyle)
}

export function commStyleLabel(t: SafeT, style: string): string {
  const key = `commStyleOptions.${style}.label`
  return t.has(key) ? t(key) : titleCase(style)
}

// THEME_OPTIONS' keys (e.g. 'night & silence') are the real stored values —
// not valid translation-path segments — so they're mapped to the
// creationSteps.themeOptions.* keys actually used in messages/*.json.
const THEME_TRANSLATION_KEY: Record<string, string> = {
  'night & silence':       'nightSilence',
  'memory':                'memory',
  'dream logic':           'dreamLogic',
  'emotional texture':     'emotionalTexture',
  'visual sensation':      'visualSensation',
  'inner structure':       'innerStructure',
  'solitude & connection': 'solitudeConnection',
  'language & culture':    'languageCulture',
  'making & craft':        'makingCraft',
  'movement & place':      'movementPlace',
}

export function themeLabel(t: SafeT, theme: string): string {
  const key = `themeOptions.${THEME_TRANSLATION_KEY[theme] ?? theme}.label`
  return t.has(key) ? t(key) : titleCase(theme)
}

export function themeDescription(t: SafeT, theme: string): string {
  const key = `themeOptions.${THEME_TRANSLATION_KEY[theme] ?? theme}.description`
  return t.has(key) ? t(key) : titleCase(theme)
}

// --- Galaxy (Community) mood label translation ---------------------------------
// GalaxyMood is a distinct vocabulary from Planet mood — see types/galaxy.ts.
// Reuses the existing `galaxies.mood*` keys already defined for the mood filter
// on /galaxies (messages/*.json), instead of introducing a parallel key set.
const GALAXY_MOOD_TRANSLATION_KEY: Record<string, string> = {
  vibrant:       'moodVibrant',
  contemplative: 'moodContemplative',
  technical:     'moodTechnical',
  creative:      'moodCreative',
  intimate:      'moodIntimate',
}

export function galaxyMoodLabel(t: SafeT, mood: string): string {
  const key = GALAXY_MOOD_TRANSLATION_KEY[mood] ?? mood
  return t.has(key) ? t(key) : titleCase(mood)
}
