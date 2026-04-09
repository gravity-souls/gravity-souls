'use client'

import { useState, useEffect, use } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import PlanetCard from '@/components/planet/PlanetCard'
import PlanetPreviewDrawer from '@/components/planet/PlanetPreviewDrawer'
import GalaxyCard from '@/components/galaxy/GalaxyCard'
import LockedLayer from '@/components/ui/LockedLayer'
import { getGalaxyBySlug, getRelatedGalaxies, getGalaxyPreviews } from '@/lib/mock-galaxies'
import { getPlanetById } from '@/lib/mock-planets'
import { getUserRole } from '@/lib/user'
import type { PlanetProfile } from '@/types/planet'

// ─── Mock discussion topics per galaxy ───────────────────────────────────────

const DISCUSSION_TOPICS: Partial<Record<string, { title: string; replies: number; heat: number }[]>> = {
  'slow-thinkers': [
    { title: 'What does "thinking slowly" actually mean to you?',    replies: 24, heat: 0.8 },
    { title: 'Books that reward a second read more than the first',   replies: 31, heat: 0.9 },
    { title: '深夜写作 vs 清晨写作 — which surfaces different thoughts?', replies: 18, heat: 0.6 },
    { title: 'The courage to sit with uncertainty instead of resolving it', replies: 12, heat: 0.4 },
  ],
  'signal-noise': [
    { title: 'What\'s your "boring" tech stack that actually works?', replies: 42, heat: 0.9 },
    { title: 'Software craft vs software speed — a false dichotomy?', replies: 55, heat: 1.0 },
    { title: 'When does a side project become an obsession?',         replies: 29, heat: 0.7 },
    { title: 'The aesthetics of well-named variables',                replies: 16, heat: 0.5 },
  ],
  'dusk-archives': [
    { title: 'A book that felt like it was written specifically for you', replies: 48, heat: 1.0 },
    { title: 'Films that only make sense after you\'ve lived more',   replies: 33, heat: 0.8 },
    { title: '被遗忘的音乐 — share something no one talks about',        replies: 22, heat: 0.6 },
    { title: 'The sentence that stopped you and wouldn\'t let you continue', replies: 19, heat: 0.5 },
  ],
  'warm-frequency': [
    { title: 'Small acts of care that meant more than intended',      replies: 38, heat: 0.9 },
    { title: 'What makes a conversation feel genuinely safe?',        replies: 27, heat: 0.7 },
    { title: '如何在城市中建立真实的连接',                                 replies: 45, heat: 1.0 },
    { title: 'Mutual aid stories — help you gave or received',        replies: 21, heat: 0.6 },
  ],
  'image-makers': [
    { title: 'The composition that made you rethink everything',      replies: 36, heat: 0.8 },
    { title: 'Tools vs intent — does your equipment shape your vision?', replies: 44, heat: 0.9 },
    { title: '摄影是记录还是创造？',                                       replies: 29, heat: 0.7 },
    { title: 'A photo that works for reasons you can\'t explain',     replies: 17, heat: 0.5 },
  ],
  'threshold-states': [
    { title: 'The city you left that still lives inside you',         replies: 52, heat: 1.0 },
    { title: 'What does "home" mean when you\'ve lived in 4 countries?', replies: 41, heat: 0.9 },
    { title: 'Third culture identity — the parts you keep, the parts you lose', replies: 34, heat: 0.8 },
    { title: '流浪者的孤独 — does movement become avoidance?',            replies: 23, heat: 0.6 },
  ],
  'body-clocks': [
    { title: 'Movement practices that changed your thinking',         replies: 31, heat: 0.7 },
    { title: 'Sleep is a skill — what actually helped you',           replies: 47, heat: 1.0 },
    { title: 'The difference between training and performing',        replies: 22, heat: 0.6 },
    { title: '身体的智慧 — moments your body knew before your mind did', replies: 28, heat: 0.7 },
  ],
  'late-night-economics': [
    { title: 'The economic model no one taught you that explains everything', replies: 58, heat: 1.0 },
    { title: 'Housing as a political choice, not just a market',      replies: 44, heat: 0.9 },
    { title: '城市如何塑造我们的欲望',                                     replies: 33, heat: 0.8 },
    { title: 'When did "hustle culture" stop working for you?',       replies: 26, heat: 0.6 },
  ],
}

// ─── Page ────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ slug: string }>
}

export default function GalaxyPage({ params }: Props) {
  const { slug } = use(params)
  const galaxy = getGalaxyBySlug(slug)

  if (!galaxy) notFound()

  const [selectedPlanet, setSelectedPlanet] = useState<PlanetProfile | null>(null)
  const [userRole, setUserRole] = useState<'explorer' | 'resonator'>('explorer')

  // getUserRole reads localStorage — must run client-side only
  useEffect(() => { setUserRole(getUserRole()) }, [])

  const memberPlanets = galaxy.activePlanetIds
    .map((id) => getPlanetById(id))
    .filter((p): p is PlanetProfile => !!p)

  const relatedGalaxies = getRelatedGalaxies(galaxy.keywords, slug)
  const relatedPreviews = getGalaxyPreviews().filter((g) =>
    relatedGalaxies.some((r) => r.id === g.id)
  )

  const discussions = DISCUSSION_TOPICS[slug] ?? []
  const { accentColor } = galaxy

  return (
    <>
      <AppShell>
        <div className="pb-20">

          {/* ── Galaxy hero ──────────────────────────────────────────────── */}
          <div
            className="relative overflow-hidden"
            style={{ minHeight: 260 }}
          >
            {/* Atmospheric nebula wash */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 70% 0%, ${accentColor}18 0%, ${accentColor}06 45%, transparent 70%)`,
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(3,3,15,0) 0%, rgba(3,3,15,1) 100%)',
              }}
              aria-hidden="true"
            />

            {/* Symbol watermark */}
            <div
              className="absolute -right-8 -top-8 pointer-events-none select-none leading-none"
              style={{ fontSize: 200, color: accentColor, opacity: 0.05 }}
              aria-hidden="true"
            >
              {galaxy.symbol}
            </div>

            {/* Top line */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }}
              aria-hidden="true"
            />

            {/* Hero content */}
            <div className="relative z-10 px-6 pt-8 pb-10 max-w-5xl mx-auto flex items-start gap-5">
              {/* Symbol orb */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shrink-0 mt-1"
                style={{
                  background: `${accentColor}20`,
                  border:     `1px solid ${accentColor}45`,
                  color:      accentColor,
                  boxShadow:  `0 0 32px ${accentColor}22`,
                }}
              >
                {galaxy.symbol}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-eyebrow mb-2">Galaxy</p>
                <h1
                  className="text-2xl font-semibold leading-tight mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  {galaxy.name}
                </h1>
                {galaxy.tagline && (
                  <p
                    className="text-base italic mb-4 leading-relaxed"
                    style={{ color: 'var(--ink)', opacity: 0.7 }}
                  >
                    "{galaxy.tagline}"
                  </p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-3 py-1 rounded-xl text-xs"
                    style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
                  >
                    {galaxy.memberCount.toLocaleString()} planets
                  </span>
                  <span
                    className="px-3 py-1 rounded-xl text-xs capitalize"
                    style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-soft)' }}
                  >
                    {galaxy.mood}
                  </span>
                  <span
                    className="px-3 py-1 rounded-xl text-xs capitalize"
                    style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-soft)' }}
                  >
                    {galaxy.maturity}
                  </span>
                </div>
              </div>

              {/* Join CTA */}
              <div className="shrink-0 mt-1">
                {userRole === 'resonator' ? (
                  <button
                    className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200"
                    style={{
                      color:      'var(--foreground)',
                      background: `linear-gradient(135deg, ${accentColor}35, ${accentColor}20)`,
                      border:     `1px solid ${accentColor}45`,
                      cursor:     'pointer',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${accentColor}30` }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  >
                    Join galaxy
                  </button>
                ) : (
                  <Link
                    href="/create-planet"
                    className="block px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide"
                    style={{
                      color:      'var(--ghost)',
                      background: 'var(--surface)',
                      border:     '1px solid var(--border-soft)',
                      textDecoration: 'none',
                    }}
                  >
                    Create planet to join
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* ── Main content ─────────────────────────────────────────────── */}
          <div className="px-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 mt-4">

              {/* ── Left column ──────────────────────────────────────────── */}
              <div className="flex flex-col gap-8">

                {/* About + keywords */}
                <section>
                  <p className="text-data-label mb-3">About this galaxy</p>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ink)', opacity: 0.75 }}>
                    {galaxy.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {galaxy.keywords.map((k) => (
                      <Link
                        key={k}
                        href={`/galaxies?q=${encodeURIComponent(k)}`}
                        className="px-2.5 py-1 rounded-lg text-xs transition-all duration-200"
                        style={{
                          background: `${accentColor}10`,
                          color:      accentColor,
                          border:     `1px solid ${accentColor}28`,
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${accentColor}20` }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${accentColor}10` }}
                      >
                        {k}
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Active members */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-data-label">Active planets</p>
                    <span className="text-xs" style={{ color: 'var(--ghost)' }}>
                      {memberPlanets.length} shown of {galaxy.memberCount.toLocaleString()}
                    </span>
                  </div>

                  {memberPlanets.length > 0 ? (
                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'var(--surface)',
                        border:     '1px solid var(--border-soft)',
                      }}
                    >
                      <div className="flex flex-wrap gap-8 justify-around">
                        {memberPlanets.map((planet) => (
                          <PlanetCard
                            key={planet.id}
                            planet={planet}
                            size={52}
                            onClick={() => setSelectedPlanet(planet)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-2xl p-8 text-center"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                    >
                      <p className="text-sm" style={{ color: 'var(--ghost)' }}>No active planets yet.</p>
                    </div>
                  )}
                </section>

                {/* Discussions */}
                {discussions.length > 0 && (
                  <section>
                    <p className="text-data-label mb-4">Recent discussions</p>

                    {userRole === 'resonator' ? (
                      <div className="flex flex-col gap-2">
                        {discussions.map((topic, i) => (
                          <button
                            key={i}
                            className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200"
                            style={{
                              background: 'var(--surface)',
                              border:     '1px solid var(--border-soft)',
                              cursor:     'pointer',
                            }}
                            onMouseEnter={(e) => {
                              ;(e.currentTarget as HTMLElement).style.borderColor = `${accentColor}35`
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                            }}
                            onMouseLeave={(e) => {
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-soft)'
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                            }}
                          >
                            {/* Heat bar */}
                            <div
                              className="w-1 rounded-full shrink-0 mt-0.5"
                              style={{
                                height:     40,
                                background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}40 100%)`,
                                opacity:    topic.heat,
                              }}
                              aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug mb-1" style={{ color: 'var(--foreground)' }}>
                                {topic.title}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                                {topic.replies} replies
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <LockedLayer
                        reason="Create your planet to join discussions and see the full community"
                        ctaLabel="Begin formation"
                        ctaHref="/create-planet"
                      >
                        <div className="flex flex-col gap-2">
                          {discussions.slice(0, 2).map((topic, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-4 p-4 rounded-xl"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                            >
                              <div className="w-1 h-10 rounded-full" style={{ background: `${accentColor}50` }} />
                              <div>
                                <p className="text-sm leading-snug mb-1" style={{ color: 'var(--foreground)' }}>{topic.title}</p>
                                <p className="text-xs" style={{ color: 'var(--ghost)' }}>{topic.replies} replies</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </LockedLayer>
                    )}
                  </section>
                )}
              </div>

              {/* ── Right column ─────────────────────────────────────────── */}
              <div className="flex flex-col gap-6">

                {/* Related galaxies */}
                {relatedPreviews.length > 0 && (
                  <section>
                    <p className="text-data-label mb-3">Related galaxies</p>
                    <div className="flex flex-col gap-3">
                      {relatedPreviews.map((g) => (
                        <Link
                          key={g.id}
                          href={`/galaxy/${g.slug}`}
                          className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200"
                          style={{
                            background:     `${g.accentColor}08`,
                            border:         `1px solid ${g.accentColor}20`,
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLElement).style.background = `${g.accentColor}14`
                            ;(e.currentTarget as HTMLElement).style.borderColor = `${g.accentColor}40`
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLElement).style.background = `${g.accentColor}08`
                            ;(e.currentTarget as HTMLElement).style.borderColor = `${g.accentColor}20`
                          }}
                        >
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                            style={{ background: `${g.accentColor}20`, color: g.accentColor, border: `1px solid ${g.accentColor}35` }}
                          >
                            {g.symbol}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{g.name}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>
                              {g.memberCount.toLocaleString()} planets
                            </p>
                          </div>
                          <span className="text-xs shrink-0" style={{ color: 'var(--dim)' }}>→</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Quick stats panel */}
                <section
                  className="p-5 rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-data-label mb-4">Galaxy stats</p>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Members', value: galaxy.memberCount.toLocaleString() },
                      { label: 'Atmosphere', value: galaxy.mood },
                      { label: 'Status', value: galaxy.maturity },
                      { label: 'Keywords', value: galaxy.keywords.length.toString() },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--ghost)' }}>{label}</span>
                        <span className="text-xs font-medium capitalize" style={{ color: 'var(--ink)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Back to galaxies */}
                <Link
                  href="/galaxies"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200"
                  style={{
                    color:          'var(--ghost)',
                    background:     'var(--surface)',
                    border:         '1px solid var(--border-soft)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ghost)' }}
                >
                  ← All galaxies
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppShell>

      {/* Planet preview drawer */}
      <PlanetPreviewDrawer
        planet={selectedPlanet}
        open={!!selectedPlanet}
        onClose={() => setSelectedPlanet(null)}
        userRole={userRole}
      />
    </>
  )
}
