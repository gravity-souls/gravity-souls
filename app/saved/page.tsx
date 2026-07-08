'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import SavedPlanetCard from '@/components/social/SavedPlanetCard'
import GlowButton from '@/components/ui/GlowButton'
import type { SavedPlanet } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'

// --- API response type -------------------------------------------------------

interface ApiSavedPlanetRow {
  id: string
  planetId: string
  savedAt: string
  label: string | null
  planet: {
    id: string
    name: string
    avatarSymbol: string
    tagline: string | null
    mood: string
    lifestyle: string
    coreThemes: string[]
    visual: Record<string, unknown>
  }
}

// --- Planet profile builder for saved page -----------------------------------

function savedPlanetToProfile(data: ApiSavedPlanetRow['planet']): PlanetProfile {
  const v = (data.visual ?? {}) as Record<string, unknown>
  return {
    id: data.id,
    name: data.name,
    avatarSymbol: data.avatarSymbol,
    tagline: data.tagline ?? undefined,
    role: 'resonator',
    mood: (data.mood as PlanetProfile['mood']) ?? 'calm',
    style: 'minimal',
    lifestyle: (data.lifestyle as PlanetProfile['lifestyle']) ?? 'solitary',
    coreThemes: data.coreThemes,
    contentFragments: [],
    visual: {
      coreColor:      (v.coreColor as string)  ?? '#a78bfa',
      accentColor:    (v.accentColor as string) ?? '#6366f1',
      ringStyle:      'single',
      surfaceStyle:   'smooth',
      satelliteCount: 0,
      size:           'lg',
    },
    cognitiveAxes: { abstract: 50, introspective: 50 },
    emotionalBars: [],
    createdAt: new Date().toISOString(),
    userId: '',
  }
}

// --- SavedPage ----------------------------------------------------------------

export default function SavedPage() {
  const t = useTranslations('savedPage')
  const tCommon = useTranslations('common')
  const [hasPlanet, setHasPlanet] = useState<boolean | null>(null)
  const [items, setItems] = useState<{ saved: SavedPlanet; planet: PlanetProfile }[] | null>(null)
  const [loadError, setLoadError] = useState<'unauthorized' | 'network' | null>(null)

  // Phase 6a: role detection via API (separate effect)
  useEffect(() => {
    let cancelled = false
    fetch('/api/my-planet').then(res => {
      if (!cancelled) setHasPlanet(res.ok)
    }).catch(() => {
      if (!cancelled) setHasPlanet(false)
    })
    return () => { cancelled = true }
  }, [])

  // Saved list loading via API
  useEffect(() => {
    let cancelled = false
    fetch('/api/saved-planets')
      .then(async res => {
        if (cancelled) return
        if (res.status === 401) {
          setLoadError('unauthorized')
          return
        }
        if (!res.ok) {
          setLoadError('network')
          return
        }
        const { savedPlanets }: { savedPlanets: ApiSavedPlanetRow[] } = await res.json()
        setItems(
          savedPlanets.map(row => ({
            saved: {
              planetId: row.planetId,
              savedAt:  row.savedAt,
              label:    row.label ?? undefined,
            },
            planet: savedPlanetToProfile(row.planet),
          }))
        )
      })
      .catch(() => {
        if (!cancelled) setLoadError('network')
      })
    return () => { cancelled = true }
  }, [])

  function handleUnsave(planetId: string) {
    setItems(prev => prev?.filter(x => x.planet.id !== planetId) ?? prev)
  }

  if (hasPlanet === null) return null

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-5xl mx-auto">
        <SectionHeader
          eyebrow={t('eyebrow')}
          level={1}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        {/* 401 — session expired */}
        {loadError === 'unauthorized' && (
          <div className="mt-16 flex flex-col items-center gap-5 text-center max-w-sm mx-auto">
            <p className="text-sm" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
              Your session has expired. Sign in to see your star chart.
            </p>
            <GlowButton href="/sign-in" variant="primary" className="text-sm px-5 py-2">
              Sign in
            </GlowButton>
          </div>
        )}

        {/* Network / other error */}
        {loadError === 'network' && (
          <div className="mt-16 flex flex-col items-center gap-4 text-center max-w-sm mx-auto">
            <p className="text-sm" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
              Couldn&apos;t load your star chart. Check your connection and try again.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {!loadError && items === null && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="rounded-2xl p-5 animate-pulse"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(167,139,250,0.08)',
                  height: 200,
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loadError && items !== null && items.length === 0 && (
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
                {t('emptyTitle')}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
                {t('emptySubtitle')}
              </p>
            </div>
            <GlowButton href="/stream" variant="secondary" className="text-sm px-5 py-2">
              {tCommon('exploreStream')}
            </GlowButton>
          </div>
        )}

        {/* Saved list */}
        {!loadError && items !== null && items.length > 0 && (
          <>
            <p className="mt-2 text-[11px]" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
              {t('charted', { count: items.length })}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(({ saved, planet }) => (
                <SavedPlanetCard
                  key={planet.id}
                  saved={saved}
                  planet={planet}
                  isResonator={hasPlanet === true}
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
