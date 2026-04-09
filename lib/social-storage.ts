import { getOrCreateUserId } from '@/lib/user'

// ─── Saved planets storage ────────────────────────────────────────────────────
// Stored as a JSON array of planet IDs in localStorage.

function savedKey(): string {
  const id = getOrCreateUserId()
  return `driftverse_saved_${id}`
}

export function getSavedPlanetIds(): string[] {
  try {
    const raw = localStorage.getItem(savedKey())
    if (!raw) return []
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

export function savePlanetId(planetId: string): void {
  const current = getSavedPlanetIds()
  if (!current.includes(planetId)) {
    localStorage.setItem(savedKey(), JSON.stringify([...current, planetId]))
  }
}

export function unsavePlanetId(planetId: string): void {
  const current = getSavedPlanetIds()
  localStorage.setItem(savedKey(), JSON.stringify(current.filter((id) => id !== planetId)))
}

export function isSaved(planetId: string): boolean {
  return getSavedPlanetIds().includes(planetId)
}
