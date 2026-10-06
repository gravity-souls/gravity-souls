'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import OrbitCard from '@/components/ui/OrbitCard'
import EmptyState from '@/components/ui/EmptyState'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { PlanetProfile } from '@/types/planet'
import { hasDistinctPlanetName, planetDisplayName } from '@/lib/planet-display-name'

interface GalaxyResult {
  id: string
  slug: string
  name: string
  symbol: string
  tagline: string | null
  accentColor: string
}

interface EventResult {
  id: string
  title: string
  date: string
  category: string
  galaxySlug: string
  galaxyName: string
}

interface SearchResults {
  planets: PlanetProfile[]
  galaxies: GalaxyResult[]
  events: EventResult[]
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--foreground)' }}>
      {children}
    </h2>
  )
}

function SearchResultsPage() {
  const t = useTranslations('search')
  const tMyPlanet = useTranslations('myPlanet')
  const searchParams = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim()

  const [results, setResults] = useState<SearchResults | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)

      if (!query) {
        setResults({ planets: [], galaxies: [], events: [] })
        setLoading(false)
        return
      }

      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : { planets: [], galaxies: [], events: [] }))
        .then((data: SearchResults) => {
          if (!cancelled) setResults(data)
        })
        .catch(() => {
          if (!cancelled) setResults({ planets: [], galaxies: [], events: [] })
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })

    return () => { cancelled = true }
  }, [query])

  const hasAnyResults = !!results && (results.planets.length > 0 || results.galaxies.length > 0 || results.events.length > 0)

  return (
    <AppShell>
      <div className="px-4 sm:px-6 pt-8 pb-24 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-8" style={{ color: 'var(--foreground)' }}>
          {t('resultsFor', { query })}
        </h1>

        {loading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        )}

        {!loading && !hasAnyResults && (
          <EmptyState symbol="◌" title={t('noResults')} subtitle={t('noResultsDescription')} size="md" />
        )}

        {!loading && results && results.planets.length > 0 && (
          <section className="mb-10">
            <SectionHeading>{t('planets')}</SectionHeading>
            <div className="flex flex-col gap-3">
              {results.planets.map((planet) => (
                <Link key={planet.id} href={`/planet/${planet.id}`} className="no-underline">
                  <OrbitCard glowColor="#a78bfa" className="p-4">
                    <div className="flex items-center gap-4">
                      <PlanetAvatar planetConfig={planet.planetConfig} textureFile={planet.visual?.textureFile ?? 'jupiter.jpg'} size={44} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{planetDisplayName(planet)}</p>
                        {hasDistinctPlanetName(planet) && (
                          <p className="text-[10px] truncate" style={{ color: 'var(--ghost)' }}>
                            {tMyPlanet('planetName')}: {planet.name.trim()}
                          </p>
                        )}
                        {planet.tagline && (
                          <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>{planet.tagline}</p>
                        )}
                      </div>
                    </div>
                  </OrbitCard>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && results && results.galaxies.length > 0 && (
          <section className="mb-10">
            <SectionHeading>{t('galaxies')}</SectionHeading>
            <div className="flex flex-col gap-3">
              {results.galaxies.map((galaxy) => (
                <Link key={galaxy.id} href={`/galaxy/${galaxy.slug}`} className="no-underline">
                  <OrbitCard glowColor={galaxy.accentColor} className="p-4">
                    <div className="flex items-center gap-4">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg"
                        style={{ background: `${galaxy.accentColor}18`, border: `1px solid ${galaxy.accentColor}55`, color: galaxy.accentColor }}
                      >
                        {galaxy.symbol}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{galaxy.name}</p>
                        {galaxy.tagline && (
                          <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>{galaxy.tagline}</p>
                        )}
                      </div>
                    </div>
                  </OrbitCard>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && results && results.events.length > 0 && (
          <section>
            <SectionHeading>{t('events')}</SectionHeading>
            <div className="flex flex-col gap-3">
              {results.events.map((event) => (
                <Link key={event.id} href={`/galaxy/${event.galaxySlug}`} className="no-underline">
                  <OrbitCard glowColor="#60a5fa" className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>{event.title}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>
                          {new Date(event.date).toLocaleDateString()} · {event.galaxyName}
                        </p>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: '#60a5fa' }}>{t('viewGalaxy')}</span>
                    </div>
                  </OrbitCard>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResultsPage />
    </Suspense>
  )
}
