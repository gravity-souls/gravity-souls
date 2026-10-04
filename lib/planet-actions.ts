'use client'

export const PLANET_ACTION_CHANGED = 'planet-action:changed'
export type PlanetActionChange = { kind: 'saved'; planetId: string; saved: boolean } | { kind: 'follow'; userId: string; following: boolean }
export function announcePlanetAction(detail: PlanetActionChange) {
  window.dispatchEvent(new CustomEvent(PLANET_ACTION_CHANGED, { detail }))
}
export async function setPlanetSaved(planetId: string, saved: boolean) {
  const response = await fetch(saved ? '/api/saved-planets' : `/api/saved-planets/${encodeURIComponent(planetId)}`, {
    method: saved ? 'POST' : 'DELETE',
    ...(saved ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planetId }) } : {}),
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
  announcePlanetAction({ kind: 'saved', planetId, saved })
}
export async function setUserFollowing(userId: string, following: boolean) {
  const response = await fetch(following ? '/api/follows' : `/api/follows/${encodeURIComponent(userId)}`, {
    method: following ? 'POST' : 'DELETE',
    ...(following ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) } : {}),
  })
  if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
  announcePlanetAction({ kind: 'follow', userId, following })
}
