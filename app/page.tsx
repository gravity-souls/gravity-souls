'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import LightCone from '@/components/fx/LightCone'
import PlanetCard from '@/components/planet/PlanetCard'
import PlanetPreviewDrawer from '@/components/planet/PlanetPreviewDrawer'
import GalaxyCard from '@/components/galaxy/GalaxyCard'
import UniverseSearch from '@/components/universe/UniverseSearch'
import SectionHeader from '@/components/ui/SectionHeader'
import GlowButton from '@/components/ui/GlowButton'
import { getPlanetProfile, getSbtiResult, getUserRole } from '@/lib/user'
import { authClient } from '@/lib/auth-client'
import type { PlanetProfile, PlanetVisualConfig } from '@/types/planet'
import type { GalaxyPreview } from '@/types/galaxy'

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
  { id: 'p-aelion',   x: 11, y: 18 },
  { id: 'p-noctaris', x: 22, y: 42 },
  { id: 'p-vaelith',  x:  6, y: 60 },
  // Zone 2  -  technical cluster (top-right: systems, building)
  { id: 'p-kindus',   x: 70, y: 12 },
  { id: 'p-novaxis',  x: 80, y: 34 },
  { id: 'p-spirax',   x: 63, y: 50 },
  // Zone 3  -  emotional/warm cluster (center-bottom)
  { id: 'p-elarith',  x: 44, y: 58 },
  { id: 'p-orbalin',  x: 55, y: 74 },
  { id: 'p-calenvix', x: 36, y: 80 },
  // Zone 4  -  nomadic/wandering cluster (bottom edges)
  { id: 'p-driftan',  x: 17, y: 78 },
  { id: 'p-lumira',   x: 72, y: 72 },
  // Free-drifting
  { id: 'p-sorvae',   x: 42, y: 22 },
]

// --- Nebula zones  -  thematic atmospheric clusters ----------------------------

const NEBULA_ZONES = [
  { id: 'contemplative', label: '孤独 / 内省', x: 14, y: 35, color: '#a78bfa', size: 340, galaxySlug: 'slow-thinkers' },
  { id: 'technical',     label: '构建 / 系统', x: 72, y: 30, color: '#60a5fa', size: 290, galaxySlug: 'signal-noise'  },
  { id: 'emotional',     label: '情感 / 温暖', x: 46, y: 68, color: '#f9a8d4', size: 320, galaxySlug: 'warm-frequency' },
  { id: 'wandering',     label: '流浪 / 边界', x: 19, y: 76, color: '#34d399', size: 240, galaxySlug: 'threshold-states' },
]

// --- Page --------------------------------------------------------------------

export default function UniversePage() {
  const router = useRouter()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetProfile | null>(null)
  const [userRole, setUserRole] = useState<'explorer' | 'resonator'>('explorer')
  const [showLanding, setShowLanding] = useState(false)
  const [hasActivePlanet, setHasActivePlanet] = useState<boolean | null>(null)

  useEffect(() => {
    setUserRole(getUserRole())

    const hasPlanet = !!getPlanetProfile()
    const hasSbti = !!getSbtiResult()

    if (!hasPlanet && !hasSbti) {
      setShowLanding(true)
    }
  }, [])

  // Check if logged-in user has an active planet via API
  useEffect(() => {
    if (sessionPending || !session?.user) {
      setHasActivePlanet(null)
      return
    }
    let cancelled = false
    fetch('/api/my-planet')
      .then((res) => {
        if (!cancelled) setHasActivePlanet(res.ok)
      })
      .catch(() => {
        if (!cancelled) setHasActivePlanet(false)
      })
    return () => { cancelled = true }
  }, [session, sessionPending])

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

  // --- Nearby planets state ---------------------------------------------------
  const [nearbyPlanets, setNearbyPlanets] = useState<PlanetProfile[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setNearbyLoading(true)
    fetch('/api/universe')
      .then((r) => r.ok ? r.json() : [])
      .then((data: UniversePlanet[]) => {
        if (cancelled) return
        const mapped: PlanetProfile[] = data.slice(0, 6).map((p) => {
          const v = (p.visual && typeof p.visual === 'object') ? p.visual as PlanetVisualConfig : {
            coreColor: '#a78bfa', accentColor: '#6366f1',
            ringStyle: 'single' as const, surfaceStyle: 'smooth' as const,
            satelliteCount: 1, size: 'md' as const,
          }
          return {
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
        })
        setNearbyPlanets(mapped)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setNearbyLoading(false) })
    return () => { cancelled = true }
  }, [session])

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

  // -- Landing gate: no local data AND not logged in  -  let user choose sign-in or new scan --
  if (showLanding && !session?.user && !sessionPending) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--background)' }}>
        <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.10} double />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-md">
          {/* Decorative orb */}
          <div
            className="w-20 h-20 rounded-full animate-pulse-glow"
            style={{
              background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, rgba(124,58,237,0.08) 70%, transparent 100%)',
              boxShadow: '0 0 40px rgba(167,139,250,0.2)',
            }}
            aria-hidden="true"
          />

          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{
              background: 'linear-gradient(135deg, #e8e0ff 0%, var(--star) 60%, var(--aurora) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Gravity-Souls
          </h1>

          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.7 }}>
            A universe shaped by personality. Take a soul scan to create your planet  -  or sign in if you already have one.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 w-full sm:w-auto">
            <GlowButton href="/sbti?next=/create-planet" variant="primary" className="px-8 py-3.5 text-sm w-full sm:w-auto">
              Begin Soul Scan
            </GlowButton>
            <GlowButton href="/sign-in" variant="secondary" className="px-8 py-3.5 text-sm w-full sm:w-auto">
              Sign in
            </GlowButton>
          </div>

          <p className="text-xs mt-4" style={{ color: 'var(--ghost)', opacity: 0.5 }}>
            Already have an account? Sign in to recover your planet.
          </p>
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="flex flex-col">

        {/* -- Atmospheric light cone ---------------------------------------- */}
        <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.10} double />
        <LightCone origin="top-right"  color="rgba(99,102,241,1)"  opacity={0.05} double={false} />

        {/* ===============================================================
            SECTION 1  -  Universe Entry (search + universe field)
        =============================================================== */}
        <section className="relative" style={{ minHeight: '100vh' }}>

          {/* Search zone  -  sits above the field */}
          <div className="relative z-20 px-6 pt-10 pb-6 max-w-2xl mx-auto">
            <p className="text-eyebrow mb-5 text-center">Universe</p>
            <UniverseSearch onPlanetSelect={setSelectedPlanet} />
          </div>

          {/* -- Universe field ------------------------------------------- */}
          {/* Desktop: spatial scatter with absolute % positioning        */}
          {/* Mobile: hidden in favor of the stream section below         */}
          <div
            className="relative hidden md:block"
            style={{ height: '68vh', marginTop: 8 }}
            aria-label="Universe field  -  explore planets and galaxy clusters"
          >
            {/* Nebula zone atmospheric blobs */}
            {NEBULA_ZONES.map((zone) => (
              <div
                key={zone.id}
                className="absolute pointer-events-none"
                style={{
                  left:      `${zone.x}%`,
                  top:       `${zone.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width:     zone.size,
                  height:    zone.size,
                  background: `radial-gradient(circle, ${zone.color}14 0%, ${zone.color}06 45%, transparent 70%)`,
                  borderRadius: '50%',
                  filter:    'blur(32px)',
                }}
                aria-hidden="true"
              />
            ))}

            {/* Galaxy zone labels  -  clickable links */}
            {NEBULA_ZONES.map((zone) => (
              <Link
                key={zone.id + '-label'}
                href={`/galaxy/${zone.galaxySlug}`}
                className="absolute group flex items-center gap-1.5 transition-opacity duration-300"
                style={{
                  left:       `${zone.x}%`,
                  top:        `${zone.y - 7}%`,
                  transform:  'translate(-50%, -50%)',
                  textDecoration: 'none',
                  opacity:    0.45,
                  zIndex:     5,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.45' }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: zone.color, boxShadow: `0 0 6px ${zone.color}`, flexShrink: 0, display: 'inline-block' }} aria-hidden="true" />
                <span
                  style={{
                    fontSize:      9,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color:         zone.color,
                    whiteSpace:    'nowrap',
                    fontWeight:    600,
                  }}
                >
                  {zone.label}
                </span>
              </Link>
            ))}

            {/* Orbit trace lines between zone centers (decorative) */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 2, opacity: 0.06 }}
              aria-hidden="true"
            >
              <line x1="14%" y1="35%" x2="72%" y2="30%" stroke="rgba(167,139,250,0.6)" strokeWidth="0.5" strokeDasharray="4 8" />
              <line x1="72%" y1="30%" x2="46%" y2="68%" stroke="rgba(96,165,250,0.6)"  strokeWidth="0.5" strokeDasharray="4 8" />
              <line x1="46%" y1="68%" x2="19%" y2="76%" stroke="rgba(249,168,212,0.6)" strokeWidth="0.5" strokeDasharray="4 8" />
              <line x1="19%" y1="76%" x2="14%" y2="35%" stroke="rgba(52,211,153,0.6)"  strokeWidth="0.5" strokeDasharray="4 8" />
            </svg>

            {/* Planet dots — from DB */}
            {nearbyPlanets.map((planet, i) => {
              const pos = UNIVERSE_PLANET_POSITIONS[i % UNIVERSE_PLANET_POSITIONS.length]
              return (
                <div
                  key={planet.id}
                  className="absolute"
                  style={{
                    left:      `${pos.x}%`,
                    top:       `${pos.y}%`,
                    transform: 'translate(-50%, -50%)',
                    zIndex:    10,
                  }}
                >
                  <PlanetCard
                    planet={planet}
                    size={46}
                    onClick={() => setSelectedPlanet(planet)}
                  />
                </div>
              )
            })}
          </div>

          {/* Nearby planets grid (mobile + fallback when few planets for scatter) */}
          <div className="block md:hidden px-4 py-6">
            <p className="text-data-label mb-4 px-2">Nearby planets</p>
            {nearbyLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex justify-center">
                    <div
                      className="rounded-full animate-pulse"
                      style={{ width: 44, height: 44, background: 'rgba(167,139,250,0.08)' }}
                    />
                  </div>
                ))}
              </div>
            ) : nearbyPlanets.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: 'var(--ghost)' }}>
                No planets nearby yet.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {nearbyPlanets.map((planet) => (
                  <div key={planet.id} className="flex justify-center">
                    <PlanetCard
                      planet={planet}
                      size={44}
                      onClick={() => setSelectedPlanet(planet)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Explorer CTA  -  session-aware */}
          {!sessionPending && (session?.user ? hasActivePlanet !== null : true) && (
            <div
              className="relative z-20 mx-auto max-w-lg px-6 pb-10 text-center"
              style={{ marginTop: '-24px' }}
            >
              <div
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl text-sm"
                style={{
                  background: 'rgba(18,14,52,0.75)',
                  backdropFilter: 'blur(16px)',
                  border:     '1px solid var(--border-soft)',
                }}
              >
                {/* Case 3: logged in with active planet → link to my-planet */}
                {session?.user && hasActivePlanet === true && (
                  <>
                    <span style={{ color: 'var(--ghost)' }}>Your planet is live.</span>
                    <Link
                      href="/my-planet"
                      className="font-medium transition-colors duration-200"
                      style={{ color: 'var(--star)', textDecoration: 'none' }}
                    >
                      View my planet →
                    </Link>
                  </>
                )}

                {/* Case 2: logged in, no planet → go to onboarding */}
                {session?.user && hasActivePlanet === false && (
                  <>
                    <span style={{ color: 'var(--ghost)' }}>Your planet doesn't exist yet.</span>
                    <button
                      onClick={() => router.push('/create-planet')}
                      className="font-medium transition-colors duration-200 bg-transparent border-none cursor-pointer"
                      style={{ color: 'var(--star)' }}
                    >
                      Take the soul scan →
                    </button>
                  </>
                )}

                {/* Case 1: not logged in → sign up, then onboarding */}
                {!session?.user && (
                  <>
                    <span style={{ color: 'var(--ghost)' }}>Your planet doesn't exist yet.</span>
                    <button
                      onClick={() => router.push('/sign-up?next=/create-planet')}
                      className="font-medium transition-colors duration-200 bg-transparent border-none cursor-pointer"
                      style={{ color: 'var(--star)' }}
                    >
                      Take the soul scan →
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ===============================================================
            SECTION 2  -  Galaxy strip
        =============================================================== */}
        <section className="px-6 py-14">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-6">
              <SectionHeader
                eyebrow="Communities"
                title="Galaxies"
                subtitle="Thematic clusters where planets find their orbit."
              />
              <Link
                href="/galaxies"
                className="text-xs font-medium transition-colors duration-200 shrink-0 mb-1.5"
                style={{ color: 'var(--ghost)', textDecoration: 'none' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--star)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ghost)' }}
              >
                View all →
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
                <span className="text-xs" style={{ color: 'var(--ghost)' }}>All galaxies</span>
              </Link>
            </div>
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
                    Your planet doesn't exist yet
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                    Creating your planet is not registration. It's the moment you tell the universe who you are  -  and let the right people find you.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <GlowButton onClick={() => router.push('/sign-up?next=/create-planet')} variant="primary" className="px-8 py-3">
                    Begin formation
                  </GlowButton>
                  <GlowButton href="/stream" variant="ghost" className="px-8 py-3">
                    Just drift for now
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
                    Your planet doesn't exist yet
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                    Creating your planet is not registration. It's the moment you tell the universe who you are  -  and let the right people find you.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <GlowButton onClick={() => router.push('/create-planet')} variant="primary" className="px-8 py-3">
                    Begin formation
                  </GlowButton>
                  <GlowButton href="/stream" variant="ghost" className="px-8 py-3">
                    Just drift for now
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
                    Your daily resonance is ready
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                    Five planets have entered your orbit today. See who resonates, and why.
                  </p>
                </div>
                <GlowButton href="/resonance" variant="primary" className="px-8 py-3">
                  Open resonance
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
        userRole={userRole}
      />
    </>
  )
}
