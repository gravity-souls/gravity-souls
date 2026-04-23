'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import LightCone from '@/components/fx/LightCone'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import { getTextureFile, getDefaultGlowColor } from '@/lib/planet-textures'
import type { PlanetProfile } from '@/types/planet'

// --- Helper: convert DB planet to PlanetProfile ------------------------------

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
      coreColor: '#a78bfa', accentColor: '#c4b5fd',
      ringStyle: 'single' as const, surfaceStyle: 'smooth' as const,
      satelliteCount: 1, size: 'lg' as const,
    },
    cognitiveAxes: {
      abstract: (data.abstractAxis as number) ?? 50,
      introspective: (data.introspectiveAxis as number) ?? 50,
    },
    emotionalBars: [],
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
    userId: (data.userId as string) ?? '',
  }
}

// --- Planet stream card -------------------------------------------------------

function StreamCard({ planet, index }: { planet: PlanetProfile; index: number }) {
  const { visual } = planet
  // Stagger float animation per card
  const floatDelay = `${(index * 0.4) % 2.4}s`

  return (
    <Link
      href={`/planet/${planet.id}`}
      className="group flex flex-col items-center gap-5 rounded-2xl p-6 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, rgba(28,24,72,0.45) 0%, rgba(12,10,42,0.38) 100%)`,
        border: `1px solid ${visual.coreColor}20`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 0 0 ${visual.coreColor}00`,
        animation: `float 5.5s ease-in-out ${floatDelay} infinite`,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${visual.coreColor}22, 0 0 0 1px ${visual.coreColor}38`
        ;(e.currentTarget as HTMLElement).style.borderColor = `${visual.coreColor}48`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${visual.coreColor}00`
        ;(e.currentTarget as HTMLElement).style.borderColor = `${visual.coreColor}20`
      }}
    >
      {/* Planet avatar with NASA texture */}
      <div className="transition-transform duration-300 group-hover:scale-105">
        <PlanetAvatar
          textureFile={getTextureFile([planet.mood, planet.lifestyle, ...planet.coreThemes])}
          size={100}
          glowColor={visual.coreColor}
        />
      </div>

      {/* Name + tagline */}
      <div className="text-center flex flex-col gap-1">
        <h3
          className="text-base font-bold leading-tight"
          style={{ color: 'var(--foreground)' }}
        >
          {planet.name}
        </h3>
        {planet.tagline && (
          <p
            className="text-xs italic leading-snug line-clamp-2"
            style={{ color: 'var(--ink)', opacity: 0.65 }}
          >
            &ldquo;{planet.tagline}&rdquo;
          </p>
        )}
      </div>

      {/* Attribute chips */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {[planet.mood, planet.style, planet.lifestyle].map((attr) => (
          <span
            key={attr}
            className="px-2 py-0.5 rounded-full text-[10px] capitalize tracking-wide"
            style={{
              background: `${visual.coreColor}10`,
              border: `1px solid ${visual.coreColor}25`,
              color: visual.coreColor,
            }}
          >
            {attr}
          </span>
        ))}
      </div>

      {/* Core themes */}
      <div className="flex flex-wrap justify-center gap-1">
        {planet.coreThemes.slice(0, 2).map((theme) => (
          <span
            key={theme}
            className="text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--ghost)', opacity: 0.55 }}
          >
            {theme}
          </span>
        ))}
      </div>
    </Link>
  )
}

// --- Page ---------------------------------------------------------------------

export default function StreamPage() {
  const [planets, setPlanets] = useState<PlanetProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/planets')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Record<string, unknown>[]) => {
        setPlanets(data.map(dbPlanetToProfile))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-6xl mx-auto">
        <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.07} double={false} />

        <div className="relative z-10 flex flex-col gap-10 animate-fade-up">

          {/* -- Header ---------------------------------------------------- */}
          <SectionHeader
            eyebrow="The stream"
            level={1}
            title="Planets in drift"
            subtitle="Each planet is a mind in motion. Click to enter a universe and discover your resonance with it."
          />

          {/* -- Stream divider ------------------------------------------ */}
          <div className="divider-glow" />

          {loading && (
            <div className="flex items-center justify-center py-20">
              <div
                className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--star)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {!loading && planets.length === 0 && (
            <p className="text-center text-sm py-20" style={{ color: 'var(--ghost)' }}>
              No planets have formed yet. Be the first to create one.
            </p>
          )}

          {/* -- Planet grid --------------------------------------------- */}
          {!loading && planets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {planets.map((planet, i) => (
                <StreamCard key={planet.id} planet={planet} index={i} />
              ))}
            </div>
          )}

          {/* -- Footer note --------------------------------------------- */}
          {!loading && planets.length > 0 && (
            <p className="text-center text-xs" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
              {planets.length} planet{planets.length !== 1 ? 's' : ''} mapped
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
