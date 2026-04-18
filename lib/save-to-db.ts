import { authClient } from '@/lib/auth-client'
import type { PlanetProfile } from '@/types/planet'
import type { StoredSbtiResult } from '@/lib/user'

/**
 * Attempt to persist planet (and optional sbti) data to the database.
 * Returns true if saved successfully, false if not authenticated or failed.
 * This is a best-effort operation  -  localStorage is always the fallback.
 */
export async function savePlanetToDb(
  planet: PlanetProfile,
  sbti?: StoredSbtiResult | null,
): Promise<boolean> {
  try {
    const { data: session } = await authClient.getSession()
    if (!session?.user) return false

    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planet, sbti: sbti ?? undefined }),
    })

    if (res.ok) {
      // Mark sync as done so the background hook doesn't re-sync
      localStorage.setItem('gravitysoul_sync_done', new Date().toISOString())
      return true
    }
    return false
  } catch {
    return false
  }
}
