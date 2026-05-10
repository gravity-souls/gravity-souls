export const XP_EVENTS = {
  POST_CREATED: 20,
  RESONANCE_SENT: 10,
  RESONANCE_ACCEPTED: 50,
  GALAXY_JOINED: 30,
  DAILY_LOGIN: 5,
  PROFILE_COMPLETED: 100,
} as const

export type XPEventType = keyof typeof XP_EVENTS

export const LEVEL_THRESHOLDS = {
  1: 0,
  2: 100,
  3: 300,
  4: 700,
  5: 1500,
} as const

export const LEVEL_NAMES = {
  1: 'Drifting Rock',
  2: 'Young Planet',
  3: 'Orbiting Star',
  4: 'Gravity Field',
  5: 'Singularity',
} as const

export type LevelNumber = keyof typeof LEVEL_NAMES

export function clampLevel(level: number): LevelNumber {
  if (level >= 5) return 5
  if (level >= 4) return 4
  if (level >= 3) return 3
  if (level >= 2) return 2
  return 1
}

export function calculateLevel(xp: number): number {
  if (xp >= 1500) return 5
  if (xp >= 700) return 4
  if (xp >= 300) return 3
  if (xp >= 100) return 2
  return 1
}

export function xpToNextLevel(xp: number): {
  current: number
  required: number
  percentage: number
} {
  const level = calculateLevel(xp)
  if (level === 5) return { current: xp, required: 1500, percentage: 100 }

  const floor = LEVEL_THRESHOLDS[level as keyof typeof LEVEL_THRESHOLDS]
  const ceil = LEVEL_THRESHOLDS[(level + 1) as keyof typeof LEVEL_THRESHOLDS]
  const current = xp - floor
  const required = ceil - floor

  return {
    current,
    required,
    percentage: Math.floor((current / required) * 100),
  }
}
