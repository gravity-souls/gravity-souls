'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import GalaxyCard from '@/components/galaxy/GalaxyCard'
import EmptyState from '@/components/ui/EmptyState'
import GalaxiesLoading from '@/app/galaxies/loading'
import { getGalaxyPreviews } from '@/lib/mock-galaxies'
import type { GalaxyPreview } from '@/types/galaxy'

const ALL_GALAXIES = getGalaxyPreviews()

// --- Filter controls ---------------------------------------------------------

type MoodFilter = GalaxyPreview['mood'] | 'all'

const MOOD_OPTIONS: { value: MoodFilter; label: string }[] = [
  { value: 'all',           label: 'All' },
  { value: 'contemplative', label: 'Contemplative' },
  { value: 'creative',      label: 'Creative' },
  { value: 'intimate',      label: 'Intimate' },
  { value: 'technical',     label: 'Technical' },
  { value: 'vibrant',       label: 'Vibrant' },
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
  const searchParams = useSearchParams()
  const initialQ = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [moodFilter, setMoodFilter] = useState<MoodFilter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ALL_GALAXIES.filter((g) => {
      const matchesQuery =
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.keywords.some((k) => k.toLowerCase().includes(q)) ||
        g.tagline?.toLowerCase().includes(q)
      const matchesMood = moodFilter === 'all' || g.mood === moodFilter
      return matchesQuery && matchesMood
    })
  }, [query, moodFilter])

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-20 max-w-6xl mx-auto">

        {/* Header */}
        <SectionHeader
          eyebrow="Communities"
          level={1}
          title="Galaxies"
          subtitle="Keyword-based clusters where planets find their orbit. Each galaxy is a thematic world  -  join, explore, or drift through."
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
              placeholder="Search by name, keyword, or theme…"
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
            {MOOD_OPTIONS.map(({ value, label }) => (
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Result count */}
        <p className="mt-4 text-xs" style={{ color: 'var(--ghost)' }}>
          {filtered.length} {filtered.length === 1 ? 'galaxy' : 'galaxies'} found
          {query ? ` for "${query}"` : ''}
        </p>

        {/* -- Galaxy grid ------------------------------------------------- */}
        <div className="mt-6">
          {filtered.length === 0 ? (
            <EmptyState
              symbol="◈"
              title="No galaxies match"
              subtitle="Try a different keyword or clear the filter."
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
