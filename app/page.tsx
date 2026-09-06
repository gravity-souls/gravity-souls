'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import EventCard from '@/components/events/EventCard'
import EventDetail from '@/components/events/EventDetail'
import LightCone from '@/components/fx/LightCone'
import AppShell from '@/components/layout/AppShell'
import PlanetCard from '@/components/planet/PlanetCard'
import PlanetPreviewDrawer from '@/components/planet/PlanetPreviewDrawer'
import GalaxyCard from '@/components/galaxy/GalaxyCard'
import PostCard from '@/components/stream/PostCard'
import PostDetail from '@/components/stream/PostDetail'
import UniverseSearch from '@/components/universe/UniverseSearch'
import SectionHeader from '@/components/ui/SectionHeader'
import GlowButton from '@/components/ui/GlowButton'
import { authClient } from '@/lib/auth-client'
import { getPlanetById } from '@/lib/mock-planets'
import { resolvePlanetTexture } from '@/lib/planet-textures'
import type { GalaxyEventDetail, GalaxyEventSummary } from '@/types/event'
import type { PlanetProfile, PlanetVisualConfig } from '@/types/planet'
import type { GalaxyPreview } from '@/types/galaxy'
import type { StreamPost } from '@/types/stream'

// Shape returned by GET /api/universe
interface UniversePlanet {
  id: string
  name: string
  avatarSymbol: string
  tagline: string | null
  mood: string
  style: string
  lifestyle: string
  coreThemes: string[]
  visual: PlanetVisualConfig | Record<string, unknown>
  abstractAxis: number
  introspectiveAxis: number
}

// --- Universe field: planet positions (% within the field container) ---------
// Grouped near their thematic galaxy zones.

const UNIVERSE_PLANET_POSITIONS = [
  // Zone 1  -  contemplative cluster (top-left: introspection, slow thought)
  { id: 'p-aelion',   x: 12, y: 18, size: 72, depth: 1.00 },
  { id: 'p-noctaris', x: 25, y: 44, size: 42, depth: 0.65 },
  { id: 'p-vaelith',  x:  9, y: 62, size: 54, depth: 0.82 },
  // Zone 2  -  technical cluster (top-right: systems, building)
  { id: 'p-kindus',   x: 70, y: 14, size: 64, depth: 0.92 },
  { id: 'p-novaxis',  x: 84, y: 34, size: 58, depth: 0.86 },
  { id: 'p-spirax',   x: 62, y: 50, size: 40, depth: 0.60 },
  // Zone 3  -  emotional/warm cluster (center-bottom)
  { id: 'p-elarith',  x: 44, y: 58, size: 66, depth: 0.94 },
  { id: 'p-orbalin',  x: 56, y: 76, size: 52, depth: 0.76 },
  { id: 'p-calenvix', x: 36, y: 82, size: 78, depth: 1.00 },
  // Zone 4  -  nomadic/wandering cluster (bottom edges)
  { id: 'p-driftan',  x: 18, y: 82, size: 56, depth: 0.84 },
  { id: 'p-lumira',   x: 76, y: 72, size: 70, depth: 0.96 },
  // Free-drifting
  { id: 'p-sorvae',   x: 42, y: 22, size: 50, depth: 0.78 },
]

const POSITIONED_PLANET_IDS = UNIVERSE_PLANET_POSITIONS.map((position) => position.id)

function universePlanetToProfile(p: UniversePlanet): PlanetProfile {
  const v = (p.visual && typeof p.visual === 'object') ? p.visual as PlanetVisualConfig : {
    coreColor: '#a78bfa', accentColor: '#6366f1',
    ringStyle: 'single' as const, surfaceStyle: 'smooth' as const,
    satelliteCount: 1, size: 'md' as const,
  }
  const profile: PlanetProfile = {
    id: p.id,
    name: p.name,
    avatarSymbol: p.avatarSymbol,
    tagline: p.tagline ?? undefined,
    role: 'explorer' as const,
    mood: (p.mood as PlanetProfile['mood']) || 'calm',
    style: (p.style as PlanetProfile['style']) || 'minimal',
    lifestyle: (p.lifestyle as PlanetProfile['lifestyle']) || 'solitary',
    coreThemes: p.coreThemes,
    contentFragments: [],
    visual: v,
    cognitiveAxes: { abstract: p.abstractAxis, introspective: p.introspectiveAxis },
    emotionalBars: [],
    createdAt: '',
    userId: '',
  }
  profile.visual = { ...profile.visual, textureFile: resolvePlanetTexture(profile) }
  return profile
}

function buildPositionedPlanets(apiPlanets: UniversePlanet[]): PlanetProfile[] {
  const apiById = new Map(apiPlanets.map((planet) => [planet.id, universePlanetToProfile(planet)]))
  return POSITIONED_PLANET_IDS
    .map((id) => apiById.get(id) ?? getPlanetById(id))
    .filter((planet): planet is PlanetProfile => !!planet)
}

// --- Nebula zones  -  thematic atmospheric clusters ----------------------------

const NEBULA_ZONES = [
  { id: 'contemplative', labelKey: 'nebulaContemplative', x: 14, y: 35, color: '#a78bfa', size: 340, galaxySlug: 'slow-thinkers' },
  { id: 'technical',     labelKey: 'nebulaTechnical', x: 72, y: 30, color: '#60a5fa', size: 290, galaxySlug: 'signal-noise'  },
  { id: 'emotional',     labelKey: 'nebulaEmotional', x: 46, y: 68, color: '#f9a8d4', size: 320, galaxySlug: 'warm-frequency' },
  { id: 'wandering',     labelKey: 'nebulaWandering', x: 19, y: 76, color: '#34d399', size: 240, galaxySlug: 'threshold-states' },
]

const ORBIT_PATHS = [
  { d: 'M 9 23 C 22 5, 48 9, 70 18 S 93 51, 76 69', color: '#a78bfa', opacity: 0.32 },
  { d: 'M 17 78 C 29 59, 44 50, 62 51 S 82 58, 86 35', color: '#60a5fa', opacity: 0.26 },
  { d: 'M 35 82 C 39 68, 49 58, 56 75 S 70 86, 76 72', color: '#f9a8d4', opacity: 0.34 },
  { d: 'M 12 18 C 20 42, 26 58, 45 58 S 62 49, 70 14', color: '#34d399', opacity: 0.22 },
]

const SIGNAL_PULSE = [
  { label: 'Slow Thinkers', valueKey: 'signalNewReplies', color: '#a78bfa', href: '/galaxy/slow-thinkers' },
  { label: 'Warm Frequency', valueKey: 'signalActiveRooms', color: '#f9a8d4', href: '/galaxy/warm-frequency' },
  { label: 'Signal / Noise', valueKey: 'signalBuildLogs', color: '#60a5fa', href: '/galaxy/signal-noise' },
]

// --- Page --------------------------------------------------------------------

export default function UniversePage() {
  const router = useRouter()
  const tHome = useTranslations('home')
  const tNav = useTranslations('nav')
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetProfile | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<GalaxyEventDetail | null>(null)
  const [hasActivePlanet, setHasActivePlanet] = useState<boolean | null>(null)
  const [savedPlanetIds, setSavedPlanetIds] = useState<Set<string> | null>(null)
  const [upcomingEvent, setUpcomingEvent] = useState<GalaxyEventSummary | null>(null)
  const [sharedPosts, setSharedPosts] = useState<StreamPost[]>([])
  const [selectedStreamPost, setSelectedStreamPost] = useState<StreamPost | null>(null)

  // Check if logged-in user has an active planet via API
  useEffect(() => {
    if (sessionPending || !session?.user) {
      let cancelled = false
      Promise.resolve().then(() => {
        if (!cancelled) setHasActivePlanet(null)
      })
      return () => { cancelled = true }
    }

    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setHasActivePlanet(null)
    })

    fetch('/api/my-planet')
      .then((res) => {
        if (!cancelled) setHasActivePlanet(res.ok)
      })
      .catch(() => {
        if (!cancelled) setHasActivePlanet(false)
      })
    return () => { cancelled = true }
  }, [session, sessionPending])

  // Fetch saved planet IDs for PlanetPreviewDrawer tri-state
  useEffect(() => {
    if (sessionPending) return
    if (!session?.user) {
      let cancelled = false
      Promise.resolve().then(() => {
        if (!cancelled) setSavedPlanetIds(new Set())
      })
      return () => { cancelled = true }
    }
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setSavedPlanetIds(null)
    })
    fetch('/api/saved-planets')
      .then(res => res.ok ? res.json() : { savedPlanets: [] })
      .then(({ savedPlanets }: { savedPlanets: { planetId: string }[] }) => {
        if (!cancelled) setSavedPlanetIds(new Set(savedPlanets.map(s => s.planetId)))
      })
      .catch(() => {
        if (!cancelled) setSavedPlanetIds(new Set())
      })
    return () => { cancelled = true }
  }, [session, sessionPending])

  useEffect(() => {
    let cancelled = false
    fetch('/api/posts?limit=6')
      .then((res) => res.ok ? res.json() : { posts: [] })
      .then((data: { posts?: StreamPost[] }) => {
        if (!cancelled) setSharedPosts(data.posts ?? [])
      })
      .catch(() => {
        if (!cancelled) setSharedPosts([])
      })
    return () => { cancelled = true }
  }, [])

  // --- Community / galaxy state -----------------------------------------------
  interface CommunityRow {
    id: string; slug: string; name: string; symbol: string; tagline?: string | null
    keywords: string[]; mood: string; accentColor: string; maturity: string
    memberCount: number; joined: boolean
  }
  const [communities, setCommunities] = useState<CommunityRow[]>([])
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null)

  // Fetch communities from DB (includes joined state + memberCount)
  useEffect(() => {
    let cancelled = false
    fetch('/api/communities')
      .then((r) => r.ok ? r.json() : [])
      .then((data: CommunityRow[]) => {
        if (!cancelled) setCommunities(data)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (sessionPending || !session?.user) {
      let cancelled = false
      Promise.resolve().then(() => {
        if (!cancelled) setUpcomingEvent(null)
      })
      return () => { cancelled = true }
    }

    let cancelled = false
    fetch('/api/user/upcoming-events')
      .then((res) => res.ok ? res.json() : { event: null })
      .then((data: { event?: GalaxyEventSummary | null }) => {
        if (!cancelled) setUpcomingEvent(data.event ?? null)
      })
      .catch(() => {
        if (!cancelled) setUpcomingEvent(null)
      })
    return () => { cancelled = true }
  }, [session, sessionPending])

  async function openUpcomingEvent(event: GalaxyEventSummary) {
    const res = await fetch(`/api/galaxies/${event.galaxyId}/events/${event.id}`)
    if (!res.ok) return
    const data = await res.json() as { event: GalaxyEventDetail }
    setSelectedEvent(data.event)
  }

  function applyUpcomingRSVPChange(eventId: string, state: { rsvpCount: number; userHasRSVPed: boolean }) {
    setUpcomingEvent((event) => event?.id === eventId ? { ...event, ...state } : event)
    setSelectedEvent((event) => event?.id === eventId ? { ...event, ...state, spotsRemaining: event.maxAttendees == null ? null : Math.max(0, event.maxAttendees - state.rsvpCount) } : event)
  }

  // --- Nearby planets state ---------------------------------------------------
  const [nearbyPlanets, setNearbyPlanets] = useState<PlanetProfile[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(true)
  const [orbitTeaserCount, setOrbitTeaserCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) setNearbyLoading(true)
    })

    fetch('/api/universe')
      .then((r) => r.ok ? r.json() : [])
      .then((data: UniversePlanet[]) => {
        if (cancelled) return
        setNearbyPlanets(buildPositionedPlanets(data))
      })
      .catch(() => {
        if (!cancelled) setNearbyPlanets([])
      })
      .finally(() => { if (!cancelled) setNearbyLoading(false) })
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (sessionPending || !session?.user) {
      let cancelled = false
      Promise.resolve().then(() => {
        if (!cancelled) setOrbitTeaserCount(0)
      })
      return () => { cancelled = true }
    }

    let cancelled = false
    fetch('/api/universe/planets')
      .then((res) => res.ok ? res.json() : null)
      .then((data: { currentPlanet?: { telemetry?: { linkedPlanets?: number } } | null } | null) => {
        if (!cancelled) setOrbitTeaserCount(data?.currentPlanet?.telemetry?.linkedPlanets ?? 0)
      })
      .catch(() => {
        if (!cancelled) setOrbitTeaserCount(0)
      })
    return () => { cancelled = true }
  }, [session, sessionPending])

  // Convert DB communities to GalaxyPreview shape for GalaxyCard
  const galaxies: GalaxyPreview[] = communities.map((c) => ({
    id:          c.id,
    slug:        c.slug,
    name:        c.name,
    symbol:      c.symbol,
    tagline:     c.tagline ?? undefined,
    keywords:    c.keywords,
    mood:        (c.mood as GalaxyPreview['mood']) || 'vibrant',
    memberCount: c.memberCount,
    maturity:    (c.maturity as GalaxyPreview['maturity']) || 'forming',
    accentColor: c.accentColor,
  }))

  const handleJoin = useCallback((slug: string) => {
    if (!session?.user) {
      router.push('/sign-up')
      return
    }
    const community = communities.find((c) => c.slug === slug)
    if (!community) return
    // Optimistic update
    setCommunities((prev) => prev.map((c) => c.slug === slug ? { ...c, joined: true } : c))
    setJoiningSlug(slug)
    fetch('/api/communities/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ communityId: community.id }),
    })
      .then((r) => {
        if (!r.ok) {
          setCommunities((prev) => prev.map((c) => c.slug === slug ? { ...c, joined: false } : c))
        }
      })
      .catch(() => {
        setCommunities((prev) => prev.map((c) => c.slug === slug ? { ...c, joined: false } : c))
      })
      .finally(() => setJoiningSlug(null))
  }, [session, communities, router])

  const featuredPlanet = nearbyPlanets[0]
  const activeCommunityCount = galaxies.length || NEBULA_ZONES.length
  const homepageStats = [
    { label: tHome('statsPlanetsNearby'), value: String(nearbyPlanets.length || POSITIONED_PLANET_IDS.length) },
    { label: tHome('statsGalaxiesAwake'), value: String(activeCommunityCount) },
    { label: tHome('statsOpenSignals'), value: '24h' },
  ]

  return (
    <AppShell>
      <div className="flex flex-col">

        {/* -- Atmospheric light cone ---------------------------------------- */}
        <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.10} double />
        <LightCone origin="top-right"  color="rgba(99,102,241,1)"  opacity={0.05} double={false} />

        {/* ===============================================================
            SECTION 1  -  Universe Entry (search + universe field)
        =============================================================== */}
        <section className="relative overflow-hidden px-4 sm:px-6 pt-8 pb-12" style={{ minHeight: '100vh' }}>
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.32), rgba(52,211,153,0.18), transparent)' }}
            />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: 'linear-gradient(rgba(167,139,250,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.03) 1px, transparent 1px)',
                backgroundSize: '72px 72px',
                maskImage: 'linear-gradient(to bottom, black 0%, black 70%, transparent 100%)',
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-[minmax(320px,420px)_1fr] gap-8 lg:gap-10 items-center" style={{ minHeight: 'calc(100vh - 96px)' }}>
            <div className="flex flex-col gap-6 pt-4 lg:pt-0">
              <div className="flex flex-col gap-4">
                <p className="text-eyebrow">{tHome('liveUniverse')}</p>
                <div className="flex flex-col gap-3">
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight" style={{ color: 'var(--foreground)', letterSpacing: 0 }}>
                    Gravity-Souls
                  </h1>
                  <p className="text-base sm:text-lg leading-8 max-w-md" style={{ color: 'var(--ink)', opacity: 0.78 }}>
                    {tHome('heroSubtitle')}
                  </p>
                </div>
              </div>

              <Link href="/demo/cosmic-globe" className="text-sm text-sky-200 underline underline-offset-4">{tHome('exploreExperience')} →</Link>

              <UniverseSearch onPlanetSelect={setSelectedPlanet} />

              <div className="grid grid-cols-3 gap-2">
                {homepageStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl px-3 py-3"
                    style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border-soft)' }}
                  >
                    <p className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{stat.value}</p>
                    <p className="text-[10px] mt-1 uppercase" style={{ color: 'var(--ghost)', letterSpacing: '0.08em' }}>{stat.label}</p>
                  </div>
                ))}
              </div>

              {!sessionPending && (session?.user ? hasActivePlanet !== null : true) && (
                <div
                  className="rounded-2xl px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                  style={{ background: 'rgba(18,14,52,0.72)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-soft)' }}
                >
                  {session?.user && hasActivePlanet === true && (
                    <>
                      <span className="text-sm" style={{ color: 'var(--ghost)' }}>{tHome('planetLive')}</span>
                      <Link href="/my-planet" className="text-sm font-medium" style={{ color: 'var(--star)', textDecoration: 'none' }}>
                        {tHome('viewMyPlanet')}
                      </Link>
                    </>
                  )}

                  {session?.user && hasActivePlanet === false && (
                    <>
                      <span className="text-sm" style={{ color: 'var(--ghost)' }}>{tHome('planetMissing')}</span>
                      <button
                        type="button"
                        onClick={() => router.push('/onboarding')}
                        className="text-sm font-medium transition-colors duration-200 bg-transparent border-none cursor-pointer text-left sm:text-right"
                        style={{ color: 'var(--star)' }}
                      >
                        {tHome('takeSoulScan')}
                      </button>
                    </>
                  )}

                  {!session?.user && (
                    <>
                      <span className="text-sm" style={{ color: 'var(--ghost)' }}>{tHome('planetMissing')}</span>
                      <button
                        type="button"
                        onClick={() => router.push('/onboarding')}
                        className="text-sm font-medium transition-colors duration-200 bg-transparent border-none cursor-pointer text-left sm:text-right"
                        style={{ color: 'var(--star)' }}
                      >
                        {tHome('takeSoulScan')}
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="grid gap-2">
                {SIGNAL_PULSE.map((signal) => (
                  <Link
                    key={signal.label}
                    href={signal.href}
                    className="group rounded-xl px-4 py-3 flex items-center justify-between gap-4 transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${signal.color}20`, textDecoration: 'none' }}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="w-1 h-8 rounded-full shrink-0" style={{ background: signal.color, boxShadow: `0 0 16px ${signal.color}55` }} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{signal.label}</span>
                        <span className="block text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>{tHome(signal.valueKey)}</span>
                      </span>
                    </span>
                    <span className="text-xs transition-transform duration-200 group-hover:translate-x-1" style={{ color: signal.color }}>{tHome('open')}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative min-h-140 lg:min-h-170" aria-label={tHome('universeFieldLabel')}>
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse at 48% 44%, rgba(167,139,250,0.10) 0%, rgba(52,211,153,0.05) 34%, transparent 68%)',
                  maskImage: 'radial-gradient(ellipse at center, black 0%, black 68%, transparent 100%)',
                }}
                aria-hidden="true"
              />

              {NEBULA_ZONES.map((zone) => (
                <Link
                  key={zone.id}
                  href={`/galaxy/${zone.galaxySlug}`}
                  className="absolute group flex items-center gap-2 transition-opacity duration-300"
                  style={{
                    left: `${zone.x}%`,
                    top: `${zone.y - 8}%`,
                    transform: 'translate(-50%, -50%)',
                    textDecoration: 'none',
                    opacity: 0.72,
                    zIndex: 7,
                  }}
                >
                  <span style={{ width: 26, height: 1, background: `linear-gradient(90deg, transparent, ${zone.color})`, display: 'inline-block' }} aria-hidden="true" />
                  <span
                    style={{
                      fontSize: 10,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: zone.color,
                      whiteSpace: 'nowrap',
                      fontWeight: 600,
                    }}
                  >
                    {tHome(zone.labelKey)}
                  </span>
                </Link>
              ))}

              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ zIndex: 2 }} aria-hidden="true">
                {ORBIT_PATHS.map((path) => (
                  <path
                    key={path.d}
                    d={path.d}
                    fill="none"
                    stroke={path.color}
                    strokeWidth="0.16"
                    strokeDasharray="1.8 2.8"
                    opacity={path.opacity}
                  />
                ))}
              </svg>

              {nearbyLoading && nearbyPlanets.length === 0 ? (
                <div className="absolute inset-0 grid grid-cols-4 gap-6 place-content-center px-10">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="rounded-full animate-pulse" style={{ width: 42 + (i % 3) * 8, height: 42 + (i % 3) * 8, background: 'rgba(167,139,250,0.08)' }} />
                  ))}
                </div>
              ) : (
                nearbyPlanets.map((planet) => {
                  const pos = UNIVERSE_PLANET_POSITIONS.find((position) => position.id === planet.id)
                  if (!pos) return null
                  return (
                    <div
                      key={planet.id}
                      className="absolute transition-transform duration-500 hover:scale-110"
                      style={{
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: Math.round(10 + pos.depth * 10),
                        opacity: 0.78 + pos.depth * 0.22,
                      }}
                    >
                      <PlanetCard
                        planet={planet}
                        size={pos.size}
                        rotating
                        onClick={() => setSelectedPlanet(planet)}
                      />
                    </div>
                  )
                })
              )}

              {featuredPlanet && (
                <button
                  type="button"
                  onClick={() => setSelectedPlanet(featuredPlanet)}
                  className="absolute left-1/2 bottom-4 -translate-x-1/2 rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-all duration-200"
                  style={{ background: 'rgba(3,3,15,0.70)', backdropFilter: 'blur(18px)', border: '1px solid var(--border-mid)', cursor: 'pointer' }}
                >
                  <span className="text-data-label shrink-0">{tHome('closestOrbit')}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{featuredPlanet.name}</span>
                    <span className="block text-xs truncate" style={{ color: 'var(--ghost)' }}>{featuredPlanet.tagline}</span>
                  </span>
                </button>
              )}
            </div>
          </div>
        </section>

        {orbitTeaserCount > 0 && (
          <section className="px-4 pb-6 sm:px-6">
            <div className="mx-auto max-w-7xl">
              <Link
                href="/resonance"
                className="block rounded-2xl px-5 py-4 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5"
                style={{ color: 'var(--star)', background: 'rgba(18,14,52,0.64)', border: '1px solid rgba(167,139,250,0.18)', textDecoration: 'none' }}
              >
                {tHome('exploreUniverse', { count: orbitTeaserCount })}
              </Link>
            </div>
          </section>
        )}

        {/* ===============================================================
            SECTION 2  -  Galaxy strip
        =============================================================== */}
        <section className="px-6 py-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <SectionHeader
                eyebrow={tHome('recommendedCommunities')}
                title={tNav('galaxies')}
                subtitle={tHome('galaxyStripSubtitle')}
              />
              <Link
                href="/galaxies"
                className="text-xs font-medium transition-colors duration-200 shrink-0 mb-1.5"
                style={{ color: 'var(--ghost)', textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--star)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ghost)' }}
              >
                {tHome('viewAll')} →
              </Link>
            </div>

            {/* Horizontal scrollable strip */}
            <div
              className="flex gap-4 overflow-x-auto pb-4"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
            >
              {galaxies.map((g) => (
                <GalaxyCard
                  key={g.id}
                  galaxy={g}
                  variant="compact"
                  joined={communities.find((c) => c.slug === g.slug)?.joined ?? false}
                  onJoin={() => handleJoin(g.slug)}
                  joinLoading={joiningSlug === g.slug}
                />
              ))}
              {/* All galaxies link card */}
              <Link
                href="/galaxies"
                className="flex-none flex flex-col items-center justify-center gap-2 rounded-2xl transition-all duration-200"
                style={{
                  width:          220,
                  background:     'rgba(255,255,255,0.02)',
                  border:         '1px dashed var(--border-soft)',
                  textDecoration: 'none',
                  minHeight:      140,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-soft)' }}
              >
                <span style={{ color: 'var(--star)', fontSize: '1.5rem' }}>◈</span>
                <span className="text-xs" style={{ color: 'var(--ghost)' }}>{tHome('allGalaxies')}</span>
              </Link>
            </div>
          </div>
        </section>

        {upcomingEvent && (
          <section className="px-6 py-14">
            <div className="max-w-3xl mx-auto">
              <SectionHeader
                eyebrow={tHome('upcomingActivity')}
                title={tHome('nextOrbit')}
                subtitle={tHome('nextEventSubtitle')}
              />
              <div className="mt-6">
                <EventCard event={upcomingEvent} compact onOpen={openUpcomingEvent} onRSVPChange={applyUpcomingRSVPChange} />
              </div>
            </div>
          </section>
        )}

        <section className="px-6 py-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-6">
              <SectionHeader
                eyebrow={tHome('sharedMoments')}
                title={tHome('openSignals')}
                subtitle={tHome('openSignalsSubtitle')}
              />
              <Link href="/stream" className="text-xs font-medium shrink-0 mb-1.5" style={{ color: 'var(--ghost)', textDecoration: 'none' }}>
                {tHome('viewAllPosts')} →
              </Link>
            </div>
            {sharedPosts.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
                {sharedPosts.map((post) => (
                  <div key={post.id} className="w-64 flex-none sm:w-72">
                    <PostCard post={post} onOpen={setSelectedStreamPost} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl px-5 py-8 text-sm" style={{ color: 'var(--ghost)', background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-soft)' }}>
                {tHome('signalsGathering')}
              </div>
            )}
          </div>
        </section>

        {/* ===============================================================
            SECTION 3  -  Bottom CTA (Explorer vs Resonator)
        =============================================================== */}
        <section className="px-6 py-20">
          <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-6">

            <div className="divider-glow w-32 mx-auto" />

            {/* Not logged in → sign up flow */}
            {!session?.user && !sessionPending ? (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl animate-pulse-glow"
                  style={{
                    background: 'radial-gradient(circle, rgba(124,58,237,0.3), rgba(99,102,241,0.1))',
                    boxShadow:  '0 0 0 1px rgba(167,139,250,0.3)',
                  }}
                >
                  ◍
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    {tHome('planetMissing')}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                    {tHome('planetMissingDescription')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <GlowButton onClick={() => router.push('/onboarding')} variant="primary" className="px-8 py-3">
                    {tHome('beginFormation')}
                  </GlowButton>
                  <GlowButton href="/stream" variant="ghost" className="px-8 py-3">
                    {tHome('driftForNow')}
                  </GlowButton>
                </div>
              </>
            ) : session?.user && hasActivePlanet === false ? (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl animate-pulse-glow"
                  style={{
                    background: 'radial-gradient(circle, rgba(124,58,237,0.3), rgba(99,102,241,0.1))',
                    boxShadow:  '0 0 0 1px rgba(167,139,250,0.3)',
                  }}
                >
                  ◍
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    {tHome('planetMissing')}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                    {tHome('planetMissingDescription')}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <GlowButton onClick={() => router.push('/onboarding')} variant="primary" className="px-8 py-3">
                    {tHome('beginFormation')}
                  </GlowButton>
                  <GlowButton href="/stream" variant="ghost" className="px-8 py-3">
                    {tHome('driftForNow')}
                  </GlowButton>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl animate-heartbeat"
                  style={{
                    background: 'radial-gradient(circle, rgba(52,211,153,0.25), rgba(99,102,241,0.1))',
                    boxShadow:  '0 0 0 1px rgba(52,211,153,0.3)',
                  }}
                >
                  ⊛
                </div>
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    {tHome('dailyResonanceReady')}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                    {tHome('dailyResonanceDescription')}
                  </p>
                </div>
                <GlowButton href="/resonance" variant="primary" className="px-8 py-3">
                  {tHome('openResonance')}
                </GlowButton>
              </>
            )}
          </div>
        </section>

      </div>

      {/* -- Planet preview drawer ------------------------------------------- */}
      <PlanetPreviewDrawer
        planet={selectedPlanet}
        open={!!selectedPlanet}
        onClose={() => setSelectedPlanet(null)}
        userRole={hasActivePlanet === true ? 'resonator' : 'explorer'}
        savedPlanetIds={savedPlanetIds}
      />
      <EventDetail
        event={selectedEvent}
        open={!!selectedEvent}
        isAdmin={false}
        onClose={() => setSelectedEvent(null)}
        onRSVPChange={applyUpcomingRSVPChange}
      />
      <PostDetail
        post={selectedStreamPost}
        open={!!selectedStreamPost}
        currentUserId={session?.user.id}
        onClose={() => setSelectedStreamPost(null)}
        onPostUpdated={(post) => setSelectedStreamPost(post)}
      />
    </AppShell>
  )
}
