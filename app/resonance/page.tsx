'use client'

import { useState, useEffect } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import ResonanceOrbitSystem from '@/components/resonance/ResonanceOrbitSystem'
import ResonanceDrawer from '@/components/resonance/ResonanceDrawer'
import MatchReasonLegend from '@/components/resonance/MatchReasonLegend'
import ResonanceEmptyState from '@/components/resonance/ResonanceEmptyState'
import FirstSessionHint from '@/components/resonance/FirstSessionHint'
import FirstMatchCTA from '@/components/resonance/FirstMatchCTA'
import { getHintDismissed, dismissHint } from '@/lib/hints-preferences'
import { buildResonanceSession } from '@/lib/match'
import type { ResonanceSession } from '@/types/match'
import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'

// --- Session stats strip -----------------------------------------------------

function SessionStats({ session }: { session: ResonanceSession }) {
  const t = useTranslations('resonance')
  const locale = useLocale()
  const avg = Math.round(
    session.matches.reduce((sum, m) => sum + m.score, 0) / session.matches.length,
  )
  const topMatch = session.matches[0]
  const date = new Date(session.date).toLocaleDateString(locale, {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div
      className="flex flex-wrap items-center gap-6 px-5 py-3 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(167,139,250,0.08)',
      }}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          {t('sessionDate')}
        </span>
        <span className="text-xs" style={{ color: 'var(--ink)' }}>{date}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          {t('planetsInOrbit', { count: session.matches.length })}
        </span>
        <span className="text-xs" style={{ color: 'var(--ink)' }}>{session.matches.length}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          {t('avgResonance')}
        </span>
        <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>{avg}</span>
      </div>
      {topMatch && (
        <div className="flex flex-col gap-0.5 ml-auto">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
            {t('strongestPull')}
          </span>
          <span className="text-xs font-medium" style={{ color: 'var(--star)' }}>
            {t('signalScore')} {topMatch.score}
          </span>
        </div>
      )}
    </div>
  )
}

// --- Hint strip --------------------------------------------------------------

function HintStrip({ hasActive }: { hasActive: boolean }) {
  const t = useTranslations('resonance')
  return (
    <p
      className="text-center text-[11px] transition-opacity duration-300"
      style={{ color: 'var(--ghost)', opacity: hasActive ? 0 : 0.45 }}
    >
      {t('selectPlanetHint')}
    </p>
  )
}

// --- Page ---------------------------------------------------------------------

export default function ResonancePage() {
  const tNav = useTranslations('nav')
  const t = useTranslations('resonance')
  const [mounted, setMounted]     = useState(false)
  const [role, setRole]           = useState<'explorer' | 'resonator'>('explorer')
  const [myPlanet, setMyPlanet]   = useState<PlanetProfile | null>(null)
  const [session, setSession]     = useState<ResonanceSession | null>(null)
  const [planetById, setPlanetById] = useState<Record<string, PlanetProfile>>({})
  const [activeId, setActiveId]   = useState<string | null>(null)
  const [firstMatchDone, setFirstMatchDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setMounted(true)

      let res: Response
      try {
        res = await fetch('/api/my-planet')
      } catch {
        return
      }

      if (cancelled) return

      if (res.status === 401) { window.location.href = '/sign-in?next=/resonance'; return }
      if (res.status === 404) { window.location.href = '/onboarding'; return }
      if (!res.ok) return

      const data = await res.json() as Record<string, unknown>
      const p: PlanetProfile = {
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
        visual: (data.visual as PlanetProfile['visual']) ?? { coreColor: '#a78bfa', accentColor: '#c4b5fd', ringStyle: 'single' as const, surfaceStyle: 'smooth' as const, satelliteCount: 1, size: 'lg' as const },
        cognitiveAxes: { abstract: (data.abstractAxis as number) ?? 50, introspective: (data.introspectiveAxis as number) ?? 50 },
        emotionalBars: [],
        createdAt: (data.createdAt as string) ?? new Date().toISOString(),
        userId: (data.userId as string) ?? '',
      }

      setMyPlanet(p)
      setRole('resonator')

      // Fetch other planets for resonance session
      fetch('/api/planets')
        .then((r) => (r.ok ? r.json() : []))
        .then((planetData: Record<string, unknown>[]) => {
          if (cancelled) return
          const planets = planetData.map((d) => ({
            id: d.id as string,
            name: (d.name as string) || 'Unknown',
            avatarSymbol: (d.avatarSymbol as string) || '?',
            tagline: (d.tagline as string) ?? undefined,
            role: 'resonator' as const,
            mood: (d.mood as PlanetProfile['mood']) ?? 'calm',
            style: (d.style as PlanetProfile['style']) ?? 'minimal',
            lifestyle: (d.lifestyle as PlanetProfile['lifestyle']) ?? 'solitary',
            coreThemes: (d.coreThemes as string[]) ?? [],
            contentFragments: (d.contentFragments as string[]) ?? [],
            visual: (d.visual as PlanetProfile['visual']) ?? { coreColor: '#a78bfa', accentColor: '#c4b5fd', ringStyle: 'single' as const, surfaceStyle: 'smooth' as const, satelliteCount: 1, size: 'lg' as const },
            cognitiveAxes: { abstract: (d.abstractAxis as number) ?? 50, introspective: (d.introspectiveAxis as number) ?? 50 },
            emotionalBars: [],
            createdAt: (d.createdAt as string) ?? new Date().toISOString(),
            userId: (d.userId as string) ?? '',
          } as PlanetProfile))
          if (planets.length > 0) {
            setSession(buildResonanceSession(p, planets))
            const byId: Record<string, PlanetProfile> = {}
            for (const pl of planets) byId[pl.id] = pl
            setPlanetById(byId)
          }
        })
        .catch(() => { /* no session */ })
    }

    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setFirstMatchDone(getHintDismissed('resonance-first-match-viewed'))
  }, [])

  if (!mounted) return null

  const activeMatch: OrbitMatch | null =
    activeId && session
      ? (session.matches.find((m) => m.planetId === activeId) ?? null)
      : null

  const accentColor = myPlanet?.visual.coreColor ?? '#a78bfa'

  // -- Explorer: no planet → empty state ------------------------------------
  if (role === 'explorer' || !myPlanet || !session) {
    return (
      <AppShell>
        <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.07} double={false} />
        <div className="relative z-10 px-4 sm:px-6 pt-8 pb-20 max-w-5xl mx-auto">

          {/* Header */}
          <div className="flex flex-col gap-2 mb-10">
            <p
              className="text-xs uppercase tracking-[0.25em] font-medium"
              style={{ color: 'var(--star)', opacity: 0.65 }}
            >
              {t('daily')}
            </p>
            <h1
              className="text-4xl sm:text-5xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #e8e0ff 0%, #a78bfa 60%, #818cf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {tNav('resonance')}
            </h1>
            <p className="text-sm" style={{ color: 'var(--ink)', opacity: 0.55 }}>
              {t('orbitSubtitle')}
            </p>
          </div>

          <ResonanceEmptyState />
        </div>
      </AppShell>
    )
  }

  // -- Resonator: full orbital view ------------------------------------------
  return (
    <AppShell>
      <LightCone origin="top-left" color={accentColor} opacity={0.06} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-20 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <p
            className="text-xs uppercase tracking-[0.25em] font-medium"
            style={{ color: accentColor, opacity: 0.7 }}
          >
            {t('daily')}
          </p>
          <h1
            className="text-4xl sm:text-5xl font-bold"
            style={{
              background: `linear-gradient(135deg, #e8e0ff 0%, ${accentColor} 60%, #818cf8 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {tNav('resonance')}
          </h1>
          <p className="text-sm max-w-xl" style={{ color: 'var(--ink)', opacity: 0.55 }}>
            {t('orbitSubtitle')}
          </p>
        </div>

        {/* Session stats */}
        <SessionStats session={session} />
        {firstMatchDone && <FirstSessionHint />}
        {!firstMatchDone && session.matches.length > 0 && (
          <FirstMatchCTA
            topMatch={session.matches[0]}
            activeId={activeId}
            onReveal={() => setActiveId(session.matches[0].planetId)}
            onComplete={() => {
              dismissHint('resonance-first-session')
              setFirstMatchDone(true)
            }}
          />
        )}

        {/* Main layout: orbit system + drawer */}
        <div className="mt-8 flex flex-col lg:flex-row gap-6 items-start">

          {/* Orbit system */}
          <div className="flex-1 flex flex-col items-center gap-5">

            {/* Legend */}
            <MatchReasonLegend
              active={activeMatch?.primaryReason}
              className="justify-center"
            />

            {/* The orbital visualization */}
            <div
              className="relative w-full flex items-center justify-center py-6 rounded-3xl overflow-hidden"
              style={{
                background: 'radial-gradient(ellipse at 50% 50%, rgba(167,139,250,0.04) 0%, transparent 70%), rgba(255,255,255,0.01)',
                border: '1px solid rgba(167,139,250,0.07)',
                minHeight: 400,
              }}
            >
              {/* Ambient glow behind center */}
              <div
                className="absolute pointer-events-none"
                aria-hidden="true"
                style={{
                  width: 200, height: 200,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${accentColor}10 0%, transparent 70%)`,
                  top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <ResonanceOrbitSystem
                sourcePlanet={myPlanet}
                matches={session.matches}
                activeId={activeId}
                onSelect={setActiveId}
                size={480}
                planetById={planetById}
              />
            </div>

            <HintStrip hasActive={activeId !== null} />
          </div>

          {/* Inline drawer panel for desktop  -  shown as bottom panel on mobile */}
          <ResonanceDrawer
            match={activeMatch}
            onClose={() => setActiveId(null)}
            planetById={planetById}
          />
        </div>

        {/* Mobile: selected match summary card when no drawer */}
        {activeMatch && (
          <div
            className="lg:hidden mt-6 px-5 py-4 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(167,139,250,0.10)',
            }}
          >
            <p className="text-xs" style={{ color: 'var(--ghost)' }}>
              {t('desktopDetailHint')}
            </p>
          </div>
        )}

      </div>
    </AppShell>
  )
}
