'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import EmptyState from '@/components/ui/EmptyState'
import PlanetHero from '@/components/planet/PlanetHero'
import GalaxyMemberships from '@/components/planet/GalaxyMemberships'
import ExplorationTracePanel from '@/components/planet/ExplorationTracePanel'
import SelfPlanetActions from '@/components/planet/SelfPlanetActions'
import { CognitiveStyleModule, EmotionalFrequencyModule, ContentOrbit, ThemeCloud } from '@/components/planet/PlanetModules'
import ResonanceMap from '@/components/planet/ResonanceMap'
import { TYPE_COLORS } from '@/lib/sbti-data'
import { getPlanetProfile, getSbtiResult } from '@/lib/user'
import { getResonanceMatches } from '@/lib/match'
import { mockPlanets } from '@/lib/mock-planets'
import type { PlanetProfile, ResonancePlanet } from '@/types/planet'

// ─── Cultural profile panel ──────────────────────────────────────────────────

function CulturalProfile({ planet }: { planet: PlanetProfile }) {
  const hasCulture  = planet.culturalTags   && planet.culturalTags.length > 0
  const hasCities   = planet.travelCities   && planet.travelCities.length > 0
  const hasMusic    = planet.musicTaste     && planet.musicTaste.length > 0
  const hasBooks    = planet.bookTaste      && planet.bookTaste.length > 0
  const hasFilm     = planet.filmTaste      && planet.filmTaste.length > 0

  if (!hasCulture && !hasCities && !hasMusic && !hasBooks && !hasFilm) return null

  const accent = planet.visual.accentColor

  return (
    <div className="flex flex-col gap-5">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        Cultural orbit
      </span>

      {/* Taste rows */}
      {[
        { label: 'Sounds',       items: planet.musicTaste },
        { label: 'Reading',      items: planet.bookTaste },
        { label: 'Watching',     items: planet.filmTaste },
        { label: 'Touchstones',  items: planet.culturalTags },
      ].filter(({ items }) => items && items.length > 0).map(({ label, items }) => (
        <div key={label} className="flex flex-col gap-1.5">
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--ghost)' }}
          >
            {label}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items!.map((item) => (
              <span
                key={item}
                className="text-[10px] px-2 py-0.5 rounded-md tracking-wide"
                style={{
                  background: `${accent}10`,
                  border: `1px solid ${accent}22`,
                  color: accent,
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      ))}

      {/* Cities */}
      {hasCities && (
        <div className="flex flex-col gap-1.5">
          <p
            className="text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--ghost)' }}
          >
            Orbit cities
          </p>
          <div className="flex flex-wrap gap-2">
            {planet.travelCities!.map((city) => (
              <span
                key={city}
                className="text-xs px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--ink)',
                }}
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SoulScanCard({ planet }: { planet: PlanetProfile }) {
  if (!planet.sbtiType) {
    return (
      <div className="flex flex-col gap-3">
        <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--star)', opacity: 0.55 }}>
          Soul scan
        </span>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ghost)' }}>
          Your planet exists, but its archetype has not been mapped yet.
        </p>
        <GlowButton href="/sbti?next=/my-planet" variant="secondary" className="text-sm">
          Run SBTI →
        </GlowButton>
      </div>
    )
  }

  const accent = TYPE_COLORS[planet.sbtiType] ?? planet.visual.accentColor

  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--star)', opacity: 0.55 }}>
        Soul scan
      </span>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold" style={{ color: accent }}>
            {planet.sbtiType}
          </span>
          {planet.sbtiCn && (
            <span className="text-sm" style={{ color: 'var(--foreground)' }}>
              {planet.sbtiCn}
            </span>
          )}
        </div>
        <span
          className="text-[10px] px-2 py-1 rounded-lg font-mono"
          style={{
            background: `${accent}12`,
            border: `1px solid ${accent}22`,
            color: accent,
          }}
        >
          mapped
        </span>
      </div>
      {planet.sbtiPattern && (
        <p className="text-xs font-mono" style={{ color: 'var(--ghost)' }}>
          {planet.sbtiPattern}
        </p>
      )}
      <GlowButton href="/sbti?next=/my-planet" variant="ghost" className="text-sm">
        Retake soul scan
      </GlowButton>
    </div>
  )
}

// ─── Match preference badge ──────────────────────────────────────────────────

const PREFERENCE_META = {
  similar:       { label: 'Seeks resonance',    description: 'You gravitate toward kindred spirits — planets that share your frequency.',   color: '#a78bfa' },
  complementary: { label: 'Seeks contrast',     description: 'You are drawn to planets that fill in what you lack — difference as gravity.', color: '#34d399' },
  mixed:         { label: 'Open orbit',         description: 'You hold space for both resonance and contrast. Your orbit is wide.',          color: '#fbbf24' },
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MyPlanetPage() {
  const [planet, setPlanet]       = useState<PlanetProfile | null>(null)
  const [resonances, setResonances] = useState<ResonancePlanet[]>([])
  const [mounted, setMounted]     = useState(false)

  useEffect(() => {
    setMounted(true)
    const p = getPlanetProfile()
    const sbti = getSbtiResult()

    if (p) {
      const nextPlanet = !p.sbtiType && sbti
        ? {
            ...p,
            sbtiType: sbti.typeCode,
            sbtiCn: sbti.typeCn,
            sbtiPattern: sbti.patternString,
          }
        : p

      setPlanet(nextPlanet)
      setResonances(getResonanceMatches(nextPlanet, mockPlanets, 4))
    }
  }, [])

  if (!mounted) return null

  // ── Explorer state — no planet formed yet ──────────────────────────────────
  if (!planet) {
    return (
      <AppShell noSideNav>
        <div className="min-h-[calc(100vh-var(--nav-h))] flex flex-col items-center justify-center px-6">
          <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.08} double={false} />
          <div className="relative z-10 animate-fade-up">
            <EmptyState
              symbol="◌"
              title="Your planet has not formed yet"
              subtitle="Create your universe first — your planet emerges from the same expression. It maps your cognitive style, emotional frequency, and resonance field."
              action={
                <GlowButton href="/create-planet" variant="primary" className="px-8 py-4 text-sm">
                  Begin the formation
                </GlowButton>
              }
              size="lg"
            />
          </div>
        </div>
      </AppShell>
    )
  }

  const { visual } = planet
  const matchPref = planet.matchPreference ? PREFERENCE_META[planet.matchPreference] : null

  return (
    <AppShell>
      <LightCone origin="top-left" color={visual.coreColor} opacity={0.07} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-6 pb-20 max-w-6xl mx-auto">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <PlanetHero planet={planet} viewerRole="self" />

        {/* ── Ownership status strip ────────────────────────────────────── */}
        <div
          className="mt-4 flex flex-wrap items-center gap-4 px-5 py-3 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(167,139,250,0.10)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#34d399', boxShadow: '0 0 6px #34d39988' }}
            />
            <span className="text-xs" style={{ color: 'var(--ghost)' }}>
              Planet active · {planet.role}
            </span>
          </div>

          {planet.location && (
            <span className="text-xs" style={{ color: 'var(--ghost)' }}>
              ◎ {planet.location}
            </span>
          )}

          {matchPref && (
            <span
              className="text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full ml-auto"
              style={{
                background: `${matchPref.color}12`,
                border: `1px solid ${matchPref.color}28`,
                color: matchPref.color,
              }}
            >
              {matchPref.label}
            </span>
          )}
        </div>

        {/* ── Main grid ─────────────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left / main column ──────────────────────────────────────── */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Cognitive axes */}
            <OrbitCard glowColor={visual.coreColor} className="p-5">
              <CognitiveStyleModule planet={planet} />
            </OrbitCard>

            {/* Emotional frequency */}
            <OrbitCard glowColor={visual.accentColor} className="p-5">
              <EmotionalFrequencyModule planet={planet} />
            </OrbitCard>

            {/* Content orbit */}
            <OrbitCard glowColor={visual.coreColor} className="p-5">
              <ContentOrbit planet={planet} />
            </OrbitCard>

            {/* Core themes */}
            <OrbitCard glowColor={visual.accentColor} className="p-5">
              <ThemeCloud planet={planet} />
            </OrbitCard>

            {/* Match preference description */}
            {matchPref && (
              <div
                className="px-5 py-4 rounded-2xl"
                style={{
                  background: `${matchPref.color}08`,
                  border: `1px solid ${matchPref.color}20`,
                }}
              >
                <p
                  className="text-xs uppercase tracking-widest mb-1.5"
                  style={{ color: matchPref.color, opacity: 0.75 }}
                >
                  Orbit preference
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.72 }}>
                  {matchPref.description}
                </p>
              </div>
            )}

            {/* Resonance field */}
            {resonances.length > 0 && (
              <OrbitCard glowColor={visual.coreColor} className="p-5">
                <ResonanceMap
                  planets={resonances}
                  hubColor={visual.coreColor}
                  title="Your resonance field"
                />
              </OrbitCard>
            )}

          </div>

          {/* ── Right sidebar ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Self actions */}
            <SelfPlanetActions planet={planet} />

            {/* Soul scan */}
            <OrbitCard glowColor={planet.visual.accentColor} className="p-5">
              <SoulScanCard planet={planet} />
            </OrbitCard>

            {/* Galaxy memberships */}
            {planet.galaxyIds && planet.galaxyIds.length > 0 && (
              <OrbitCard glowColor={visual.coreColor} className="p-5">
                <GalaxyMemberships galaxyIds={planet.galaxyIds} />
              </OrbitCard>
            )}

            {/* Cultural orbit */}
            {(planet.culturalTags || planet.travelCities || planet.musicTaste || planet.bookTaste || planet.filmTaste) && (
              <OrbitCard glowColor={visual.accentColor} className="p-5">
                <CulturalProfile planet={planet} />
              </OrbitCard>
            )}

            {/* Exploration traces */}
            {planet.explorationTraces && planet.explorationTraces.length > 0 && (
              <OrbitCard glowColor={visual.coreColor} className="p-5">
                <ExplorationTracePanel
                  traces={planet.explorationTraces}
                  accentColor={visual.accentColor}
                />
              </OrbitCard>
            )}

          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4 pt-8 mt-4 border-t"
          style={{ borderColor: 'rgba(167,139,250,0.07)' }}
        >
          <GlowButton href="/stream" variant="primary" className="py-3 text-sm">
            Explore the stream
          </GlowButton>
          <GlowButton href="/resonance" variant="secondary" className="py-3 text-sm">
            Open resonance
          </GlowButton>
          <Link
            href="/create-universe"
            className="text-xs transition-colors duration-200 ml-auto"
            style={{ color: 'var(--ghost)', textDecoration: 'none' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--star)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ghost)' }}
          >
            Rebuild your universe →
          </Link>
        </div>

      </div>
    </AppShell>
  )
}
