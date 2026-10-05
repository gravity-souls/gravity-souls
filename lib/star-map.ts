import type { PlanetProfile } from '@/types/planet'
export const MAP_COLORS: Record<string, string> = {
  calm: '#b89afa',
  melancholic: '#7babf5',
  intense: '#e9c779',
  cold: '#68d8bd',
  mixed: '#e59bbd',
  other: '#a3abbc',
  'shared-interest': '#60a5fa',
  'expression-style': '#a78bfa',
  'emotional-theme': '#f87171',
  'culture-travel': '#34d399',
  'art-books-music': '#fbbf24',
  'worldview-complement': '#fb923c',
  emotion: '#b89afa',
  interest: '#68d8bd',
  thought: '#e9c779',
  lifestyle: '#7babf5',
}
export function mapProfile(p: {
  id: string
  name: string
  mood: string
  style: string
  lifestyle: string
  coreThemes: string[]
  abstractAxis: number
  introspectiveAxis: number
  visual: unknown
}): PlanetProfile {
  return {
    id: p.id,
    name: p.name,
    avatarSymbol: '',
    role: 'resonator',
    mood: p.mood as PlanetProfile['mood'],
    style: p.style as PlanetProfile['style'],
    lifestyle: p.lifestyle as PlanetProfile['lifestyle'],
    coreThemes: p.coreThemes,
    contentFragments: [],
    visual: {
      coreColor: '#b89afa',
      accentColor: '#b89afa',
      ringStyle: 'none',
      surfaceStyle: 'smooth',
      satelliteCount: 0,
      size: 'sm',
    },
    cognitiveAxes: {
      abstract: p.abstractAxis,
      introspective: p.introspectiveAxis,
    },
    emotionalBars: [],
    createdAt: '',
    userId: '',
  }
}
/** Stable, evenly distributed overview layout. Clusters never collide at the same centre. */
export function mapCenter(
  index: number,
  count: number,
  personal = false,
): [number, number, number] {
  const angle = index * 2.3999632297
  const radius = personal ? 180 + 110 * Math.sqrt((index + 0.5) / Math.max(1, count)) : count <= 1 ? 0 : 65 + 190 * Math.sqrt((index + 0.5) / count)
  return [
    Math.cos(angle) * radius,
    Math.sin(angle) * radius * 0.72,
    Math.sin(index * 1.7) * 70,
  ]
}
export function stableUnit(id: string) {
  let hash = 2166136261
  for (const character of id)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return (hash >>> 0) / 4294967295
}
