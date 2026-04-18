'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import SavedPlanetCard from '@/components/social/SavedPlanetCard'
import GlowButton from '@/components/ui/GlowButton'
import type { SavedPlanet } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import { getUserRole } from '@/lib/user'
import { getSavedPlanetIds } from '@/lib/social-storage'
import { mockSavedPlanets } from '@/lib/mock-relationships'
import { getPlanetById } from '@/lib/mock-planets'

// --- Build combined saved list ------------------------------------------------
// Merges mock star chart entries with any planets saved via localStorage.
// Real saved-at dates come from mock data; localStorage IDs get a generic entry.

function buildSavedList(): SavedPlanet[] {
  const lsIds   = getSavedPlanetIds()
  const mockIds = mockSavedPlanets.map((s) => s.planetId)

  // localStorage-saved planets not already in mock data
  const extraFromLs: SavedPlanet[] = lsIds
    .filter((id) => !mockIds.includes(id))
    .map((id) => ({ planetId: id, savedAt: new Date().toISOString() }))

  return [...mockSavedPlanets, ...extraFromLs]
}

// --- SavedPage ----------------------------------------------------------------

export default function SavedPage() {
  const [role, setRole]   = useState<'explorer' | 'resonator' | null>(null)
  const [items, setItems] = useState<{ saved: SavedPlanet; planet: PlanetProfile }[]>([])

  useEffect(() => {
    const userRole = getUserRole()
    setRole(userRole)

    const savedList = buildSavedList()
    const resolved = savedList
      .map((saved) => {
        const planet = getPlanetById(saved.planetId)
        return planet ? { saved, planet } : null
      })
      .filter((x): x is { saved: SavedPlanet; planet: PlanetProfile } => x !== null)

    setItems(resolved)
  }, [])

  function handleUnsave(planetId: string) {
    setItems((prev) => prev.filter((x) => x.planet.id !== planetId))
  }

  if (role === null) return null

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-5xl mx-auto">
        <SectionHeader
          eyebrow="Star Chart"
          level={1}
          title="Saved"
          subtitle="Planets you've marked in your personal chart. A map of worlds that resonated."
        />

        {items.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-5 text-center max-w-sm mx-auto">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl"
              style={{
                background: 'rgba(167,139,250,0.06)',
                border: '1px solid rgba(167,139,250,0.12)',
              }}
            >
              ☆
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                Your star chart is empty
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
                When you find a planet worth returning to, save it here.
              </p>
            </div>
            <GlowButton href="/stream" variant="secondary" className="text-sm px-5 py-2">
              Explore the stream
            </GlowButton>
          </div>
        )}

        {items.length > 0 && (
          <>
            <p className="mt-2 text-[11px]" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
              {items.length} planet{items.length === 1 ? '' : 's'} charted
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(({ saved, planet }) => (
                <SavedPlanetCard
                  key={planet.id}
                  saved={saved}
                  planet={planet}
                  isResonator={role === 'resonator'}
                  onUnsave={handleUnsave}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
