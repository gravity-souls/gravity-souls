'use client'

import { useEffect, useRef } from 'react'
import { authClient } from '@/lib/auth-client'
import {
  getPlanetProfile,
  getSbtiResult,
  savePlanetProfile,
  saveSbtiResult,
} from '@/lib/user'

const SYNC_DONE_KEY = 'gravitysoul_sync_done'

/**
 * After the user logs in with better-auth, two-way sync:
 *  1. UPLOAD: push any localStorage data → database (first-time local → DB)
 *  2. DOWNLOAD: if localStorage is empty but DB has data, restore it locally
 *     (returning user on a new browser / after cache clear)
 */
export function useAuthSync() {
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    async function sync() {
      // Check if user is authenticated
      const { data: session } = await authClient.getSession()
      if (!session?.user) return

      // Gather localStorage data
      const planet = getPlanetProfile()
      const sbti = getSbtiResult()

      // -- UPLOAD: push local data to DB if not done yet ---------------
      if (!localStorage.getItem(SYNC_DONE_KEY) && (planet || sbti)) {
        try {
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planet, sbti }),
          })

          if (res.ok) {
            localStorage.setItem(SYNC_DONE_KEY, new Date().toISOString())
          }
        } catch {
          // Sync failed  -  will retry on next page load
        }
      }

      // -- DOWNLOAD: restore DB data to localStorage if local is empty -
      if (!planet || !sbti) {
        try {
          const res = await fetch('/api/me')
          if (!res.ok) return
          const data = await res.json()

          // Restore planet to localStorage
          if (!planet && data.planet) {
            const restored = {
              id: data.planet.id,
              name: data.planet.name,
              avatarSymbol: data.planet.avatarSymbol,
              tagline: data.planet.tagline ?? undefined,
              role: data.planet.role ?? 'explorer',
              mood: data.planet.mood ?? 'calm',
              style: data.planet.style ?? 'minimal',
              lifestyle: data.planet.lifestyle ?? 'solitary',
              coreThemes: data.planet.coreThemes ?? [],
              contentFragments: data.planet.contentFragments ?? [],
              visual: data.planet.visual ?? {},
              cognitiveAxes: {
                abstract: data.planet.abstractAxis ?? 50,
                introspective: data.planet.introspectiveAxis ?? 50,
              },
              emotionalBars: [],
              createdAt: data.planet.createdAt,
              userId: data.planet.userId,
              // Profile-level fields
              ...(data.profile ? {
                location: data.profile.location ?? undefined,
                languages: data.profile.languages ?? [],
                culturalTags: data.profile.culturalTags ?? [],
                travelCities: data.profile.travelCities ?? [],
                musicTaste: data.profile.musicTaste ?? [],
                bookTaste: data.profile.bookTaste ?? [],
                filmTaste: data.profile.filmTaste ?? [],
                communicationStyle: data.profile.communicationStyle ?? undefined,
                matchPreference: data.profile.matchPreference ?? 'mixed',
                sbtiType: data.profile.sbtiType ?? undefined,
                sbtiCn: data.profile.sbtiCn ?? undefined,
                sbtiPattern: data.profile.sbtiPattern ?? undefined,
              } : {}),
            }
            savePlanetProfile(restored)
          }

          // Restore SBTI to localStorage
          if (!sbti && data.profile?.sbtiType) {
            saveSbtiResult({
              typeCode: data.profile.sbtiType,
              typeCn: data.profile.sbtiCn ?? '',
              patternString: data.profile.sbtiPattern ?? '',
              scores: {},
              confidencePercent: 100,
              completedAt: data.profile.updatedAt ?? new Date().toISOString(),
            })
          }

          // Mark sync done so upload doesn't overwrite on next load
          if (!localStorage.getItem(SYNC_DONE_KEY)) {
            localStorage.setItem(SYNC_DONE_KEY, new Date().toISOString())
          }

          // Reload so pages see the restored data
          if ((!planet && data.planet) || (!sbti && data.profile?.sbtiType)) {
            window.location.reload()
          }
        } catch {
          // Fetch failed  -  will retry on next page load
        }
      }
    }

    sync()
  }, [])
}
