import { resolvePlanetTexture } from '@/lib/planet-textures'
import { getPlanetById, mockPlanets } from '@/lib/mock-planets'
import type { PlanetProfile } from '@/types/planet'

export interface SharedPost {
  id: string
  planetId: string
  authorName: string
  avatarTexture: string
  avatarGlow: string
  timeAgo: string
  createdAt: string
  content: string
  hashtags?: string[]
  likes: number
  replies: number
}

const POST_SAMPLES: Omit<SharedPost, 'planetId' | 'authorName' | 'avatarTexture' | 'avatarGlow'>[] = [
  { id: 'sm-1', timeAgo: '2h ago', createdAt: '2026-04-30T08:30:00Z', content: 'Hiking through the forest today. Felt so peaceful.', hashtags: ['NatureVibes'], likes: 24, replies: 6 },
  { id: 'sm-2', timeAgo: '5h ago', createdAt: '2026-04-30T05:40:00Z', content: 'The stars tonight were unreal. Anyone else out there?', hashtags: ['NightVibes'], likes: 18, replies: 4 },
  { id: 'sm-3', timeAgo: '1d ago', createdAt: '2026-04-29T12:10:00Z', content: 'Sometimes the quiet says more than words.', hashtags: ['Reflect'], likes: 31, replies: 7 },
  { id: 'sm-4', timeAgo: '2d ago', createdAt: '2026-04-28T17:50:00Z', content: 'I keep finding small rituals that make the city feel less anonymous.', hashtags: ['CitySignals', 'Rituals'], likes: 42, replies: 9 },
  { id: 'sm-5', timeAgo: '3d ago', createdAt: '2026-04-27T20:15:00Z', content: 'A sentence can be a door if you leave it slightly open.', hashtags: ['Writing', 'InteriorWeather'], likes: 36, replies: 11 },
  { id: 'sm-6', timeAgo: '4d ago', createdAt: '2026-04-26T09:20:00Z', content: 'Built something tiny today. It worked, then it taught me why it should not.', hashtags: ['BuildLog', 'SignalNoise'], likes: 29, replies: 5 },
]

function postFromPlanet(sample: Omit<SharedPost, 'planetId' | 'authorName' | 'avatarTexture' | 'avatarGlow'>, planet: PlanetProfile): SharedPost {
  return {
    ...sample,
    planetId: planet.id,
    authorName: planet.name,
    avatarTexture: resolvePlanetTexture(planet),
    avatarGlow: planet.visual.coreColor,
  }
}

export function getSharedPosts(planets: PlanetProfile[] = mockPlanets): SharedPost[] {
  if (planets.length === 0) return []

  return POST_SAMPLES.map((sample, index) => postFromPlanet(sample, planets[index % planets.length]))
}

export function getSharedPostsForPlanets(planets: PlanetProfile[], limit = 3): SharedPost[] {
  return getSharedPosts(planets).slice(0, limit)
}

export function getSharedPostById(id: string): SharedPost | undefined {
  return getSharedPosts().find((post) => post.id === id)
}

export function getSharedPostAuthor(post: SharedPost): PlanetProfile | undefined {
  return getPlanetById(post.planetId)
}