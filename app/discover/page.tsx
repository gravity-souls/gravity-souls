'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import GlowButton from '@/components/ui/GlowButton'
import OrbitCard from '@/components/ui/OrbitCard'
import Tag from '@/components/ui/Tag'
import LightCone from '@/components/fx/LightCone'
import EmptyState from '@/components/ui/EmptyState'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { PlanetProfile } from '@/types/planet'
import { getResonanceMatches } from '@/lib/match'
import { buildPlanetFromDraft } from '@/lib/planet-builder'
import { getPlanetProfile, getOrCreateUserId } from '@/lib/user'
import { getTextureFile } from '@/lib/planet-textures'

// --- Helper: convert DB planet to PlanetProfile for matching engine ----------

function dbPlanetToProfile(data: Record<string, unknown>): PlanetProfile {
  return {
    id: data.id as string,
    name: (data.name as string) || 'Unknown',
    avatarSymbol: (data.avatarSymbol as string) || '?',
    tagline: (data.tagline as string) ?? undefined,
    role: 'resonator',
    mood: (data.mood as PlanetProfile['mood']) ?? 'calm',
    style: (data.style as PlanetProfile['style']) ?? 'minimal',
    lifestyle: (data.lifestyle as PlanetProfile['lifestyle']) ?? 'solitary',
    coreThemes: (data.coreThemes as string[]) ?? [],
    contentFragments: (data.contentFragments as string[]) ?? [],
    visual: (data.visual as PlanetProfile['visual']) ?? {
      coreColor: '#a78bfa',
      accentColor: '#c4b5fd',
      ringStyle: 'single' as const,
      surfaceStyle: 'smooth' as const,
      satelliteCount: 1,
      size: 'lg' as const,
    },
    cognitiveAxes: {
      abstract: (data.abstractAxis as number) ?? 50,
      introspective: (data.introspectiveAxis as number) ?? 50,
    },
    emotionalBars: [],
    location: (data.location as string) ?? undefined,
    languages: (data.languages as string[]) ?? [],
    culturalTags: (data.culturalTags as string[]) ?? [],
    travelCities: (data.travelCities as string[]) ?? [],
    musicTaste: (data.musicTaste as string[]) ?? [],
    bookTaste: (data.bookTaste as string[]) ?? [],
    filmTaste: (data.filmTaste as string[]) ?? [],
    communicationStyle: (data.communicationStyle as PlanetProfile['communicationStyle']) ?? undefined,
    matchPreference: (data.matchPreference as PlanetProfile['matchPreference']) ?? 'mixed',
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
    userId: (data.userId as string) ?? '',
  }
}

// --- Resonance bar -----------------------------------------------------------

function ResonanceBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(score, 100)}%`, background: color }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color }}>
        {score}%
      </span>
    </div>
  )
}

// --- Planet card for discover ------------------------------------------------

function DiscoverPlanetCard({ planet, score }: { planet: PlanetProfile; score: number }) {
  const color = planet.visual?.coreColor ?? '#a78bfa'

  return (
    <Link href={`/planet/${planet.id}`}>
      <OrbitCard hoverable lift glowColor={color} className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-4">
          <PlanetAvatar
            textureFile={getTextureFile([planet.mood, planet.lifestyle, ...planet.coreThemes])}
            size={48}
            glowColor={color}
          />
          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
              {planet.name}
            </h3>
            {planet.tagline && (
              <p className="text-xs italic leading-snug truncate" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                &ldquo;{planet.tagline}&rdquo;
              </p>
            )}
          </div>
        </div>

        {planet.coreThemes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {planet.coreThemes.slice(0, 5).map((theme) => (
              <Tag key={theme} label={theme} variant="dim" />
            ))}
          </div>
        )}

        <ResonanceBar score={score} color={color} />
      </OrbitCard>
    </Link>
  )
}

// --- Page --------------------------------------------------------------------

export default function DiscoverPage() {
  const [myPlanet, setMyPlanet] = useState<PlanetProfile | null>(null)
  const [otherPlanets, setOtherPlanets] = useState<PlanetProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Load my planet first (from API or localStorage)
      let mine: PlanetProfile | null = null
      try {
        const res = await fetch('/api/my-planet')
        if (res.ok) {
          const data = await res.json()
          mine = dbPlanetToProfile(data)
        }
      } catch { /* ignore */ }

      if (!mine) {
        mine = getPlanetProfile()
      }
      if (!mine) {
        const uid = getOrCreateUserId()
        const { INITIAL_DRAFT } = await import('@/types/creation')
        mine = buildPlanetFromDraft(INITIAL_DRAFT, uid)
      }
      setMyPlanet(mine)

      // Load other planets from DB
      try {
        const res = await fetch('/api/planets')
        if (res.ok) {
          const data = await res.json()
          const planets = (data as Record<string, unknown>[]).map(dbPlanetToProfile)
          setOtherPlanets(planets)
        } else if (res.status === 401) {
          setError('Sign in to discover other planets')
        }
      } catch {
        setError('Failed to load planets')
      }

      setLoading(false)
    }

    load()
  }, [])

  // Score and sort planets by resonance
  const scored = myPlanet
    ? otherPlanets
        .map((p) => {
          const matches = getResonanceMatches(myPlanet, [p], 1)
          return { planet: p, score: matches[0]?.strength ?? 0 }
        })
        .sort((a, b) => b.score - a.score)
    : otherPlanets.map((p) => ({ planet: p, score: 0 }))

  return (
    <AppShell>
      <LightCone origin="top-left" color="rgba(129,140,248,1)" opacity={0.07} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-16 max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex flex-col gap-3 mb-10">
          <span
            className="text-xs font-medium tracking-[0.3em] uppercase"
            style={{ color: 'var(--star)', opacity: 0.6 }}
          >
            Resonance map
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
            Discover planets
          </h1>
          <p className="text-sm max-w-lg leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.7 }}>
            Planets in your gravitational field, ranked by resonance strength.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--star)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {error && (
          <EmptyState
            symbol="&#9676;"
            title="Cannot discover"
            subtitle={error}
            action={<GlowButton href="/sign-in" variant="primary">Sign in</GlowButton>}
            className="mt-8"
          />
        )}

        {!loading && !error && scored.length === 0 && (
          <EmptyState
            symbol="&#9676;"
            title="Empty cosmos"
            subtitle="No other planets have formed yet. You are the first explorer in this region."
            className="mt-8"
          />
        )}

        {!loading && !error && scored.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scored.map(({ planet, score }) => (
              <DiscoverPlanetCard key={planet.id} planet={planet} score={score} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
