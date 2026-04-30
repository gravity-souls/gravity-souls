'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import EmptyState from '@/components/ui/EmptyState'
import LockedLayer from '@/components/ui/LockedLayer'
import PlanetLoading from '@/app/planet/[id]/loading'
import PlanetHero from '@/components/planet/PlanetHero'
import MatchReasonPanel from '@/components/planet/MatchReasonPanel'
import PlanetResonancePanel from '@/components/planet/PlanetResonancePanel'
import GalaxyMemberships from '@/components/planet/GalaxyMemberships'
import ExplorationTracePanel from '@/components/planet/ExplorationTracePanel'
import ProfileLayerSection from '@/components/planet/ProfileLayerSection'
import { CognitiveStyleModule, EmotionalFrequencyModule, ContentOrbit, ThemeCloud } from '@/components/planet/PlanetModules'
import ResonanceMap from '@/components/planet/ResonanceMap'
import { getResonanceMatches } from '@/lib/match'
import { getPlanetById } from '@/lib/mock-planets'
import { getPlanetProfile, getUserRole } from '@/lib/user'
import type { PlanetProfile, ResonancePlanet } from '@/types/planet'

const DEFAULT_VISUAL: PlanetProfile['visual'] = {
  coreColor: '#a78bfa',
  accentColor: '#c4b5fd',
  ringStyle: 'single',
  surfaceStyle: 'smooth',
  satelliteCount: 1,
  size: 'lg',
}

// --- Cultural coordinates panel ----------------------------------------------
// Shows culturalTags and travelCities as visual clusters.

function CulturalCoordinates({ culturalTags, travelCities, accentColor }: {
  culturalTags?: string[]
  travelCities?: string[]
  accentColor: string
}) {
  const hasTags   = culturalTags   && culturalTags.length > 0
  const hasCities = travelCities   && travelCities.length > 0
  if (!hasTags && !hasCities) return null

  return (
    <div className="flex flex-col gap-4">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        Cultural coordinates
      </span>

      {hasTags && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)' }}>
            Touchstones
          </p>
          <div className="flex flex-wrap gap-1.5">
            {culturalTags!.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded-md tracking-wide"
                style={{
                  background: `${accentColor}10`,
                  border: `1px solid ${accentColor}25`,
                  color: accentColor,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {hasCities && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)' }}>
            Orbit cities
          </p>
          <div className="flex flex-wrap gap-2">
            {travelCities!.map((city) => (
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

// --- Atmospheric fog veil  -  aspirational locked state -------------------------
// A more poetic alternative to LockedLayer for full sections.

function FogVeil({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-4 py-10 px-6 text-center"
      style={{
        background: 'linear-gradient(160deg, rgba(8,6,28,0.75) 0%, rgba(18,14,52,0.65) 100%)',
        border: '1px solid rgba(167,139,250,0.10)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Decorative nebula behind */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(124,58,237,0.08) 0%, transparent 65%)',
        }}
      />

      <div
        className="relative w-10 h-10 rounded-full flex items-center justify-center text-base"
        style={{
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(167,139,250,0.22)',
          color: 'var(--star)',
          boxShadow: '0 0 24px rgba(124,58,237,0.18)',
        }}
      >
        ◌
      </div>
      <div className="relative flex flex-col gap-1.5">
        <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          {title}
        </p>
        <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--ink)', opacity: 0.65 }}>
          {message}
        </p>
      </div>
      <GlowButton href="/create-planet" variant="primary" className="relative px-6 py-2.5 text-sm">
        Begin formation →
      </GlowButton>
    </div>
  )
}

// --- Send signal button (starts a conversation) ----------------------------

function SendSignalButton({ planet }: { planet: PlanetProfile }) {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: planet.userId,
          message: `First signal to ${planet.name}`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`/messages/${data.conversationId}`)
        return
      }

      if (res.status === 401) {
        router.push('/sign-in')
        return
      }

      setError('This demo planet is not connected to a real inbox yet.')
    } catch {
      setError('Could not open this signal right now.')
    }
    setSending(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <GlowButton
        variant="primary"
        className="py-3 text-sm"
        onClick={handleSend}
        disabled={sending}
      >
        {sending ? 'Sending signal...' : 'Send signal'}
      </GlowButton>
      {error && (
        <p className="text-xs" style={{ color: 'var(--ghost)' }}>
          {error}
        </p>
      )}
    </div>
  )
}

// --- Helper: convert DB planet to PlanetProfile ------------------------------

function dbPlanetToProfile(data: Record<string, unknown>): PlanetProfile {
  const visual = { ...DEFAULT_VISUAL, ...((data.visual as Partial<PlanetProfile['visual']>) ?? {}) }

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
    visual,
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

// --- Page inner ---------------------------------------------------------------

function PlanetPageInner() {
  const params = useParams()
  const id = params?.id as string

  const [planet, setPlanet]             = useState<PlanetProfile | null>(null)
  const [loading, setLoading]           = useState(true)
  const [viewerRole, setViewerRole]     = useState<'self' | 'explorer' | 'resonator'>('explorer')
  const [myMatch, setMyMatch]           = useState<ResonancePlanet | null>(null)
  const [viewerPlanet, setViewerPlanet] = useState<PlanetProfile | null>(null)
  const [resonances, setResonances]     = useState<ResonancePlanet[]>([])

  useEffect(() => {
    async function load() {
      // Fetch the planet from API
      let p: PlanetProfile | null = null
      try {
        const res = await fetch(`/api/planets/${id}`)
        if (res.ok) {
          const data = await res.json()
          p = dbPlanetToProfile(data)
        }
      } catch { /* ignore */ }

      if (!p) {
        p = getPlanetById(id) ?? null
      }

      setPlanet(p)
      setLoading(false)

      if (!p) return

      const role     = getUserRole()
      const myPlanet = getPlanetProfile()
      setViewerPlanet(myPlanet)

      // Also try fetching my planet from API for self-detection
      let myPlanetId: string | null = myPlanet?.id ?? null
      let myData: Record<string, unknown> | null = null
      try {
        const myRes = await fetch('/api/my-planet')
        if (myRes.ok) {
          myData = await myRes.json()
          myPlanetId = myData!.id as string
          if (!myPlanet) {
            setViewerPlanet(dbPlanetToProfile(myData!))
          }
        }
      } catch { /* ignore */ }

      if (myPlanetId === id) {
        setViewerRole('self')
      } else if (role === 'resonator' || myPlanetId) {
        setViewerRole('resonator')
        const vp = myPlanet ?? (myPlanetId ? dbPlanetToProfile(myData!) : null)
        if (vp) {
          const matches = getResonanceMatches(vp, [p], 1)
          if (matches.length > 0) setMyMatch(matches[0])
        }
      } else {
        setViewerRole('explorer')
      }

      // Fetch other planets for resonance map
      try {
        const planetsRes = await fetch('/api/planets')
        if (planetsRes.ok) {
          const allPlanets = (await planetsRes.json() as Record<string, unknown>[]).map(dbPlanetToProfile)
          const reso = getResonanceMatches(p, allPlanets, 4)
          setResonances(reso)
        }
      } catch { /* ignore */ }
    }

    load()
  }, [id])

  if (loading) {
    return <PlanetLoading />
  }

  if (!planet) {
    return (
      <AppShell>
        <EmptyState
          symbol="◌"
          title="Planet not found"
          subtitle="These coordinates lead to empty space. The planet may have drifted or never existed."
          action={<GlowButton href="/stream" variant="secondary">Return to stream</GlowButton>}
          className="min-h-[60vh] justify-center"
        />
      </AppShell>
    )
  }

  const { visual } = planet
  const isResonator = viewerRole === 'resonator'
  const isSelf      = viewerRole === 'self'

  return (
    <AppShell>
      <LightCone origin="top-left" color={visual.coreColor} opacity={0.07} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-6 pb-20 max-w-6xl mx-auto">

        {/* -- Breadcrumb ------------------------------------------------ */}
        <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: 'var(--ghost)' }}>
          <Link href="/stream" className="hover:opacity-80 transition-opacity" style={{ color: 'var(--ghost)' }}>
            Stream
          </Link>
          <span style={{ opacity: 0.4 }}>/</span>
          <span style={{ color: visual.coreColor }}>{planet.name}</span>
          {isSelf && (
            <>
              <span style={{ opacity: 0.4 }}>·</span>
              <Link
                href="/my-planet"
                className="transition-opacity hover:opacity-80"
                style={{ color: 'var(--star)' }}
              >
                View full planet →
              </Link>
            </>
          )}
        </nav>

        {/* -- Hero ------------------------------------------------------ */}
        <PlanetHero planet={planet} viewerRole={viewerRole} />

        {/* -- Match reason (Resonator only) ------------------------------ */}
        {isResonator && (
          <div className="mt-6 flex flex-col gap-4">
            {/* Orbit dimension bars  -  derived from both planets */}
            {viewerPlanet && (
              <PlanetResonancePanel subject={planet} viewerPlanet={viewerPlanet} />
            )}
            {/* Beam colour + strength ring (from resonance engine) */}
            {myMatch && (
              <MatchReasonPanel match={myMatch} targetPlanet={planet} />
            )}
          </div>
        )}

        {/* -- Main content grid ----------------------------------------- */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* -- Left / main column (2 wide) --------------------------- */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Cognitive axes */}
            <OrbitCard glowColor={visual.coreColor} className="p-5">
              {isResonator || isSelf ? (
                <CognitiveStyleModule planet={planet} />
              ) : (
                <LockedLayer
                  reason="Only resonators can map another planet's cognitive signature."
                  ctaLabel="Begin formation"
                  ctaHref="/create-planet"
                >
                  <CognitiveStyleModule planet={planet} />
                </LockedLayer>
              )}
            </OrbitCard>

            {/* Emotional frequency */}
            <OrbitCard glowColor={visual.accentColor} className="p-5">
              {isResonator || isSelf ? (
                <EmotionalFrequencyModule planet={planet} />
              ) : (
                <LockedLayer
                  reason="Emotional frequencies are only visible between resonators."
                  ctaLabel="Create your planet"
                  ctaHref="/create-planet"
                >
                  <EmotionalFrequencyModule planet={planet} />
                </LockedLayer>
              )}
            </OrbitCard>

            {/* Content orbit */}
            <OrbitCard glowColor={visual.coreColor} className="p-5">
              {isResonator || isSelf ? (
                <ContentOrbit planet={planet} />
              ) : (
                // Explorer sees only the first fragment; rest is fogged
                <div className="flex flex-col gap-3">
                  <span
                    className="text-xs tracking-widest uppercase"
                    style={{ color: 'var(--star)', opacity: 0.55 }}
                  >
                    Thought fragments
                  </span>
                  {planet.contentFragments.slice(0, 1).map((fragment, i) => (
                    <div
                      key={i}
                      className="rounded-lg px-4 py-3"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        borderLeft: `2px solid ${visual.coreColor}88`,
                      }}
                    >
                      <p className="text-sm leading-relaxed italic" style={{ color: 'var(--ink)', opacity: 0.78 }}>
                        &ldquo;{fragment}&rdquo;
                      </p>
                    </div>
                  ))}
                  {planet.contentFragments.length > 1 && (
                    <FogVeil
                      title="This orbit layer is sealed"
                      message={`${planet.contentFragments.length - 1} more fragments from ${planet.name}  -  only resonators can read them.`}
                    />
                  )}
                </div>
              )}
            </OrbitCard>

            {/* Core themes */}
            <OrbitCard glowColor={visual.accentColor} className="p-5">
              <ThemeCloud planet={planet} />
            </OrbitCard>

          </div>

          {/* -- Right column ------------------------------------------ */}
          <div className="flex flex-col gap-6">

            {/* Cultural coordinates */}
            {(planet.culturalTags || planet.travelCities) && (
              <OrbitCard glowColor={visual.accentColor} className="p-5">
                {isResonator || isSelf ? (
                  <CulturalCoordinates
                    culturalTags={planet.culturalTags}
                    travelCities={planet.travelCities}
                    accentColor={visual.accentColor}
                  />
                ) : (
                  <LockedLayer
                    reason="Cultural coordinates are a deeper layer. Create your planet to explore."
                    ctaLabel="Begin formation"
                    ctaHref="/create-planet"
                  >
                    <CulturalCoordinates
                      culturalTags={planet.culturalTags}
                      travelCities={planet.travelCities}
                      accentColor={visual.accentColor}
                    />
                  </LockedLayer>
                )}
              </OrbitCard>
            )}

            {/* Galaxy memberships  -  public, always visible */}
            {planet.galaxyIds && planet.galaxyIds.length > 0 && (
              <OrbitCard glowColor={visual.coreColor} className="p-5">
                <GalaxyMemberships galaxyIds={planet.galaxyIds} />
              </OrbitCard>
            )}

            {/* Exploration traces  -  locked for Explorer */}
            {planet.explorationTraces && planet.explorationTraces.length > 0 && (
              <OrbitCard glowColor={visual.accentColor} className="p-5">
                <ProfileLayerSection
                  title="Exploration traces"
                  locked={!isResonator && !isSelf}
                  lockReason="Create your planet to unlock deeper resonance"
                  lockCtaLabel="Begin formation"
                  lockCtaHref="/create-planet"
                  accentColor={visual.coreColor}
                >
                  <ExplorationTracePanel
                    traces={planet.explorationTraces}
                    accentColor={visual.accentColor}
                  />
                </ProfileLayerSection>
              </OrbitCard>
            )}

            {/* Resonance field (Resonator / self only) */}
            {(isResonator || isSelf) && resonances.length > 0 ? (
              <OrbitCard glowColor={visual.coreColor} className="p-5">
                <ResonanceMap
                  planets={resonances}
                  hubColor={visual.coreColor}
                  title={`Resonances of ${planet.name}`}
                />
              </OrbitCard>
            ) : (!isResonator && !isSelf) && (
              <OrbitCard glowColor={visual.coreColor} className="p-5">
                <FogVeil
                  title="Resonance field hidden"
                  message="Only resonators can see which planets orbit in this field."
                />
              </OrbitCard>
            )}

          </div>
        </div>

        {/* -- Footer navigation ------------------------------------------ */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 mt-4 border-t border-[rgba(167,139,250,0.07)]">
          <GlowButton href="/discover" variant="secondary" className="py-3 text-sm">
            Back to discover
          </GlowButton>
          {!isSelf && isResonator && (
            <SendSignalButton planet={planet} />
          )}
          {!isSelf && (
            <GlowButton href="/my-planet" variant="ghost" className="py-3 text-sm">
              View my planet
            </GlowButton>
          )}
        </div>

      </div>
    </AppShell>
  )
}

// --- Page  -  Suspense wrapper -------------------------------------------------

export default function PlanetPage() {
  return (
    <Suspense fallback={<PlanetLoading />}>
      <PlanetPageInner />
    </Suspense>
  )
}
