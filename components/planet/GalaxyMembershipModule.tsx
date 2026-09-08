'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { GalaxyPreview } from '@/types/galaxy'

// --- Galaxy chip ----------------------------------------------------------

function GalaxyChip({ galaxy }: { galaxy: GalaxyPreview }) {
  return (
    <Link
      href={`/galaxy/${galaxy.slug}`}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all duration-200"
      style={{
        background: `${galaxy.accentColor}10`,
        border: `1px solid ${galaxy.accentColor}25`,
        color: 'var(--ink)',
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = `${galaxy.accentColor}1e`
        el.style.borderColor = `${galaxy.accentColor}45`
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = `${galaxy.accentColor}10`
        el.style.borderColor = `${galaxy.accentColor}25`
      }}
    >
      {/* Symbol */}
      <span
        className="text-base leading-none"
        style={{ color: galaxy.accentColor }}
        aria-hidden="true"
      >
        {galaxy.symbol}
      </span>

      {/* Name + member count */}
      <span className="flex flex-col gap-0" style={{ minWidth: 0 }}>
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)', opacity: 0.88 }}>
          {galaxy.name}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>
          {galaxy.memberCount.toLocaleString()} planets
        </span>
      </span>
    </Link>
  )
}

// --- GalaxyMembershipModule -----------------------------------------------

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

interface Props {
  /** Array of galaxy slugs this planet has joined */
  galaxyIds?: string[]
  /** Planet accent color for fallback styling */
  accentColor?: string
}

/**
 * GalaxyMembershipModule  -  compact grid of galaxy chips for communities this
 * planet has joined. Links to /galaxy/[slug]. Resolves real Community rows via
 * GET /api/communities (small catalogue — client-side filtering is acceptable,
 * see docs/adr/0001-galaxy-content-model.md).
 */
export default function GalaxyMembershipModule({ galaxyIds }: Props) {
  const [rows, setRows] = useState<CommunityRow[]>([])

  useEffect(() => {
    if (!galaxyIds || galaxyIds.length === 0) return
    let cancelled = false
    fetch('/api/communities')
      .then((res) => (res.ok ? (res.json() as Promise<CommunityRow[]>) : []))
      .then((data) => { if (!cancelled) setRows(data) })
      .catch(() => { if (!cancelled) setRows([]) })
    return () => { cancelled = true }
  }, [galaxyIds])

  if (!galaxyIds || galaxyIds.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
        No galaxies joined yet.
      </p>
    )
  }

  const previews: GalaxyPreview[] = rows
    .filter((row) => galaxyIds.includes(row.slug))
    .map((row) => ({
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
    }))

  if (previews.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
        No galaxies found.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {previews.map((galaxy) => (
          <GalaxyChip key={galaxy.slug} galaxy={galaxy} />
        ))}
      </div>
    </div>
  )
}
