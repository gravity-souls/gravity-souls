'use client'

import { useState, useEffect, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import ResonanceExperience from '@/components/resonance/ResonanceExperience'
import ResonanceHeader from '@/components/resonance/ResonanceHeader'
import ResonanceDrawer from '@/components/resonance/ResonanceDrawer'
import ResonanceEmptyState from '@/components/resonance/ResonanceEmptyState'
import FirstSessionHint from '@/components/resonance/FirstSessionHint'
import FirstMatchCTA from '@/components/resonance/FirstMatchCTA'
import { subscribeSocialRefresh } from '@/lib/social-refresh'
import { dismissHint } from '@/lib/hints-preferences'
import { useHintDismissed } from '@/lib/hooks/useHintDismissed'
import { localizeResonanceMatch } from '@/lib/resonance-presentation'
import { buildResonanceSession } from '@/lib/match'
import type { ResonanceSession } from '@/types/match'
import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'

// --- Session stats strip -----------------------------------------------------

function SessionStats({ session }: { session: ResonanceSession }) {
  const t = useTranslations('resonance')
  const locale = useLocale()
  const avg = Math.round(
    session.matches.reduce((sum, m) => sum + m.score, 0) /
      session.matches.length,
  )
  const topMatch = session.matches[0]
  const date = new Date(session.date).toLocaleDateString(locale, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
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
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--ghost)', opacity: 0.55 }}
        >
          {t('sessionDate')}
        </span>
        <span className="text-xs" style={{ color: 'var(--ink)' }}>
          {date}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--ghost)', opacity: 0.55 }}
        >
          {t('planetsInOrbit', { count: session.matches.length })}
        </span>
        <span className="text-xs" style={{ color: 'var(--ink)' }}>
          {session.matches.length}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: 'var(--ghost)', opacity: 0.55 }}
        >
          {t('avgResonance')}
        </span>
        <span className="text-xs font-medium" style={{ color: '#a78bfa' }}>
          {avg}
        </span>
      </div>
      {topMatch && (
        <div className="flex flex-col gap-0.5 ml-auto">
          <span
            className="text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--ghost)', opacity: 0.55 }}
          >
            {t('strongestPull')}
          </span>
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--star)' }}
          >
            {t('signalScore')} {topMatch.score}
          </span>
        </div>
      )}
    </div>
  )
}

// --- Page ---------------------------------------------------------------------

export default function ResonancePage() {
  const td = useTranslations('discoveryPreferences')
  const tNav = useTranslations('nav')
  const t = useTranslations('resonance')
  const tCommon = useTranslations('common')
  const tTraits = useTranslations('creationSteps')
  const [mounted, setMounted] = useState(false)
  const [role, setRole] = useState<'explorer' | 'resonator'>('explorer')
  const [myPlanet, setMyPlanet] = useState<PlanetProfile | null>(null)
  const [session, setSession] = useState<ResonanceSession | null>(null)
  const [planetById, setPlanetById] = useState<Record<string, PlanetProfile>>(
    {},
  )
  const [activeId, setActiveId] = useState<string | null>(null)
  const firstMatchDone = useHintDismissed('resonance-first-match-viewed')

  function selectMatch(id: string | null) {
    setActiveId(id)
    if (id !== null && !firstMatchDone) {
      dismissHint('resonance-first-match-viewed')
      dismissHint('resonance-first-session')
    }
  }

  useEffect(() => {
    let cancelled = false
    let generation = 0

    async function load() {
      const current = ++generation
      setSession(null)
      setPlanetById({})
      setActiveId(null)
      setMounted(true)

      let res: Response
      try {
        res = await fetch('/api/my-planet')
      } catch {
        return
      }

      if (cancelled || current !== generation) return

      // A single 401 right after landing here can be WebKit's cookie jar not
      // having committed the session yet rather than a real unauthenticated
      // state — retry once before bouncing to sign-in.
      if (res.status === 401) {
        try {
          res = await fetch('/api/my-planet')
        } catch {
          return
        }
        if (cancelled || current !== generation) return
      }

      if (res.status === 401) {
        window.location.href = '/sign-in?next=/resonance'
        return
      }
      if (res.status === 404) {
        window.location.href = '/onboarding'
        return
      }
      if (!res.ok) return

      const data = (await res.json()) as Record<string, unknown>
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
        visual: (data.visual as PlanetProfile['visual']) ?? {
          coreColor: '#a78bfa',
          accentColor: '#c4b5fd',
          ringStyle: 'none' as const,
          surfaceStyle: 'smooth' as const,
          satelliteCount: 1,
          size: 'lg' as const,
        },
        planetConfig:
          (data.planetConfig as PlanetProfile['planetConfig']) ?? undefined,
        cognitiveAxes: {
          abstract: (data.abstractAxis as number) ?? 50,
          introspective: (data.introspectiveAxis as number) ?? 50,
        },
        emotionalBars: [],
        createdAt: (data.createdAt as string) ?? new Date().toISOString(),
        userId: (data.userId as string) ?? '',
      }

      setMyPlanet(p)
      setRole('resonator')

      // Fetch other planets for resonance session
      fetch('/api/planets')
        .then((r) => (r.ok ? r.json() : { planets: [] }))
        .then(
          ({ planets: planetData }: { planets: Record<string, unknown>[] }) => {
            if (cancelled || current !== generation) return
            const planets = planetData.map(
              (d) =>
                ({
                  id: d.id as string,
                  publicTags: d.publicTags as PlanetProfile['publicTags'],
                  preferenceFit: d.preferenceFit as PlanetProfile['preferenceFit'],
                  name: (d.name as string) || 'Unknown',
                  avatarSymbol: (d.avatarSymbol as string) || '?',
                  tagline: (d.tagline as string) ?? undefined,
                  role: 'resonator' as const,
                  mood: (d.mood as PlanetProfile['mood']) ?? 'calm',
                  style: (d.style as PlanetProfile['style']) ?? 'minimal',
                  lifestyle:
                    (d.lifestyle as PlanetProfile['lifestyle']) ?? 'solitary',
                  coreThemes: (d.coreThemes as string[]) ?? [],
                  contentFragments: (d.contentFragments as string[]) ?? [],
                  visual: (d.visual as PlanetProfile['visual']) ?? {
                    coreColor: '#a78bfa',
                    accentColor: '#c4b5fd',
                    ringStyle: 'none' as const,
                    surfaceStyle: 'smooth' as const,
                    satelliteCount: 1,
                    size: 'lg' as const,
                  },
                  planetConfig:
                    (d.planetConfig as PlanetProfile['planetConfig']) ??
                    undefined,
                  cognitiveAxes: {
                    abstract: (d.abstractAxis as number) ?? 50,
                    introspective: (d.introspectiveAxis as number) ?? 50,
                  },
                  emotionalBars: [],
                  createdAt:
                    (d.createdAt as string) ?? new Date().toISOString(),
                  userId: (d.userId as string) ?? '',
                }) as PlanetProfile,
            )
            if (planets.length > 0) {
              setSession(buildResonanceSession(p, planets))
              const byId: Record<string, PlanetProfile> = {}
              for (const pl of planets) byId[pl.id] = pl
              setPlanetById(byId)
            }
          },
        )
        .catch(() => {
          /* no session */
        })
    }

    void load()
    const unsubscribe = subscribeSocialRefresh(() => { void load() })
    return () => {
      unsubscribe()
      cancelled = true
    }
  }, [])

  const displaySession = useMemo(
    () =>
      session && myPlanet
        ? {
            ...session,
            matches: session.matches.map((match) =>
              planetById[match.planetId]
                ? localizeResonanceMatch(
                    match,
                    myPlanet,
                    planetById[match.planetId],
                    t,
                    tTraits,
                  )
                : match,
            ),
          }
        : session,
    [session, myPlanet, planetById, t, tTraits],
  )
  if (!mounted) return null

  const activeMatch: OrbitMatch | null =
    activeId && displaySession
      ? (displaySession.matches.find((m) => m.planetId === activeId) ?? null)
      : null

  const accentColor = myPlanet?.visual.coreColor ?? '#a78bfa'

  // -- Explorer: no planet → empty state, or Resonator: planet formed but no
  // matches yet. These are different situations and must show different copy
  // — a formed planet must never be told to "begin formation" again.
  const unformed = role === 'explorer' || !myPlanet
  if (unformed || !session) {
    return (
      <AppShell>
        <LightCone
          origin="top-center"
          color="rgba(167,139,250,1)"
          opacity={0.07}
          double={false}
        />
        <div className="relative z-10 px-4 sm:px-6 pt-8 pb-20 max-w-5xl mx-auto">
          <div className="mb-10">
            <ResonanceHeader
              title={tNav('resonance')}
              eyebrow={t('recommendations')}
              subtitle={t('orbitSubtitle')}
            />
          </div>

          {unformed ? (
            <ResonanceEmptyState />
          ) : (
            <ResonanceEmptyState
              title={t('noMatchesTitle')}
              body={t('noMatchesBody')}
              ctaLabel={tCommon('exploreStream')}
              ctaHref="/stream"
            />
          )}
        </div>
      </AppShell>
    )
  }

  // -- Resonator: full orbital view ------------------------------------------
  return (
    <AppShell>
      <LightCone
        origin="top-left"
        color={accentColor}
        opacity={0.06}
        double={false}
      />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-20 max-w-6xl mx-auto">
        <div className="mb-8">
          <ResonanceHeader
            title={tNav('resonance')}
            eyebrow={t('recommendations')}
            subtitle={t('orbitSubtitle')}
            accentColor={accentColor}
          />
        </div>

        {/* Session stats */}
        <SessionStats session={session} />
        {firstMatchDone && <FirstSessionHint />}
        {!firstMatchDone && session.matches.length > 0 && (
          <FirstMatchCTA
            topMatch={displaySession!.matches[0]}
            planet={planetById[session.matches[0].planetId]}
            onReveal={() => selectMatch(session.matches[0].planetId)}
          />
        )}

        <p className="mb-4 text-xs text-slate-400">{td('scoringHint')}</p>
        <ResonanceExperience
          source={myPlanet}
          session={displaySession!}
          planets={planetById}
          activeId={activeId}
          onSelect={selectMatch}
          onClose={() => setActiveId(null)}
        />
      </div>

      {/* Rendered outside the "relative z-10" wrapper above on purpose: that
          div creates its own stacking context, which traps this drawer's
          fixed z-50 panel underneath SideNav's mobile bottom nav (also fixed
          z-50, but a sibling here, not nested inside a lower-z context) —
          the panel's own z-index can never out-rank an ancestor's stacking
          context from the inside. Purely a DOM-position fix: the panel is
          `position: fixed` unconditionally, so it never occupied layout
          space in the flex row above regardless of where it's rendered. */}
      <div className="lg:hidden">
        <ResonanceDrawer
          match={activeMatch}
          onClose={() => setActiveId(null)}
          planetById={planetById}
        />
      </div>
    </AppShell>
  )
}
