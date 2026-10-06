import { z } from 'zod'

export const BASIC_OPTIONS = {
  gender: ['undisclosed', 'woman', 'man', 'nonbinary', 'other'],
  languages: ['zh', 'en', 'fr', 'es', 'de', 'ja', 'ko', 'ar', 'other'],
  interests: ['music', 'books', 'film', 'art', 'nature', 'travel', 'science', 'technology', 'sports', 'food', 'games', 'wellbeing'],
  connectionGoals: ['friendship', 'deepConversation', 'activities', 'learning', 'networking', 'dating', 'community', 'exploring'],
  peoplePreferences: ['sharedInterests', 'differentPerspectives', 'localPeople', 'international', 'noPreference'],
  gatheringPreferences: ['smallGroups', 'largeEvents', 'quietMeetups', 'outdoors', 'online', 'noPreference'],
} as const
const choices = <T extends readonly [string, ...string[]]>(values: T) => z.array(z.enum(values)).max(values.length).transform(v => [...new Set(v)])
export const registrationSchema = z.object({
  gender: z.enum(BASIC_OPTIONS.gender).default('undisclosed'),
  languages: choices(BASIC_OPTIONS.languages).default([]),
  region: z.string().trim().max(120).default(''),
  interests: choices(BASIC_OPTIONS.interests).default([]),
  connectionGoals: choices(BASIC_OPTIONS.connectionGoals).default([]),
  peoplePreferences: choices(BASIC_OPTIONS.peoplePreferences).default([]),
  gatheringPreferences: choices(BASIC_OPTIONS.gatheringPreferences).default([]),
  publicTags: z.array(z.string().max(80)).max(12).default([]),
  birthDate: z.string().max(10).nullable().optional(),
  adultConfirmed: z.boolean().optional(),
}).strict()
export type BasicPreferences = Omit<z.infer<typeof registrationSchema>, 'adultConfirmed'>
export const EMPTY_BASICS: BasicPreferences = { birthDate: null, publicTags: [], gender: 'undisclosed', languages: [], region: '', interests: [], connectionGoals: [], peoplePreferences: [], gatheringPreferences: [] }

export function parseBirthDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null
}

// A leap-day birthday advances on March 1 in non-leap years.
export function ageFromBirthDate(value: string | Date | null | undefined, now = new Date()): number | null {
  const date = typeof value === 'string' ? parseBirthDate(value) : value
  if (!date || !Number.isFinite(date.getTime()) || !Number.isFinite(now.getTime()) || date.getUTCFullYear() < 1900 ||
    date.getUTCHours() !== 0 || date.getUTCMinutes() !== 0 || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0 || date > now) return null
  const month = date.getUTCMonth(), day = date.getUTCDate()
  return now.getUTCFullYear() - date.getUTCFullYear() - (now.getUTCMonth() < month || (now.getUTCMonth() === month && now.getUTCDate() < day) ? 1 : 0)
}

export function isAdultBirthDate(value: string | Date | null | undefined, now = new Date()): boolean {
  const age = ageFromBirthDate(value, now)
  return age !== null && age >= 18
}

export function serializeRegistrationBasics<T extends { birthDate: Date | null }>(basics: T) {
  return { ...basics, birthDate: basics.birthDate?.toISOString().slice(0, 10) ?? null }
}
