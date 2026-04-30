'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import EmptyState from '@/components/ui/EmptyState'
import Tag from '@/components/ui/Tag'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import ResonanceRadar from '@/components/planet/ResonanceRadar'
import ResonantMatchesCarousel from '@/components/planet/ResonantMatchesCarousel'
import UpcomingActivityCard from '@/components/planet/UpcomingActivityCard'
import RecommendedCommunities from '@/components/planet/RecommendedCommunities'
import SharedMomentsFeed from '@/components/planet/SharedMomentsFeed'
import { resolvePlanetTexture } from '@/lib/planet-textures'
import { getPlanetProfile, getSbtiResult } from '@/lib/user'
import { getResonanceMatches } from '@/lib/match'
import { MOCK_GALAXIES } from '@/lib/mock-galaxies'
import { mockPlanets } from '@/lib/mock-planets'
import { getSharedPostsForPlanets } from '@/lib/mock-posts'
import type { PlanetProfile } from '@/types/planet'
import type { GalaxyPreview } from '@/types/galaxy'
import type { ActivityEvent } from '@/components/planet/UpcomingActivityCard'

const DEFAULT_VISUAL: PlanetProfile['visual'] = {
  coreColor: '#a78bfa',
  accentColor: '#c4b5fd',
  ringStyle: 'single',
  surfaceStyle: 'smooth',
  satelliteCount: 1,
  size: 'lg',
}

const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

// --- Mock data for dashboard sections ----------------------------------------

const MOCK_ACTIVITY: ActivityEvent = {
  id: 'evt-001',
  title: 'Stargazers Gathering',
  subtitle: 'Night Sky Watch Party',
  date: '2026-05-30',
  time: '8:30 PM',
  location: 'Echo Ridge, Blue Mountains',
  tags: ['Night Walk', 'Outdoors'],
  accentColor: '#a78bfa',
  href: '/galaxy/slow-thinkers',
}

function getRecommendedGalaxies(): GalaxyPreview[] {
  return MOCK_GALAXIES.slice(0, 3).map((g) => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    symbol: g.symbol,
    tagline: g.tagline,
    keywords: g.keywords,
    mood: g.mood,
    memberCount: g.memberCount,
    maturity: g.maturity,
    accentColor: g.accentColor,
  }))
}

function fallbackResonanceScore(id: string): number {
  const seed = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 40 + (seed % 51)
}

// --- Page --------------------------------------------------------------------

export default function MyPlanetPage() {
  const [planet, setPlanet]       = useState<PlanetProfile | null>(null)
  const [otherPlanets, setOtherPlanets] = useState<PlanetProfile[]>([])
  const hydrated = useHydrated()
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      let p: PlanetProfile | null = null

      // 1. Try loading from DB via API (single source of truth)
      try {
        const [planetRes, meRes] = await Promise.all([
          fetch('/api/my-planet'),
          fetch('/api/me'),
        ])

        if (planetRes.ok) {
          const data = await planetRes.json()
          const meData = meRes.ok ? await meRes.json() : null
          const visual = { ...DEFAULT_VISUAL, ...((data.visual as Partial<PlanetProfile['visual']>) ?? {}) }

          p = {
            id: data.id,
            name: data.name,
            avatarSymbol: data.avatarSymbol,
            tagline: data.tagline ?? undefined,
            role: data.role ?? 'explorer',
            mood: data.mood ?? 'calm',
            style: data.style ?? 'minimal',
            lifestyle: data.lifestyle ?? 'solitary',
            coreThemes: data.coreThemes ?? [],
            contentFragments: data.contentFragments ?? [],
            visual,
            cognitiveAxes: {
              abstract: data.abstractAxis ?? 50,
              introspective: data.introspectiveAxis ?? 50,
            },
            emotionalBars: [],
            createdAt: data.createdAt,
            userId: data.userId,
            ...(meData?.profile ? {
              location: meData.profile.location ?? undefined,
              languages: meData.profile.languages ?? [],
              culturalTags: meData.profile.culturalTags ?? [],
              travelCities: meData.profile.travelCities ?? [],
              musicTaste: meData.profile.musicTaste ?? [],
              bookTaste: meData.profile.bookTaste ?? [],
              filmTaste: meData.profile.filmTaste ?? [],
              communicationStyle: meData.profile.communicationStyle ?? undefined,
              matchPreference: meData.profile.matchPreference ?? 'mixed',
              sbtiType: meData.profile.sbtiType ?? undefined,
              sbtiCn: meData.profile.sbtiCn ?? undefined,
              sbtiPattern: meData.profile.sbtiPattern ?? undefined,
            } : {}),
          } as PlanetProfile
        }
      } catch {
        // API failed - fall back to localStorage
      }

      // 2. Fallback to localStorage if API didn't return a planet
      if (!p) {
        p = getPlanetProfile()
        const sbti = getSbtiResult()
        if (p && !p.sbtiType && sbti) {
          p = { ...p, sbtiType: sbti.typeCode, sbtiCn: sbti.typeCn, sbtiPattern: sbti.patternString }
        }
      }

      if (p) {
        setPlanet(p)

        // Fetch real planets for resonance map
        try {
          const planetsRes = await fetch('/api/planets')
          if (planetsRes.ok) {
            const allPlanets = (await planetsRes.json() as Record<string, unknown>[]).map((data: Record<string, unknown>) => {
              const visual = { ...DEFAULT_VISUAL, ...((data.visual as Partial<PlanetProfile['visual']>) ?? {}) }
              return {
                id: data.id as string,
                name: (data.name as string) || 'Unknown',
                avatarSymbol: (data.avatarSymbol as string) || '?',
                tagline: (data.tagline as string) ?? undefined,
                role: 'resonator' as const,
                mood: (data.mood as PlanetProfile['mood']) ?? 'calm',
                style: (data.style as PlanetProfile['style']) ?? 'minimal',
                lifestyle: (data.lifestyle as PlanetProfile['lifestyle']) ?? 'solitary',
                coreThemes: (data.coreThemes as string[]) ?? [],
                contentFragments: (data.contentFragments as string[]) ?? [],
                visual,
                cognitiveAxes: { abstract: (data.abstractAxis as number) ?? 50, introspective: (data.introspectiveAxis as number) ?? 50 },
                emotionalBars: [],
                createdAt: (data.createdAt as string) ?? new Date().toISOString(),
                userId: (data.userId as string) ?? '',
              } as PlanetProfile
            })
            setOtherPlanets(allPlanets)
          }
        } catch {
          // Fallback: empty resonances
        }
      }

      setLoading(false)
    }

    load()
  }, [])

  if (!hydrated || loading) return null

  // -- Explorer state  -  no planet formed yet ----------------------------------
  if (!planet) {
    return (
      <AppShell noSideNav>
        <div className="min-h-[calc(100vh-var(--nav-h))] flex flex-col items-center justify-center px-6">
          <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.08} double={false} />
          <div className="relative z-10 animate-fade-up">
            <EmptyState
              symbol="◌"
              title="Your planet has not formed yet"
              subtitle="Create your universe first  -  your planet emerges from the same expression. It maps your cognitive style, emotional frequency, and resonance field."
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
  const textureFile = resolvePlanetTexture(planet)

  // --- Derived data for dashboard sections ---
  // Resonant match cards (from DB planets or mock fallback)
  const matchPool = otherPlanets.length > 0 ? otherPlanets : mockPlanets
  const matchEntries = matchPool.slice(0, 6).map((p) => {
    const matches = getResonanceMatches(planet, [p], 1)
    const score = matches[0]?.strength ?? fallbackResonanceScore(p.id)
    // Derive personality traits from mood + coreThemes
    const traits: string[] = []
    if (p.mood) traits.push(p.mood.charAt(0).toUpperCase() + p.mood.slice(1))
    if (p.coreThemes[0]) traits.push(p.coreThemes[0])
    return { planet: p, score, traits }
  })

  // Resonance radar dimensions
  const radarDimensions = [
    { label: 'Introvert', value: planet.cognitiveAxes.introspective },
    { label: 'Empathy', value: planet.emotionalBars.find((b) => b.label === 'Warmth')?.value ?? 55 },
    { label: 'Curious', value: planet.cognitiveAxes.abstract },
    { label: 'Emotional', value: planet.emotionalBars.find((b) => b.label === 'Depth')?.value ?? 60 },
    { label: 'Open-minded', value: planet.emotionalBars.find((b) => b.label === 'Resonance')?.value ?? 65 },
    { label: 'Adventurous', value: Math.min(100, 100 - planet.cognitiveAxes.introspective + 15) },
  ]
  const balance = Math.round(radarDimensions.reduce((sum, d) => sum + d.value, 0) / radarDimensions.length)

  const recommendedGalaxies = getRecommendedGalaxies()
  const sharedMoments = getSharedPostsForPlanets(matchPool, 3)

  return (
    <AppShell>
      <LightCone origin="top-left" color={visual.coreColor} opacity={0.07} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-6 pb-20 max-w-7xl mx-auto">

        {/* ================================================================
            HERO SECTION — 3D planet + identity info
            ================================================================ */}
        <section
          className="relative overflow-hidden rounded-3xl"
          style={{
            background: 'linear-gradient(160deg, rgba(12,8,36,0.90) 0%, rgba(4,3,18,0.95) 100%)',
            border: `1px solid ${visual.coreColor}22`,
            boxShadow: `0 0 80px ${visual.coreColor}12, 0 32px 80px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Atmospheric washes */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
            style={{ background: `radial-gradient(ellipse at 15% 50%, ${visual.coreColor}18 0%, transparent 55%)` }} />
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
            style={{ background: `radial-gradient(ellipse at 85% 20%, ${visual.accentColor}0e 0%, transparent 50%)` }} />
          <div className="absolute top-0 left-8 right-8 h-px pointer-events-none" aria-hidden="true"
            style={{ background: `linear-gradient(90deg, transparent, ${visual.coreColor}55, rgba(255,255,255,0.12), ${visual.coreColor}55, transparent)` }} />

          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 p-8 md:p-12">
            {/* Planet photo */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="relative flex items-center justify-center" style={{ width: 280, height: 280 }}>
                <div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 248,
                    height: 248,
                    background: `radial-gradient(circle, ${visual.coreColor}22 0%, transparent 70%)`,
                    filter: 'blur(6px)',
                  }}
                  aria-hidden="true"
                />
                {visual.ringStyle !== 'none' && (
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: 250,
                      height: 250,
                      border: `1px solid ${visual.coreColor}26`,
                      transform: 'rotate(-14deg) scaleX(1.22)',
                    }}
                    aria-hidden="true"
                  />
                )}
                <PlanetAvatar textureFile={textureFile} size={192} glowColor={visual.coreColor} />
              </div>
            </div>

            {/* Identity column */}
            <div className="flex-1 flex flex-col gap-5 min-w-0 text-center md:text-left pt-2 md:pt-6">
              <p className="text-xs tracking-[0.25em] uppercase font-medium" style={{ color: visual.coreColor, opacity: 0.75 }}>
                Your Planet
              </p>

              <h1
                className="text-4xl sm:text-5xl font-bold leading-tight"
                style={{
                  background: `linear-gradient(135deg, #e8e0ff 0%, ${visual.coreColor} 55%, ${visual.accentColor} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {planet.name}
              </h1>

              {planet.tagline && (
                <p className="text-base italic leading-relaxed max-w-md mx-auto md:mx-0" style={{ color: 'var(--ink)', opacity: 0.70 }}>
                  {planet.tagline}
                </p>
              )}

              {/* Core themes */}
              {planet.coreThemes.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase tracking-widest mr-3" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
                    Core Themes
                  </span>
                  <div className="inline-flex flex-wrap gap-1.5 mt-1">
                    {planet.coreThemes.map((theme) => (
                      <Tag key={theme} label={theme} variant="dim" />
                    ))}
                  </div>
                </div>
              )}

              {/* Mood drift tags */}
              <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
                <span
                  className="text-[10px] uppercase tracking-widest mr-2"
                  style={{ color: 'var(--ghost)', opacity: 0.5, lineHeight: '24px' }}
                >
                  Mood Drift
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full capitalize"
                  style={{ background: `${visual.coreColor}14`, border: `1px solid ${visual.coreColor}28`, color: visual.coreColor }}>
                  {planet.mood}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full capitalize"
                  style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', color: 'var(--star)' }}>
                  {planet.lifestyle}
                </span>
                {planet.communicationStyle && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full capitalize"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)', color: 'var(--ink)' }}>
                    {planet.communicationStyle}
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <GlowButton href="/settings/planet" variant="primary" className="px-5 py-2.5 text-sm">
                  Tune atmosphere ⚙
                </GlowButton>
                <GlowButton href="/sbti?next=/my-planet" variant="ghost" className="px-5 py-2.5 text-sm">
                  ◇ Soul scan
                </GlowButton>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            THREE-COLUMN DASHBOARD ROW
            ================================================================ */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* -- Resonance Overview (radar chart) -- */}
          <OrbitCard glowColor={visual.coreColor} className="lg:col-span-3 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--foreground)' }}>
              Resonance Overview
            </h3>
            <ResonanceRadar
              dimensions={radarDimensions}
              accentColor={visual.coreColor}
              balance={balance}
            />
          </OrbitCard>

          {/* -- Resonant Matches (carousel) -- */}
          <OrbitCard glowColor={visual.accentColor} className="lg:col-span-6 p-5">
            <ResonantMatchesCarousel matches={matchEntries} />
          </OrbitCard>

          {/* -- Upcoming Activity -- */}
          <OrbitCard glowColor="#a78bfa" className="lg:col-span-3 p-0 overflow-hidden">
            <div className="p-4 pb-0">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--foreground)' }}>
                Upcoming Activity
              </h3>
            </div>
            <UpcomingActivityCard event={MOCK_ACTIVITY} />
          </OrbitCard>
        </div>

        {/* ================================================================
            RECOMMENDED COMMUNITIES
            ================================================================ */}
        <OrbitCard glowColor={visual.coreColor} className="mt-4 p-5">
          <RecommendedCommunities galaxies={recommendedGalaxies} />
        </OrbitCard>

        {/* ================================================================
            SHARED MOMENTS + FOOTER IDENTITY
            ================================================================ */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Inspirational quote */}
          <div
            className="lg:col-span-2 flex flex-col items-center justify-center p-5 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3"
              style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <span style={{ color: 'var(--star)', fontSize: 14 }}>◎</span>
            </div>
            <p className="text-[11px] text-center italic leading-relaxed" style={{ color: 'var(--ghost)' }}>
              You are not lost.<br />
              You are becoming.
            </p>
          </div>

          {/* Shared Moments feed */}
          <div className="lg:col-span-10">
            <OrbitCard glowColor={visual.accentColor} className="p-5">
              <SharedMomentsFeed moments={sharedMoments} />
            </OrbitCard>
          </div>
        </div>

        {/* ================================================================
            BOTTOM IDENTITY BAR
            ================================================================ */}
        <div
          className="mt-6 flex items-center gap-4 px-5 py-3.5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <PlanetAvatar
            textureFile={textureFile}
            size={36}
            glowColor={visual.coreColor}
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              {planet.name}
            </span>
            <span className="text-[10px] capitalize" style={{ color: 'var(--ghost)' }}>
              {planet.role}
            </span>
          </div>
          <div className="ml-auto flex gap-2">
            <GlowButton href="/stream" variant="secondary" className="py-2 px-4 text-xs">
              Explore the stream
            </GlowButton>
            <GlowButton href="/resonance" variant="ghost" className="py-2 px-4 text-xs">
              Open resonance
            </GlowButton>
          </div>
        </div>

      </div>
    </AppShell>
  )
}
