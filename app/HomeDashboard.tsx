'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import EventCard from '@/components/events/EventCard'
import EventDetail from '@/components/events/EventDetail'
import LightCone from '@/components/fx/LightCone'
import CosmicGlobe, { type GlobeStatus } from '@/components/fx/CosmicGlobe'
import AppShell from '@/components/layout/AppShell'
import StarMap from '@/components/star-map/StarMap'
import PlanetPreviewDrawer from '@/components/planet/PlanetPreviewDrawer'
import GalaxyCard from '@/components/galaxy/GalaxyCard'
import PostCard from '@/components/stream/PostCard'
import PostDetail from '@/components/stream/PostDetail'
import UniverseSearch from '@/components/universe/UniverseSearch'
import HorizontalCarousel from '@/components/ui/HorizontalCarousel'
import SectionHeader from '@/components/ui/SectionHeader'
import GlowButton from '@/components/ui/GlowButton'
import { authClient } from '@/lib/auth-client'
import { useUpcomingEvents } from '@/lib/hooks/useUpcomingEvents'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'
import {
  buildRealPositionedPlanets,
  type UniversePlanet,
} from '@/lib/universe-field'
import type { GalaxyEventDetail, GalaxyEventSummary } from '@/types/event'
import type { PlanetProfile } from '@/types/planet'
import type { GalaxyPreview } from '@/types/galaxy'
import type { StreamPost } from '@/types/stream'
import { streamPageSchema } from '@/lib/stream-workflow'
import { useStreamReturn } from '@/lib/hooks/useStreamReturn'

// --- Page --------------------------------------------------------------------

export default function HomeDashboard() {
  const router = useRouter()
  const tHome = useTranslations('home')
  const tNav = useTranslations('nav')
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const reducedMotion = useReducedMotionPreference()
  const [globeStatus, setGlobeStatus] = useState<GlobeStatus>('loading')
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetProfile | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<GalaxyEventDetail | null>(null)
  const [hasActivePlanet, setHasActivePlanet] = useState<boolean | null>(null)
  const [savedPlanetIds, setSavedPlanetIds] = useState<Set<string> | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useUpcomingEvents(1, !sessionPending && !!session?.user)
  const upcomingEvent = upcomingEvents[0] ?? null
  const [sharedPosts, setSharedPosts] = useState<StreamPost[]>([])
  const [selectedStreamPost, setSelectedStreamPost] = useState<StreamPost | null>(null)
  const [postsError, setPostsError] = useState(false)
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsRevision, setPostsRevision] = useState(0)
  const tStream = useTranslations('stream'), tContext = useTranslations('postContext')
  useStreamReturn('/')
  useEffect(() => { if (!postsLoading && !postsError) window.dispatchEvent(new Event('stream-ready')) }, [postsLoading, postsError, sharedPosts])

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
      .then(async res => { if (!res.ok) throw new Error('Post list failed'); return streamPageSchema.parse(await res.json()) })
      .then(data => {
        if (!cancelled) { setSharedPosts(data.posts); setPostsError(false); setPostsLoading(false) }
      })
      .catch(() => {
        if (!cancelled) { setPostsError(true); setPostsLoading(false) }
      })
    return () => { cancelled = true }
  }, [postsRevision])

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

  async function openUpcomingEvent(event: GalaxyEventSummary) {
    const res = await fetch(`/api/galaxies/${event.galaxyId}/events/${event.id}`)
    if (!res.ok) return
    const data = await res.json() as { event: GalaxyEventDetail }
    setSelectedEvent(data.event)
  }

  function applyUpcomingRSVPChange(eventId: string, state: { rsvpCount: number; userHasRSVPed: boolean }) {
    setUpcomingEvents(events => events.map(event => event.id === eventId ? { ...event, ...state } : event))
    setSelectedEvent((event) => event?.id === eventId ? { ...event, ...state, spotsRemaining: event.maxAttendees == null ? null : Math.max(0, event.maxAttendees - state.rsvpCount) } : event)
  }

  // --- Nearby planets state ---------------------------------------------------
  const [nearbyPlanets, setNearbyPlanets] = useState<ReturnType<typeof buildRealPositionedPlanets>>([])
  const [orbitTeaserCount, setOrbitTeaserCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetch('/api/universe')
      .then((r) => r.ok ? r.json() : [])
      .then((data: UniversePlanet[]) => {
        if (cancelled) return
        setNearbyPlanets(buildRealPositionedPlanets(data))
      })
      .catch(() => {
        if (!cancelled) setNearbyPlanets([])
      })

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

  const featuredPlanet = nearbyPlanets[0]?.planet
  const homepageStats = [
    { label: tHome('statsPlanetsNearby'), value: String(nearbyPlanets.length) },
    { label: tHome('statsGalaxiesAwake'), value: String(galaxies.length) },
    { label: tHome('statsOpenSignals'), value: String(sharedPosts.length) },
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

              <Link
                href="/cosmic-globe"
                className="group relative flex items-center gap-4 rounded-2xl px-4 py-3 overflow-hidden transition-all duration-300"
                style={{
                  background: 'linear-gradient(120deg, rgba(124,77,191,0.22), rgba(96,165,250,0.14))',
                  border: '1px solid rgba(167,139,250,0.35)',
                  boxShadow: '0 0 28px rgba(124,77,191,0.25)',
                  textDecoration: 'none',
                }}
              >
                <div
                  className="relative shrink-0 rounded-full overflow-hidden"
                  style={{ width: 56, height: 56, background: 'radial-gradient(circle, rgba(143,213,255,0.18), transparent 70%)' }}
                  aria-hidden="true"
                >
                  {globeStatus === 'unavailable' && (
                    <div
                      className="absolute inset-2 rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(191,219,254,0.55), rgba(124,77,191,0.15) 70%, transparent)' }}
                    />
                  )}
                  <CosmicGlobe
                    step={0}
                    paused={reducedMotion}
                    onStatusChange={setGlobeStatus}
                    style={{ opacity: globeStatus === 'ready' ? 1 : 0, transition: 'opacity 0.4s ease' }}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                    {tHome('exploreExperience')} <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ghost)' }}>{tHome('exploreExperienceCaption')}</p>
                </div>
              </Link>

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
            </div>

            <div className="min-w-0">
            <section data-testid="universe-field" aria-label={tHome('homeStarMapTitle')}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-white">{tHome('homeStarMapTitle')}</h2>
                <Link href="/star-map" className="text-xs text-violet-200">{tHome('openFullMap')} →</Link>
              </div>
              <StarMap compact />
            </section>
              {featuredPlanet && (
                <button
                  type="button"
                  onClick={() => setSelectedPlanet(featuredPlanet)}
                  data-testid="closest-orbit" className="mt-6 w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-all duration-200"
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

            <HorizontalCarousel label={tHome('recommendedCommunities')}>
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
            </HorizontalCarousel>
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
            {postsError && <div role="alert" className="mb-4 text-sm text-red-200">{tStream('listError')} <button type="button" className="underline" onClick={() => setPostsRevision(value => value + 1)}>{tContext('retry')}</button></div>}
            {postsLoading && <p role="status" className="mb-4 text-sm text-white/40">{tContext('loading')}</p>}
            {sharedPosts.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
                {sharedPosts.map((post) => (
                  <div key={post.id} className="w-64 flex-none sm:w-72">
                    <PostCard post={post} onOpen={setSelectedStreamPost} origin="/" />
                  </div>
                ))}
              </div>
            ) : !postsError && !postsLoading && (
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
        origin="/"
        open={!!selectedStreamPost}
        currentUserId={session?.user.id}
        onClose={() => setSelectedStreamPost(null)}
        onPostUpdated={(post) => { setSelectedStreamPost(post); setSharedPosts(posts => posts.map(item => item.id === post.id ? post : item)) }}
        onDeleted={id => { setSelectedStreamPost(null); setSharedPosts(posts => posts.filter(post => post.id !== id)) }}
      />
    </AppShell>
  )
}
