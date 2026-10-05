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
  birthDate: z.string().max(10).optional(),
  adultConfirmed: z.boolean().optional(),
}).strict()
export type BasicPreferences = Omit<z.infer<typeof registrationSchema>, 'birthDate' | 'adultConfirmed'>
export const EMPTY_BASICS: BasicPreferences = { publicTags: [], gender: 'undisclosed', languages: [], region: '', interests: [], connectionGoals: [], peoplePreferences: [], gatheringPreferences: [] }

// Calendar arithmetic avoids timezone shifts and rejects normalized invalid dates.
export function isAdultBirthDate(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1900) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return false
  const age = now.getUTCFullYear() - year - (now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day) ? 1 : 0)
  return age >= 18
}
