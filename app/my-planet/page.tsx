'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import EmptyState from '@/components/ui/EmptyState'
import Tag from '@/components/ui/Tag'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import PlanetCustomizer from '@/components/planet/PlanetCustomizer'
import LevelBadge from '@/components/planet/LevelBadge'
import XPProgressBar from '@/components/planet/XPProgressBar'
import ResonanceRadar from '@/components/planet/ResonanceRadar'
import ResonantMatchesCarousel from '@/components/planet/ResonantMatchesCarousel'
import EventDetail from '@/components/events/EventDetail'
import UpcomingActivityCard from '@/components/planet/UpcomingActivityCard'
import RecommendedCommunities from '@/components/planet/RecommendedCommunities'
import SharedMomentsFeed from '@/components/planet/SharedMomentsFeed'
import CreatePostModal from '@/components/stream/CreatePostModal'
import PostDetail from '@/components/stream/PostDetail'
import PostGrid from '@/components/stream/PostGrid'
import { resolvePlanetHasRing, resolvePlanetTexture } from '@/lib/planet-textures'
import { getPlanetProfile, getSbtiResult } from '@/lib/user'
import { getResonanceMatches } from '@/lib/match'
import { MOCK_GALAXIES } from '@/lib/mock-galaxies'
import { mockPlanets } from '@/lib/mock-planets'
import { getSharedPostsForPlanets } from '@/lib/mock-posts'
import type { PlanetConfig, PlanetProfile } from '@/types/planet'
import type { GalaxyPreview } from '@/types/galaxy'
import type { EventCategory, GalaxyEventDetail, GalaxyEventSummary } from '@/types/event'
import type { ActivityEvent } from '@/components/planet/UpcomingActivityCard'
import type { StreamPost } from '@/types/stream'

interface XPSummary {
  xp: number
  userLevel: number
}

interface UniverseSummary {
  signalScore: number
  linkedPlanets: number
}

const PlanetGlobe = dynamic(() => import('@/components/planet/PlanetGlobe'), { ssr: false })

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

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isDesktop
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function optionalStringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function planetConfigFromSource(source: unknown, planet: PlanetProfile): PlanetConfig {
  const config = isRecord(source) ? source : {}

  return {
    baseTexture: stringValue(config.baseTexture ?? config.planetTexture, resolvePlanetTexture(planet)),
    tintColor: stringValue(config.tintColor ?? config.planetTint, planet.visual.coreColor),
    atmosphereColor: stringValue(config.atmosphereColor ?? config.planetAtmoColor, planet.visual.accentColor),
    atmosphereDensity: numberValue(config.atmosphereDensity ?? config.planetAtmoDensity, 0.12),
    hasRing: booleanValue(config.hasRing ?? config.planetHasRing, resolvePlanetHasRing()),
    ringColor: stringValue(config.ringColor ?? config.planetRingColor, planet.visual.accentColor),
    rotationSpeed: numberValue(config.rotationSpeed ?? config.planetRotationSpeed, 0.018),
    cloudOpacity: numberValue(config.cloudOpacity ?? config.planetCloudOpacity, 0),
    customTextureUrl: optionalStringValue(config.customTextureUrl ?? config.planetCustomTexture),
  }
}

const CATEGORY_LABELS: Record<EventCategory, string> = {
  MEETUP: 'Meetup',
  ONLINE: 'Online',
  WORKSHOP: 'Workshop',
  STARGAZING: 'Stargazing',
  DISCUSSION: 'Discussion',
  OTHER: 'Other',
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

function toActivityEvent(event: GalaxyEventSummary, fallbackAccent: string): ActivityEvent {
  const date = new Date(event.date)

  return {
    id: event.id,
    title: event.title,
    subtitle: event.galaxy?.name ?? event.description,
    date: event.date,
    time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date),
    location: event.location ?? (event.onlineUrl ? 'Online' : undefined),
    tags: [CATEGORY_LABELS[event.category], event.userHasRSVPed ? 'Going' : 'Open'],
    imageUrl: event.coverImage ?? undefined,
    accentColor: event.galaxy?.accentColor ?? fallbackAccent,
  }
}

// --- Page --------------------------------------------------------------------

export default function MyPlanetPage() {
  const tHome = useTranslations('home')
  const tMyPlanet = useTranslations('myPlanet')
  const tNav = useTranslations('nav')
  const [planet, setPlanet]       = useState<PlanetProfile | null>(null)
  const [storedUser, setStoredUser] = useState<{ planetConfig: PlanetConfig; userLevel: number } | null>(null)
  const [xpSummary, setXpSummary] = useState<XPSummary | null>(null)
  const [universeSummary, setUniverseSummary] = useState<UniverseSummary | null>(null)
  const [otherPlanets, setOtherPlanets] = useState<PlanetProfile[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<GalaxyEventSummary[]>([])
  const [selectedEvent, setSelectedEvent] = useState<GalaxyEventDetail | null>(null)
  const [createPostOpen, setCreatePostOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<StreamPost | null>(null)
  const [createdPost, setCreatedPost] = useState<StreamPost | null>(null)
  const [postRefreshKey, setPostRefreshKey] = useState(0)
  const [customizerOpen, setCustomizerOpen] = useState(false)
  const hydrated = useHydrated()
  const isDesktop = useIsDesktop()
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function load() {
      let p: PlanetProfile | null = null
      let userPlanetConfig: PlanetConfig | null = null
      let userLevel = 1

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

          userPlanetConfig = planetConfigFromSource(meData?.user?.planetConfig ?? meData?.user, p)
          userLevel = numberValue(meData?.user?.userLevel, 1)
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
        setStoredUser({ planetConfig: userPlanetConfig ?? planetConfigFromSource(null, p), userLevel })

        try {
          const xpRes = await fetch('/api/user/xp')
          if (xpRes.ok) {
            const xpData = await xpRes.json()
            if (typeof xpData?.xp === 'number' && typeof xpData?.userLevel === 'number') {
              setXpSummary({ xp: xpData.xp, userLevel: xpData.userLevel })
              setStoredUser((user) => user ? { ...user, userLevel: xpData.userLevel } : user)
            }
          }
        } catch {
          // XP is available for authenticated users only.
        }

        try {
          const upcomingRes = await fetch('/api/user/upcoming-events?limit=2')
          if (upcomingRes.ok) {
            const upcomingData = await upcomingRes.json() as { event?: GalaxyEventSummary | null; events?: GalaxyEventSummary[] }
            setUpcomingEvents(upcomingData.events ?? (upcomingData.event ? [upcomingData.event] : []))
          } else {
            setUpcomingEvents([])
          }
        } catch {
          setUpcomingEvents([])
        }

        try {
          const universeRes = await fetch('/api/universe/planets')
          if (universeRes.ok) {
            const universeData = await universeRes.json() as { currentPlanet?: { telemetry?: UniverseSummary } | null }
            if (universeData.currentPlanet?.telemetry) setUniverseSummary(universeData.currentPlanet.telemetry)
          }
        } catch {
          setUniverseSummary(null)
        }

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

  useEffect(() => {
    function handleXPUpdated(event: Event) {
      const data = (event as CustomEvent).detail
      if (typeof data?.xp === 'number' && typeof data?.userLevel === 'number') {
        setXpSummary({ xp: data.xp, userLevel: data.userLevel })
        setStoredUser((user) => user ? { ...user, userLevel: data.userLevel } : user)
      }
    }

    window.addEventListener('xp:updated', handleXPUpdated)
    return () => window.removeEventListener('xp:updated', handleXPUpdated)
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
              title={tMyPlanet('unformedTitle')}
              subtitle={tMyPlanet('unformedSubtitle')}
              action={
                <GlowButton href="/create-planet" variant="primary" className="px-8 py-4 text-sm">
                  {tMyPlanet('beginFormation')}
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
  const currentUser = storedUser ?? { planetConfig: planetConfigFromSource(null, planet), userLevel: xpSummary?.userLevel ?? 1 }
  const globeSize = isDesktop ? 300 : 200

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
  const currentFocusUserId = (planet as PlanetProfile & { userId?: string }).userId ?? planet.id
  const matchReportSummary = universeSummary ?? {
    signalScore: Math.min(100, Math.floor((xpSummary?.xp ?? 0) / 20)),
    linkedPlanets: otherPlanets.length,
  }

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

  function handleCustomizerSaved(planetConfig: PlanetConfig) {
    setStoredUser((user) => ({ planetConfig, userLevel: user?.userLevel ?? currentUser.userLevel }))
    setCustomizerOpen(false)
  }

  async function openUpcomingEvent(event: GalaxyEventSummary) {
    const res = await fetch(`/api/galaxies/${event.galaxyId}/events/${event.id}`)
    if (!res.ok) return

    const data = await res.json() as { event: GalaxyEventDetail }
    setSelectedEvent(data.event)
  }

  function applyUpcomingRSVPChange(eventId: string, state: { rsvpCount: number; userHasRSVPed: boolean }) {
    setUpcomingEvents((events) => events.map((event) => event.id === eventId ? { ...event, ...state } : event))
    setSelectedEvent((event) => event?.id === eventId ? { ...event, ...state, spotsRemaining: event.maxAttendees == null ? null : Math.max(0, event.maxAttendees - state.rsvpCount) } : event)
  }

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
            {/* Planet globe */}
            <div className="shrink-0 flex w-full items-center justify-center md:w-auto">
              <PlanetGlobe planetConfig={currentUser.planetConfig} size={globeSize} />
            </div>

            {/* Identity column */}
            <div className="flex-1 flex flex-col gap-5 min-w-0 text-center md:text-left pt-2 md:pt-6">
              <p className="text-xs tracking-[0.25em] uppercase font-medium" style={{ color: visual.coreColor, opacity: 0.75 }}>
                {tMyPlanet('yourPlanet')}
              </p>

              <div className="flex justify-center md:justify-start">
                <LevelBadge level={xpSummary?.userLevel ?? currentUser.userLevel} size="md" />
              </div>

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
                    {tMyPlanet('coreThemes')}
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
                  {tMyPlanet('moodDrift')}
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
                  {tHome('tuneAtmosphere')} ⚙
                </GlowButton>
                <GlowButton href="/sbti?next=/my-planet" variant="ghost" className="px-5 py-2.5 text-sm">
                  ◇ {tHome('soulScan')}
                </GlowButton>
              </div>
            </div>
          </div>
        </section>

        {xpSummary && (
          <section className="mt-4">
            <XPProgressBar xp={xpSummary.xp} userLevel={xpSummary.userLevel} />
          </section>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={() => setCustomizerOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold transition"
            style={{ color: 'var(--foreground)', background: 'rgba(255,255,255,0.04)' }}
            aria-expanded={customizerOpen}
          >
            ✦ {tMyPlanet('customizeYourPlanet')}
            {customizerOpen && <span className="text-xs" style={{ color: 'var(--ghost)' }}>{tHome('open')}</span>}
          </button>
        </div>

        {customizerOpen && isDesktop && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-[rgba(5,4,18,0.76)] p-4 backdrop-blur">
            <PlanetCustomizer
              initialConfig={currentUser.planetConfig}
              planetName={planet.name}
              userLevel={currentUser.userLevel}
              onClose={() => setCustomizerOpen(false)}
              onSaved={handleCustomizerSaved}
            />
          </section>
        )}

        {customizerOpen && !isDesktop && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(3,3,15,0.96)] p-4 backdrop-blur-xl">
            <PlanetCustomizer
              initialConfig={currentUser.planetConfig}
              planetName={planet.name}
              userLevel={currentUser.userLevel}
              onClose={() => setCustomizerOpen(false)}
              onSaved={handleCustomizerSaved}
            />
          </div>
        )}

        {/* ================================================================
            THREE-COLUMN DASHBOARD ROW
            ================================================================ */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* -- Resonance Overview (radar chart) -- */}
          <OrbitCard glowColor={visual.coreColor} className="lg:col-span-3 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--foreground)' }}>
              {tHome('resonanceOverview')}
            </h3>
            <ResonanceRadar
              dimensions={radarDimensions}
              accentColor={visual.coreColor}
              balance={balance}
            />
          </OrbitCard>

          {/* -- Resonant Matches (carousel) -- */}
          <div id="match-report" className="lg:col-span-6 scroll-mt-24">
            <OrbitCard glowColor={visual.accentColor} className="p-5">
              <ResonantMatchesCarousel matches={matchEntries} />
              <div className="mt-5 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--ghost)' }}>{tMyPlanet('matchReport')}</p>
                  <p className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
                    {tMyPlanet('signalScore')}: {matchReportSummary.signalScore} · {tMyPlanet('planetsInConstellation', { count: matchReportSummary.linkedPlanets })}
                  </p>
                </div>
                <Link href={`/universe/demo?focus=${currentFocusUserId}`} className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--star)', border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(167,139,250,0.08)', textDecoration: 'none' }}>
                  {tNav('universeView')}
                </Link>
              </div>
            </OrbitCard>
          </div>

          {/* -- Upcoming Events -- */}
          <OrbitCard glowColor="#a78bfa" className="lg:col-span-3 p-0 overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-4 pb-0">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
                  {tHome('upcomingActivity')}
                </h3>
                {upcomingEvents.length > 0 && (
                  <p className="mt-1 text-[10px]" style={{ color: 'var(--ghost)' }}>{tMyPlanet('nextEvents', { count: upcomingEvents.length })}</p>
                )}
              </div>
              <Link href="/galaxies/events?status=upcoming" className="rounded-full px-3 py-1.5 text-[10px] font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', textDecoration: 'none' }}>
                {tHome('viewAll')}
              </Link>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="grid gap-3 px-4 pb-4 pt-3">
                {upcomingEvents.map((event) => (
                  <UpcomingActivityCard key={event.id} event={toActivityEvent(event, visual.coreColor)} compact onOpen={() => openUpcomingEvent(event)} />
                ))}
              </div>
            ) : (
              <div className="px-4 pb-4">
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{tMyPlanet('noUpcomingEvent')}</p>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--ghost)' }}>{tMyPlanet('noUpcomingEventHint')}</p>
                </div>
              </div>
            )}
          </OrbitCard>
        </div>

        {/* ================================================================
            RECOMMENDED COMMUNITIES
            ================================================================ */}
        <OrbitCard glowColor={visual.coreColor} className="mt-4 p-5">
          <RecommendedCommunities galaxies={recommendedGalaxies} />
        </OrbitCard>

        {/* ================================================================
            MY POSTS
            ================================================================ */}
        <OrbitCard glowColor={visual.accentColor} className="mt-4 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--ghost)' }}>{tMyPlanet('streamArchive')}</p>
              <h2 className="mt-1 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{tMyPlanet('myPosts')}</h2>
            </div>
            <button type="button" onClick={() => setCreatePostOpen(true)} className="rounded-full px-4 py-2 text-xs font-semibold" style={{ color: '#fff', background: 'rgba(124,58,237,0.76)', border: '1px solid rgba(167,139,250,0.38)' }}>
              {tMyPlanet('createFirstPost')}
            </button>
          </div>
          <PostGrid
            authorId={planet.userId}
            refreshKey={postRefreshKey}
            prependPost={createdPost}
            emptyMessage={tMyPlanet('noPostsYet')}
            onPostOpen={setSelectedPost}
          />
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
            rotating
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
      <EventDetail
        event={selectedEvent}
        open={!!selectedEvent}
        isAdmin={false}
        onClose={() => setSelectedEvent(null)}
        onRSVPChange={applyUpcomingRSVPChange}
      />
      <CreatePostModal
        open={createPostOpen}
        onClose={() => setCreatePostOpen(false)}
        onCreated={(post) => {
          setCreatedPost(post)
          setPostRefreshKey((key) => key + 1)
        }}
      />
      <PostDetail
        post={selectedPost}
        open={!!selectedPost}
        currentUserId={planet.userId}
        onClose={() => setSelectedPost(null)}
        onPostUpdated={(post) => setSelectedPost(post)}
        onDeleted={() => {
          setSelectedPost(null)
          setPostRefreshKey((key) => key + 1)
        }}
      />
    </AppShell>
  )
}
