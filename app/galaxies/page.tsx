'use client'

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import GalaxyCard from '@/components/galaxy/GalaxyCard'
import EmptyState from '@/components/ui/EmptyState'
import GalaxiesLoading from '@/app/galaxies/loading'
import type { GalaxyPreview } from '@/types/galaxy'

// Shape returned by GET /api/communities — the galaxy directory resolves
// real Community rows (see docs/adr/0001-galaxy-content-model.md).
interface CommunityRow {
  id: string
  slug: string
  name: string
  symbol: string
  tagline: string | null
  keywords: string[]
  mood: string
  memberCount: number
  maturity: string
  accentColor: string
}

function toGalaxyPreview(row: CommunityRow): GalaxyPreview {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    symbol: row.symbol,
    tagline: row.tagline ?? undefined,
    keywords: row.keywords,
    mood: row.mood as GalaxyPreview['mood'],
    memberCount: row.memberCount,
    maturity: row.maturity as GalaxyPreview['maturity'],
    accentColor: row.accentColor,
  }
}

// --- Filter controls ---------------------------------------------------------

type MoodFilter = GalaxyPreview['mood'] | 'all'

const MOOD_OPTIONS: { value: MoodFilter; labelKey: string }[] = [
  { value: 'all',           labelKey: 'all' },
  { value: 'contemplative', labelKey: 'moodContemplative' },
  { value: 'creative',      labelKey: 'moodCreative' },
  { value: 'intimate',      labelKey: 'moodIntimate' },
  { value: 'technical',     labelKey: 'moodTechnical' },
  { value: 'vibrant',       labelKey: 'moodVibrant' },
]

// --- Page --------------------------------------------------------------------

// useSearchParams requires a Suspense boundary in Next.js App Router
export default function GalaxiesPage() {
  return (
    <Suspense fallback={<GalaxiesLoading />}>
      <GalaxiesInner />
    </Suspense>
  )
}

function GalaxiesInner() {
  const tNav = useTranslations('nav')
  const tHome = useTranslations('home')
  const tGalaxies = useTranslations('galaxies')
  const tCommon = useTranslations('common')
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [moodFilter, setMoodFilter] = useState<MoodFilter>('all')
  const [galaxies, setGalaxies] = useState<GalaxyPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) { setLoading(true); setError('') }
    })
    fetch('/api/communities')
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable')
        return res.json() as Promise<CommunityRow[]>
      })
      .then((rows) => {
        if (cancelled) return
        setGalaxies(rows.map(toGalaxyPreview))
      })
      .catch(() => { if (!cancelled) setError(tGalaxies('loadError')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reload, tGalaxies])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return galaxies.filter((g) => {
      const matchesQuery =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.keywords.some((k) => k.toLowerCase().includes(q)) ||
        g.tagline?.toLowerCase().includes(q)
      const matchesMood = moodFilter === 'all' || g.mood === moodFilter
      return matchesQuery && matchesMood
    })
  }, [galaxies, query, moodFilter])

  if (loading) return <GalaxiesLoading />

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-20 max-w-6xl mx-auto">

        {/* Header */}
        <SectionHeader
          eyebrow={tHome('recommendedCommunities')}
          level={1}
          title={tNav('galaxies')}
          subtitle={tGalaxies('subtitle')}
        />

        {/* -- Search + filters -------------------------------------------- */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">

          {/* Search input */}
          <div className="relative flex-1">
            <span
              className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
              style={{ color: 'var(--ghost)' }}
              aria-hidden="true"
            >
              ◎
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tGalaxies('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{
                background:  'rgba(18,14,52,0.65)',
                backdropFilter: 'blur(16px)',
                border:      '1px solid var(--border-mid)',
                color:       'var(--foreground)',
                caretColor:  'var(--star)',
              }}
              onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)' }}
              onBlur={(e)  => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-mid)' }}
            />
          </div>

          {/* Mood filter */}
          <div className="flex gap-1.5 flex-wrap sm:flex-nowrap">
            {MOOD_OPTIONS.map(({ value, labelKey }) => (
              <button
                key={value}
                onClick={() => setMoodFilter(value)}
                className="px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 shrink-0"
                style={{
                  background:  moodFilter === value ? 'rgba(124,58,237,0.18)' : 'rgba(255,255,255,0.03)',
                  border:      moodFilter === value ? '1px solid var(--border-accent)' : '1px solid var(--border-soft)',
                  color:       moodFilter === value ? 'var(--star)' : 'var(--ghost)',
                  cursor:      'pointer',
                }}
              >
                {tGalaxies(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4" role="alert">
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
            <button
              type="button"
              onClick={() => setReload((v) => v + 1)}
              className="mt-2 text-xs underline"
              style={{ color: 'var(--ghost)' }}
            >
              {tCommon('retry')}
            </button>
          </div>
        )}

        {/* Result count */}
        {!error && (
          <p className="mt-4 text-xs" style={{ color: 'var(--ghost)' }}>
            {query ? tGalaxies('foundFor', { count: filtered.length, query }) : tGalaxies('found', { count: filtered.length })}
          </p>
        )}

        {/* -- Galaxy grid ------------------------------------------------- */}
        <div className="mt-6">
          {error ? null : filtered.length === 0 ? (
            <EmptyState
              symbol="◈"
              title={tCommon('noResults')}
              subtitle={tGalaxies('emptySubtitle')}
              size="md"
              className="mt-12"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((galaxy) => (
                <GalaxyCard key={galaxy.id} galaxy={galaxy} variant="full" />
              ))}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  )
}
