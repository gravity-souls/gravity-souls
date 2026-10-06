import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { BASIC_OPTIONS } from '@/lib/registration-basics'
import { regionCity } from '@/lib/region-search'
export const discoveryQueryFields = {
  region: z.string().trim().max(120).default(''),
  language: z.enum(BASIC_OPTIONS.languages).optional(),
  interest: z.enum(BASIC_OPTIONS.interests).optional(),
  goal: z.enum(BASIC_OPTIONS.connectionGoals).optional(),
  gathering: z.enum(BASIC_OPTIONS.gatheringPreferences).optional(),
  sort: z.enum(['date', 'recommended']).default('date'),
}
export type DiscoveryFilters = { region?: string; language?: string; interest?: string; goal?: string; gathering?: string; sort?: string }
export function eventDiscoveryWhere(filters: DiscoveryFilters): Prisma.EventWhereInput[] {
  return [
    ...(filters.region ? [{ location: { contains: regionCity(filters.region), mode: 'insensitive' as const } }] : []),
    ...(filters.language ? [{ languages: { has: filters.language } }] : []),
    ...(filters.interest ? [{ interestTags: { has: filters.interest } }] : []),
    ...(filters.goal ? [{ connectionGoals: { has: filters.goal } }] : []),
    ...(filters.gathering ? [{ gatheringPreferences: { has: filters.gathering } }] : []),
  ]
}
