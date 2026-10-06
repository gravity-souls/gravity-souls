import type { PlanetConfig, PlanetProfile } from '@/types/planet'
import { DEFAULT_PLANET_VISUAL } from '@/lib/user-planet-config'

export function planetProfileFromApi(data: Record<string, unknown>): PlanetProfile {
  const visual = { ...DEFAULT_PLANET_VISUAL, ...((data.visual as Partial<PlanetProfile['visual']>) ?? {}) }
  return {
    id: data.id as string,
    publicTags: data.publicTags as PlanetProfile['publicTags'],
    preferenceFit: data.preferenceFit as PlanetProfile['preferenceFit'],
    name: (data.name as string) || '',
    displayName: typeof data.displayName === 'string'
      ? data.displayName
      : typeof data.user === 'object' && data.user !== null && 'name' in data.user && typeof data.user.name === 'string'
        ? data.user.name
        : undefined,
    avatarSymbol: (data.avatarSymbol as string) || '?',
    tagline: (data.tagline as string) ?? undefined,
    role: (data.role as PlanetProfile['role']) ?? 'resonator',
    mood: (data.mood as PlanetProfile['mood']) ?? 'calm',
    style: (data.style as PlanetProfile['style']) ?? 'minimal',
    lifestyle: (data.lifestyle as PlanetProfile['lifestyle']) ?? 'solitary',
    coreThemes: (data.coreThemes as string[]) ?? [],
    contentFragments: (data.contentFragments as string[]) ?? [],
    location: typeof data.location === 'string' ? data.location : undefined,
    languages: Array.isArray(data.languages) ? data.languages.filter((value): value is string => typeof value === 'string') : [],
    culturalTags: Array.isArray(data.culturalTags) ? data.culturalTags.filter((value): value is string => typeof value === 'string') : [],
    travelCities: Array.isArray(data.travelCities) ? data.travelCities.filter((value): value is string => typeof value === 'string') : [],
    musicTaste: Array.isArray(data.musicTaste) ? data.musicTaste.filter((value): value is string => typeof value === 'string') : [],
    bookTaste: Array.isArray(data.bookTaste) ? data.bookTaste.filter((value): value is string => typeof value === 'string') : [],
    filmTaste: Array.isArray(data.filmTaste) ? data.filmTaste.filter((value): value is string => typeof value === 'string') : [],
    communicationStyle: typeof data.communicationStyle === 'string' ? data.communicationStyle as PlanetProfile['communicationStyle'] : undefined,
    matchPreference: data.matchPreference === 'similar' || data.matchPreference === 'complementary' || data.matchPreference === 'mixed' ? data.matchPreference : undefined,
    visual,
    planetConfig: data.planetConfig as PlanetConfig | null | undefined,
    cognitiveAxes: { abstract: (data.abstractAxis as number) ?? 50, introspective: (data.introspectiveAxis as number) ?? 50 },
    emotionalBars: [],
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
    userId: (data.userId as string) ?? '',
  } as PlanetProfile

}
