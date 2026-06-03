'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { startTransition, useEffect, useState, type CSSProperties } from 'react'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import PlanetVisual from '@/components/planet/PlanetVisual'
import GlassPanel from '@/components/ui/GlassPanel'
import GlowButton from '@/components/ui/GlowButton'
import type { PlanetConfig, PlanetProfile } from '@/types/planet'

type DeckMode = 'planets' | 'galaxies'

interface DeckNodePosition {
  left: string
  top: string
}

interface UniverseGalaxySummary {
  id: string
  name: string
}

interface UniverseTelemetry {
  cognitive: PlanetProfile['cognitiveAxes']
  emotional: {
    depth: number
    warmth: number
    clarity: number
    resonance: number
  }
  signalScore: number
  linkedPlanets: number
  attachedGalaxies: UniverseGalaxySummary[]
}

type UniversePlanet = PlanetProfile & {
  userId: string
  planetConfig: PlanetConfig
  moodTags: string[]
  userLevel: number
  isOnline: boolean
  galaxies: UniverseGalaxySummary[]
  telemetry: UniverseTelemetry
}

interface UniverseGalaxy {
  id: string
  slug: string
  name: string
  symbol: string
  description: string
  tagline: string | null
  keywords: string[]
  mood: string
  maturity: string
  accentColor: string
  memberCount: number
  recentActivityScore: number
  topTags: string[]
  upcomingEventsCount: number
  members: {
    id: string
    name: string
    planetConfig: PlanetConfig
    userLevel: number
  }[]
}

const EMPTY_GALAXY: UniverseGalaxy = {
  id: 'empty-galaxy',
  slug: 'galaxies',
  name: 'No galaxy joined',
  symbol: '✦',
  description: 'Join a galaxy to see live cluster telemetry here.',
  tagline: 'Join a galaxy to activate this atlas.',
  keywords: [],
  mood: 'quiet',
  maturity: 'emerging',
  accentColor: '#7dd3fc',
  memberCount: 0,
  recentActivityScore: 0,
  topTags: [],
  upcomingEventsCount: 0,
  members: [],
}

const EMPTY_PLANET: UniversePlanet = {
  id: 'empty-planet',
  userId: 'empty-user',
  name: 'Your planet',
  avatarSymbol: '✦',
  tagline: 'Your orbit is empty. Start with Resonance.',
  role: 'resonator',
  mood: 'mixed',
  style: 'minimal',
  lifestyle: 'solitary',
  coreThemes: [],
  contentFragments: [],
  visual: {
    coreColor: '#7dd3fc',
    accentColor: '#a78bfa',
    ringStyle: 'none',
    surfaceStyle: 'smooth',
    satelliteCount: 0,
    size: 'xl',
  },
  cognitiveAxes: { abstract: 0, introspective: 0 },
  emotionalBars: [
    { label: 'Depth', value: 0, color: '#a78bfa' },
    { label: 'Warmth', value: 0, color: '#f97316' },
    { label: 'Clarity', value: 0, color: '#60a5fa' },
    { label: 'Resonance', value: 0, color: '#34d399' },
  ],
  createdAt: new Date(0).toISOString(),
  planetConfig: {
    baseTexture: 'jupiter.jpg',
    tintColor: '#7dd3fc',
    atmosphereColor: '#a78bfa',
    atmosphereDensity: 0.12,
    hasRing: false,
    ringColor: '#a78bfa',
    rotationSpeed: 0.018,
    cloudOpacity: 0,
  },
  moodTags: [],
  userLevel: 1,
  isOnline: false,
  galaxies: [],
  telemetry: {
    cognitive: { abstract: 0, introspective: 0 },
    emotional: { depth: 0, warmth: 0, clarity: 0, resonance: 0 },
    signalScore: 0,
    linkedPlanets: 0,
    attachedGalaxies: [],
  },
}

const GALAXY_RING_POSITIONS: DeckNodePosition[] = [
  { left: '18%', top: '24%' },
  { left: '78%', top: '18%' },
  { left: '82%', top: '64%' },
  { left: '24%', top: '72%' },
  { left: '50%', top: '12%' },
  { left: '14%', top: '52%' },
]

const PLANET_RING_POSITIONS: DeckNodePosition[] = [
  { left: '19%', top: '28%' },
  { left: '75%', top: '20%' },
  { left: '81%', top: '58%' },
  { left: '28%', top: '74%' },
  { left: '53%', top: '14%' },
]

const MOOD_COLORS: Record<PlanetProfile['mood'], string> = {
  calm: '#7dd3fc',
  melancholic: '#a78bfa',
  intense: '#fb923c',
  cold: '#94a3b8',
  mixed: '#34d399',
}

function modeTitle(mode: DeckMode, t: ReturnType<typeof useTranslations>) {
  return mode === 'planets' ? t('planetObservatory') : t('galaxyAtlas')
}

function modeSubtitle(mode: DeckMode, t: ReturnType<typeof useTranslations>) {
  return mode === 'planets'
    ? t('planetSubtitle')
    : t('galaxySubtitle')
}

function switchMode(setMode: (mode: DeckMode) => void, mode: DeckMode) {
  startTransition(() => {
    setMode(mode)
  })
}

function DataBar({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}, ${color}88)`,
            boxShadow: `0 0 18px ${color}55`,
          }}
        />
      </div>
    </div>
  )
}

function ModeSwitch({
  mode,
  onChange,
}: {
  mode: DeckMode
  onChange: (mode: DeckMode) => void
}) {
  const t = useTranslations('universeDeck')

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full p-1"
      style={{
        background: 'rgba(9, 13, 30, 0.88)',
        border: '1px solid rgba(148, 163, 184, 0.16)',
        backdropFilter: 'blur(18px)',
      }}
    >
      {(['planets', 'galaxies'] as const).map((item) => {
        const active = item === mode
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] transition-all duration-300"
            style={{
              color: active ? '#f8fafc' : 'var(--ghost)',
              background: active
                ? 'linear-gradient(135deg, rgba(59,130,246,0.26), rgba(56,189,248,0.12))'
                : 'transparent',
              border: active
                ? '1px solid rgba(125,211,252,0.35)'
                : '1px solid transparent',
              boxShadow: active ? '0 0 24px rgba(56,189,248,0.12)' : 'none',
            }}
          >
            {item === 'planets' ? t('planets') : t('galaxies')}
          </button>
        )
      })}
    </div>
  )
}

function GalaxyCore({ galaxy }: { galaxy: UniverseGalaxy }) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute rounded-full animate-spin-slow"
        style={{
          width: 296,
          height: 296,
          border: `1px solid ${galaxy.accentColor}26`,
          boxShadow: `0 0 48px ${galaxy.accentColor}12`,
        }}
      />
      <div
        className="absolute rounded-full animate-spin-slow-rev"
        style={{
          width: 368,
          height: 196,
          border: `1px solid ${galaxy.accentColor}18`,
          opacity: 0.75,
        }}
      />
      <div
        className="relative flex h-48 w-48 items-center justify-center rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${galaxy.accentColor}bb 0%, ${galaxy.accentColor}33 48%, rgba(2,6,23,0.94) 78%)`,
          border: `1px solid ${galaxy.accentColor}40`,
          boxShadow: `0 0 0 1px ${galaxy.accentColor}24, 0 0 60px ${galaxy.accentColor}20, inset 0 0 48px rgba(255,255,255,0.04)`,
        }}
      >
        <div
          className="absolute inset-4 rounded-full"
          style={{
            border: `1px solid ${galaxy.accentColor}1f`,
            background: `conic-gradient(from 160deg, transparent 0deg, ${galaxy.accentColor}16 120deg, transparent 240deg)`,
          }}
        />
        <span
          className="relative z-10 text-6xl leading-none"
          style={{ color: '#f8fafc', textShadow: `0 0 28px ${galaxy.accentColor}` }}
        >
          {galaxy.symbol}
        </span>
      </div>
    </div>
  )
}

function PlanetChip({
  planet,
  active,
  onClick,
}: {
  planet: UniversePlanet
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-3 text-left transition-all duration-300"
      style={{
        background: active ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.68)',
        border: active ? `1px solid ${planet.visual.coreColor}55` : '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: active ? `0 0 0 1px ${planet.visual.coreColor}22, 0 0 26px ${planet.visual.coreColor}16` : 'none',
      }}
    >
      <div className="flex items-center gap-3">
        <PlanetAvatar planetConfig={planet.planetConfig} size={32} glowColor={planet.visual.coreColor} rotating />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{planet.name}</div>
          <div className="truncate text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--ghost)' }}>
            {planet.mood} · {planet.lifestyle}
          </div>
        </div>
        {planet.isOnline && (
          <span className="rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: '#86efac', border: '1px solid rgba(134,239,172,0.25)' }}>
            Live
          </span>
        )}
      </div>
    </button>
  )
}

function GalaxyChip({
  galaxy,
  active,
  onClick,
}: {
  galaxy: UniverseGalaxy
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl p-3 text-left transition-all duration-300"
      style={{
        background: active ? 'rgba(15, 23, 42, 0.96)' : 'rgba(15, 23, 42, 0.68)',
        border: active ? `1px solid ${galaxy.accentColor}55` : '1px solid rgba(148, 163, 184, 0.14)',
        boxShadow: active ? `0 0 0 1px ${galaxy.accentColor}22, 0 0 26px ${galaxy.accentColor}16` : 'none',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-full text-lg"
          style={{
            color: galaxy.accentColor,
            background: `radial-gradient(circle, ${galaxy.accentColor}20 0%, transparent 72%)`,
            boxShadow: `0 0 20px ${galaxy.accentColor}22`,
          }}
        >
          {galaxy.symbol}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{galaxy.name}</div>
          <div className="truncate text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--ghost)' }}>
            {galaxy.mood} · {galaxy.memberCount.toLocaleString()} members
          </div>
        </div>
      </div>
    </button>
  )
}

function PlanetOrbitNode({
  planet,
  position,
  onClick,
}: {
  planet: UniversePlanet
  position: DeckNodePosition
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex flex-col items-center gap-2 text-center transition-transform duration-300 hover:scale-105"
      style={{ left: position.left, top: position.top, transform: 'translate(-50%, -50%)' }}
    >
      {/* TODO: replace with miniature PlanetGlobe when performance allows */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full text-2xl"
        style={{
          color: planet.visual.accentColor,
          background: `radial-gradient(circle at 35% 30%, ${planet.visual.accentColor}40 0%, ${planet.visual.coreColor}20 52%, rgba(2,6,23,0.95) 80%)`,
          border: `1px solid ${planet.visual.coreColor}40`,
          boxShadow: `0 0 26px ${planet.visual.coreColor}20`,
        }}
      >
        {planet.avatarSymbol}
      </div>
      <div className="max-w-28 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--ink)' }}>
        {planet.name}
      </div>
    </button>
  )
}

function GalaxyOrbitNode({
  galaxy,
  position,
  onClick,
}: {
  galaxy: UniverseGalaxy
  position: DeckNodePosition
  onClick: () => void
}) {
  const size = Math.max(56, Math.min(88, 56 + galaxy.memberCount * 2))
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute flex flex-col items-center gap-2 text-center transition-transform duration-300 hover:scale-105"
      style={{ left: position.left, top: position.top, transform: 'translate(-50%, -50%)' }}
    >
      <div
        className="flex items-center justify-center rounded-full text-2xl"
        style={{
          width: size,
          height: size,
          color: galaxy.accentColor,
          background: `radial-gradient(circle, ${galaxy.accentColor}2f 0%, rgba(2,6,23,0.95) 72%)`,
          border: `1px solid ${galaxy.accentColor}44`,
          boxShadow: `0 0 26px ${galaxy.accentColor}18`,
        }}
      >
        {galaxy.symbol}
      </div>
      <div className="max-w-28 text-[11px] font-medium uppercase tracking-[0.18em]" style={{ color: 'var(--ink)' }}>
        {galaxy.name}
      </div>
    </button>
  )
}

function drawConnectionLines(nodes: DeckNodePosition[], color: string) {
  return nodes.map((position, index) => (
    <line
      key={`${position.left}-${position.top}`}
      x1="50%"
      y1="50%"
      x2={position.left}
      y2={position.top}
      stroke={color}
      strokeOpacity={index > 3 ? 0.18 : 0.3}
      strokeWidth="1"
      strokeDasharray={index % 2 === 0 ? '7 10' : '4 12'}
    />
  ))
}

export default function UniverseExplorationDeck() {
  const t = useTranslations('universeDeck')
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<DeckMode>('planets')
  const [selectedPlanetId, setSelectedPlanetId] = useState('')
  const [selectedGalaxyId, setSelectedGalaxyId] = useState('')
  const [planets, setPlanets] = useState<UniversePlanet[]>([])
  const [currentPlanet, setCurrentPlanet] = useState<UniversePlanet | null>(null)
  const [galaxies, setGalaxies] = useState<UniverseGalaxy[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadUniverse() {
      setLoading(true)
      try {
        const [planetResponse, galaxyResponse] = await Promise.all([
          fetch('/api/universe/planets'),
          fetch('/api/universe/galaxies'),
        ])
        if (!planetResponse.ok || !galaxyResponse.ok) throw new Error('Universe data unavailable')

        const planetPayload = await planetResponse.json() as { currentPlanet: UniversePlanet | null; planets: UniversePlanet[] }
        const galaxyPayload = await galaxyResponse.json() as { galaxies: UniverseGalaxy[] }
        if (cancelled) return

        const loadedPlanets = planetPayload.planets ?? []
        const loadedGalaxies = galaxyPayload.galaxies ?? []
        setCurrentPlanet(planetPayload.currentPlanet ?? null)
        setPlanets(loadedPlanets)
        setGalaxies(loadedGalaxies)

        const focus = searchParams.get('focus')
        const focusType = searchParams.get('type')
        if (focusType === 'galaxy' && focus) {
          setMode('galaxies')
          setSelectedGalaxyId(focus)
        } else if (focus) {
          const focusedPlanet = [planetPayload.currentPlanet, ...loadedPlanets]
            .filter((planet): planet is UniversePlanet => Boolean(planet))
            .find((planet) => planet.userId === focus || planet.id === focus)
          if (focusedPlanet) setSelectedPlanetId(focusedPlanet.id)
        } else if (loadedPlanets[0]) {
          setSelectedPlanetId(loadedPlanets[0].id)
        } else if (planetPayload.currentPlanet) {
          setSelectedPlanetId(planetPayload.currentPlanet.id)
        }

        if (!focus || focusType !== 'galaxy') setSelectedGalaxyId(loadedGalaxies[0]?.id ?? EMPTY_GALAXY.id)
      } catch {
        if (!cancelled) {
          setCurrentPlanet(null)
          setPlanets([])
          setGalaxies([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUniverse()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  const emptyOrbit = !loading && planets.length === 0
  const visiblePlanets = planets.length > 0 ? planets : currentPlanet ? [currentPlanet] : [EMPTY_PLANET]
  const selectedPlanet = visiblePlanets.find((planet) => planet.id === selectedPlanetId) ?? visiblePlanets[0]
  const selectedGalaxy = galaxies.find((galaxy) => galaxy.id === selectedGalaxyId || galaxy.slug === selectedGalaxyId) ?? galaxies[0] ?? EMPTY_GALAXY
  const linkedGalaxies = selectedPlanet
    ? selectedPlanet.galaxies.map((galaxy) => galaxies.find((item) => item.id === galaxy.id) ?? ({ ...EMPTY_GALAXY, id: galaxy.id, slug: galaxy.id, name: galaxy.name }))
    : []
  const relatedPlanets = selectedPlanet
    ? planets.filter((planet) => planet.id !== selectedPlanet.id).slice(0, PLANET_RING_POSITIONS.length)
    : []
  const adjacentGalaxies = galaxies
    .filter((galaxy) => galaxy.id !== selectedGalaxy.id)
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, GALAXY_RING_POSITIONS.length)

  const focusedGalaxyHref = selectedGalaxy.id === EMPTY_GALAXY.id ? '/galaxies' : `/galaxy/${selectedGalaxy.slug}`

  const viewportStyle: CSSProperties = {
    backgroundImage: [
      'radial-gradient(circle at 50% 50%, rgba(14, 165, 233, 0.12) 0%, rgba(2, 6, 23, 0) 58%)',
      'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px)',
      'linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: '100% 100%, 74px 74px, 74px 74px',
    backgroundPosition: 'center, center, center',
  }

  return (
    <AppShell noSideNav>
      <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-380 flex-col gap-6">
          <GlassPanel
            variant="elevated"
            className="relative overflow-hidden rounded-4xl px-5 py-5 sm:px-7 sm:py-6"
            style={{
              background: 'linear-gradient(180deg, rgba(3, 8, 23, 0.92) 0%, rgba(2, 6, 23, 0.82) 100%)',
              border: '1px solid rgba(125, 211, 252, 0.14)',
              boxShadow: '0 24px 120px rgba(2, 8, 23, 0.55)',
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at top left, rgba(56,189,248,0.12) 0%, transparent 34%), radial-gradient(circle at 82% 20%, rgba(96,165,250,0.10) 0%, transparent 28%)',
              }}
              aria-hidden="true"
            />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.34em]" style={{ color: '#7dd3fc' }}>
                  {t('eyebrow')}
                </div>
                <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-slate-50 sm:text-5xl">
                  {t('title')}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 sm:text-base" style={{ color: 'var(--ink)' }}>
                  {t('subtitle')}
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 lg:items-end">
                <ModeSwitch mode={mode} onChange={(nextMode) => switchMode(setMode, nextMode)} />
                <div className="flex flex-wrap gap-3">
                  <GlowButton href={mode === 'planets' ? `/planet/${selectedPlanet.id}` : focusedGalaxyHref} variant="secondary" className="px-5 py-3 text-xs uppercase tracking-[0.24em]">
                    {t('openFocusedObject')}
                  </GlowButton>
                  <GlowButton href={mode === 'planets' ? '/galaxies' : '/'} variant="ghost" className="px-5 py-3 text-xs uppercase tracking-[0.24em]">
                    {t('returnStandardView')}
                  </GlowButton>
                </div>
              </div>
            </div>
          </GlassPanel>

          <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_340px]">
            <GlassPanel
              as="aside"
              className="rounded-[28px] p-4 sm:p-5"
              style={{
                background: 'linear-gradient(180deg, rgba(2, 6, 23, 0.88) 0%, rgba(15, 23, 42, 0.74) 100%)',
                border: '1px solid rgba(148,163,184,0.14)',
              }}
            >
              <div className="flex items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('missionIndex')}</div>
                  <div className="mt-1 text-lg font-semibold text-slate-50">{modeTitle(mode, t)}</div>
                </div>
                <div className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.16)' }}>
                  {t('live')}
                </div>
              </div>

              <p className="mt-4 text-sm leading-7" style={{ color: 'var(--ink)' }}>
                {modeSubtitle(mode, t)}
              </p>

              <div className="mt-5 flex flex-col gap-3">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="h-18 animate-pulse rounded-2xl" style={{ background: 'rgba(148,163,184,0.08)' }} />
                  ))
                ) : mode === 'planets'
                  ? emptyOrbit ? (
                      <div className="rounded-2xl p-4 text-sm leading-7" style={{ color: 'var(--ink)', background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                        {t('emptyOrbit')}
                      </div>
                    ) : planets.slice(0, 7).map((planet) => (
                      <PlanetChip
                        key={planet.id}
                        planet={planet}
                        active={planet.id === selectedPlanet.id}
                        onClick={() => startTransition(() => setSelectedPlanetId(planet.id))}
                      />
                    ))
                  : galaxies.slice(0, 7).map((galaxy) => (
                      <GalaxyChip
                        key={galaxy.id}
                        galaxy={galaxy}
                        active={galaxy.id === selectedGalaxy.id}
                        onClick={() => startTransition(() => setSelectedGalaxyId(galaxy.id))}
                      />
                    ))}
              </div>

              <div className="mt-5 rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('flightPath')}</div>
                <div className="mt-3 flex flex-col gap-3 text-sm leading-6" style={{ color: 'var(--ink)' }}>
                  <div>{t('flightStart', { mode: mode === 'planets' ? t('planet') : t('galaxy') })}</div>
                  <div>{t('flightFollow')}</div>
                  <div>{t('flightTelemetry')}</div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel
              as="section"
              className="relative overflow-hidden rounded-4xl p-4 sm:p-5"
              style={{
                background: 'linear-gradient(180deg, rgba(2, 6, 23, 0.95) 0%, rgba(5, 10, 24, 0.84) 100%)',
                border: '1px solid rgba(125, 211, 252, 0.14)',
              }}
            >
              <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: '#7dd3fc' }}>
                    {t('spatialViewport')}
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-50">
                    {mode === 'planets' ? selectedPlanet.name : selectedGalaxy.name}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {mode === 'planets' ? (
                    <>
                      <div className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: selectedPlanet.visual.accentColor, border: `1px solid ${selectedPlanet.visual.coreColor}40`, background: `${selectedPlanet.visual.coreColor}10` }}>
                        {selectedPlanet.mood}
                      </div>
                      <div className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.14)' }}>
                        {selectedPlanet.style}
                      </div>
                      <div className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.14)' }}>
                        {selectedPlanet.lifestyle}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: selectedGalaxy.accentColor, border: `1px solid ${selectedGalaxy.accentColor}40`, background: `${selectedGalaxy.accentColor}10` }}>
                        {selectedGalaxy.mood}
                      </div>
                      <div className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.14)' }}>
                        {selectedGalaxy.maturity}
                      </div>
                      <div className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.14)' }}>
                        {selectedGalaxy.memberCount.toLocaleString()} members
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="relative min-h-155 overflow-hidden rounded-[28px] border" style={{ ...viewportStyle, borderColor: 'rgba(148,163,184,0.12)' }}>
                <div
                  className="absolute inset-0 animate-beam-scan"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(56,189,248,0.08) 48%, transparent 100%)',
                    mixBlendMode: 'screen',
                  }}
                  aria-hidden="true"
                />

                <div
                  className="absolute left-1/2 top-1/2 rounded-full border"
                  style={{
                    width: 440,
                    height: 440,
                    transform: 'translate(-50%, -50%)',
                    borderColor: 'rgba(125, 211, 252, 0.1)',
                  }}
                  aria-hidden="true"
                />
                <div
                  className="absolute left-1/2 top-1/2 rounded-full border"
                  style={{
                    width: 620,
                    height: 620,
                    transform: 'translate(-50%, -50%)',
                    borderColor: 'rgba(148, 163, 184, 0.08)',
                  }}
                  aria-hidden="true"
                />

                <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                  {mode === 'planets'
                    ? drawConnectionLines(PLANET_RING_POSITIONS.slice(0, relatedPlanets.length), 'rgba(125, 211, 252, 0.38)')
                    : drawConnectionLines(GALAXY_RING_POSITIONS.slice(0, adjacentGalaxies.length), 'rgba(148, 163, 184, 0.38)')}
                </svg>

                {mode === 'planets' ? (
                  <>
                    <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                      {loading ? (
                        <div className="h-48 w-48 animate-pulse rounded-full" style={{ background: 'radial-gradient(circle, rgba(125,211,252,0.2), rgba(15,23,42,0.8))', border: '1px solid rgba(125,211,252,0.2)' }} />
                      ) : (
                        <PlanetVisual visual={{ ...selectedPlanet.visual, size: 'xl' }} symbol={selectedPlanet.avatarSymbol} />
                      )}
                    </div>

                    {relatedPlanets.map((planet, index) => (
                      <PlanetOrbitNode
                        key={planet.id}
                        planet={planet}
                        position={PLANET_RING_POSITIONS[index]}
                        onClick={() => startTransition(() => setSelectedPlanetId(planet.id))}
                      />
                    ))}

                    {linkedGalaxies.map((galaxy, index) => (
                      <GalaxyOrbitNode
                        key={galaxy.id}
                        galaxy={galaxy}
                        position={PLANET_RING_POSITIONS[index + relatedPlanets.length] ?? { left: '50%', top: '82%' }}
                        onClick={() => {
                          startTransition(() => {
                            setSelectedGalaxyId(galaxy.id)
                            setMode('galaxies')
                          })
                        }}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                      <GalaxyCore galaxy={selectedGalaxy} />
                    </div>

                    {adjacentGalaxies.map((galaxy, index) => (
                      <GalaxyOrbitNode
                        key={galaxy.id}
                        galaxy={galaxy}
                        position={GALAXY_RING_POSITIONS[index]}
                        onClick={() => {
                          startTransition(() => {
                            setSelectedGalaxyId(galaxy.id)
                          })
                        }}
                      />
                    ))}
                  </>
                )}

                <div className="absolute bottom-4 left-4 right-4 grid gap-3 rounded-3xl border p-4 backdrop-blur-xl lg:grid-cols-[1.2fr_0.8fr]" style={{ borderColor: 'rgba(148,163,184,0.12)', background: 'rgba(2, 6, 23, 0.72)' }}>
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.28em]" style={{ color: '#7dd3fc' }}>{t('focusBriefing')}</div>
                    <div className="mt-2 text-sm leading-7" style={{ color: 'var(--ink)' }}>
                      {mode === 'planets'
                        ? selectedPlanet.tagline
                        : selectedGalaxy.tagline ?? selectedGalaxy.description}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {mode === 'planets' ? (
                      <>
                        <div className="rounded-2xl p-3" style={{ background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148,163,184,0.12)' }}>
                          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('linkedGalaxies')}</div>
                          <div className="mt-1 text-xl font-semibold text-slate-50">{linkedGalaxies.length}</div>
                        </div>
                        <div className="rounded-2xl p-3" style={{ background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148,163,184,0.12)' }}>
                          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('signalScore')}</div>
                          <div className="mt-1 text-xl font-semibold text-slate-50">{selectedPlanet.telemetry.signalScore}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-2xl p-3" style={{ background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148,163,184,0.12)' }}>
                          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('activePlanets')}</div>
                          <div className="mt-1 text-xl font-semibold text-slate-50">{selectedGalaxy.memberCount}</div>
                        </div>
                        <div className="rounded-2xl p-3" style={{ background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148,163,184,0.12)' }}>
                          <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('adjacencies')}</div>
                          <div className="mt-1 text-xl font-semibold text-slate-50">{adjacentGalaxies.length}</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel
              as="aside"
              className="rounded-[28px] p-4 sm:p-5"
              style={{
                background: 'linear-gradient(180deg, rgba(2, 6, 23, 0.88) 0%, rgba(15, 23, 42, 0.74) 100%)',
                border: '1px solid rgba(148,163,184,0.14)',
              }}
            >
              <div className="border-b pb-4" style={{ borderColor: 'rgba(148,163,184,0.12)' }}>
                <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('telemetry')}</div>
                <div className="mt-1 text-lg font-semibold text-slate-50">
                  {mode === 'planets' ? selectedPlanet.name : selectedGalaxy.name}
                </div>
              </div>

              {loading ? (
                <div className="mt-5 flex flex-col gap-4">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-16 animate-pulse rounded-2xl" style={{ background: 'rgba(148,163,184,0.08)' }} />
                  ))}
                </div>
              ) : mode === 'planets' ? (
                <div className="mt-5 flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('signalScore')}</div>
                      <div className="mt-2 text-lg font-semibold" style={{ color: MOOD_COLORS[selectedPlanet.mood] }}>{selectedPlanet.telemetry.signalScore}</div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('linkedPlanets')}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{selectedPlanet.telemetry.linkedPlanets}</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                    <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('cognitiveMap')}</div>
                    <DataBar label={t('abstract')} value={selectedPlanet.cognitiveAxes.abstract} color="#7dd3fc" />
                    <DataBar label={t('introspective')} value={selectedPlanet.cognitiveAxes.introspective} color="#a78bfa" />
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                    <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('emotionalSignal')}</div>
                    {selectedPlanet.emotionalBars.map((bar) => (
                      <DataBar key={bar.label} label={bar.label} value={bar.value} color={bar.color} />
                    ))}
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                    <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('attachedGalaxies')}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {linkedGalaxies.map((galaxy) => (
                        <button
                          key={galaxy.id}
                          type="button"
                          onClick={() => {
                            startTransition(() => {
                              setSelectedGalaxyId(galaxy.id)
                              setMode('galaxies')
                            })
                          }}
                          className="rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.18em]"
                          style={{ color: galaxy.accentColor, border: `1px solid ${galaxy.accentColor}33`, background: `${galaxy.accentColor}12` }}
                        >
                          {galaxy.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('members')}</div>
                      <div className="mt-2 text-lg font-semibold" style={{ color: selectedGalaxy.accentColor }}>{selectedGalaxy.memberCount.toLocaleString()}</div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('recentActivity')}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{selectedGalaxy.recentActivityScore}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('upcomingEvents')}</div>
                      <div className="mt-2 text-lg font-semibold text-slate-50">{selectedGalaxy.upcomingEventsCount}</div>
                    </div>
                    <Link href={focusedGalaxyHref} className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5" style={{ background: 'rgba(8, 15, 32, 0.82)', border: `1px solid ${selectedGalaxy.accentColor}33`, color: selectedGalaxy.accentColor, textDecoration: 'none' }}>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--ghost)' }}>{t('galaxyPage')}</div>
                      <div className="mt-2 text-sm font-semibold">{t('viewGalaxy')}</div>
                    </Link>
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                    <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('description')}</div>
                    <p className="mt-3 text-sm leading-7" style={{ color: 'var(--ink)' }}>
                      {selectedGalaxy.description}
                    </p>
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                    <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('keywords')}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(selectedGalaxy.topTags.length > 0 ? selectedGalaxy.topTags : selectedGalaxy.keywords).map((keyword) => (
                        <span
                          key={keyword}
                          className="rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.18em]"
                          style={{ color: selectedGalaxy.accentColor, border: `1px solid ${selectedGalaxy.accentColor}33`, background: `${selectedGalaxy.accentColor}12` }}
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl p-4" style={{ background: 'rgba(8, 15, 32, 0.82)', border: '1px solid rgba(148,163,184,0.12)' }}>
                    <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('adjacentClusters')}</div>
                    <div className="mt-3 flex flex-col gap-3">
                      {adjacentGalaxies.map((galaxy) => (
                        <button
                          key={galaxy.id}
                          type="button"
                          onClick={() => startTransition(() => setSelectedGalaxyId(galaxy.id))}
                          className="flex items-center justify-between rounded-2xl p-3 text-left transition-all duration-300 hover:translate-x-1"
                          style={{ background: 'rgba(15, 23, 42, 0.72)', border: '1px solid rgba(148,163,184,0.12)' }}
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-50">{galaxy.name}</div>
                            <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--ghost)' }}>{galaxy.mood}</div>
                          </div>
                          <div className="text-xl" style={{ color: galaxy.accentColor }}>{galaxy.symbol}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </GlassPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <GlassPanel className="rounded-[28px] p-5" style={{ background: 'rgba(2, 6, 23, 0.76)', border: '1px solid rgba(148,163,184,0.12)' }}>
              <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('whyWorks')}</div>
              <p className="mt-3 text-sm leading-7" style={{ color: 'var(--ink)' }}>
                {t('whyWorksBody')}
              </p>
            </GlassPanel>
            <GlassPanel className="rounded-[28px] p-5" style={{ background: 'rgba(2, 6, 23, 0.76)', border: '1px solid rgba(148,163,184,0.12)' }}>
              <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('interactionModel')}</div>
              <p className="mt-3 text-sm leading-7" style={{ color: 'var(--ink)' }}>
                {t('interactionModelBody')}
              </p>
            </GlassPanel>
            <GlassPanel className="rounded-[28px] p-5" style={{ background: 'rgba(2, 6, 23, 0.76)', border: '1px solid rgba(148,163,184,0.12)' }}>
              <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('productionPath')}</div>
              <p className="mt-3 text-sm leading-7" style={{ color: 'var(--ink)' }}>
                {t('productionPathBody')}
              </p>
            </GlassPanel>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border px-5 py-4" style={{ borderColor: 'rgba(148,163,184,0.12)', background: 'rgba(2, 6, 23, 0.64)' }}>
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em]" style={{ color: '#7dd3fc' }}>{t('routeLinks')}</div>
              <div className="mt-1 text-sm" style={{ color: 'var(--ink)' }}>
                {t('routeLinksBody')}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.16)', textDecoration: 'none' }}>
                {t('homeUniverse')}
              </Link>
              <Link href="/galaxies" className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.16)', textDecoration: 'none' }}>
                {t('galaxyLibrary')}
              </Link>
              <Link href={`/planet/${selectedPlanet.id}`} className="rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--ink)', border: '1px solid rgba(148,163,184,0.16)', textDecoration: 'none' }}>
                {t('focusedPlanet')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}