export type PlanetIdentity = {
  displayName?: string | null
  name?: string | null
}

export function planetDisplayName(planet: PlanetIdentity): string {
  const displayName = planet.displayName?.trim()
  if (displayName) return displayName
  return planet.name?.trim() ?? ''
}

export function hasDistinctPlanetName(planet: PlanetIdentity): boolean {
  const planetName = planet.name?.trim()
  return !!planetName && planetName !== planetDisplayName(planet)
}
