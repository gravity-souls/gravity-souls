import Link from 'next/link'
import { getGalaxyBySlug } from '@/lib/mock-galaxies'
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

interface Props {
  /** Array of galaxy slugs this planet has joined */
  galaxyIds?: string[]
  /** Planet accent color for fallback styling */
  accentColor?: string
}

/**
 * GalaxyMembershipModule  -  compact grid of galaxy chips for communities this
 * planet has joined. Links to /galaxy/[slug].
 */
export default function GalaxyMembershipModule({ galaxyIds }: Props) {
  if (!galaxyIds || galaxyIds.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
        No galaxies joined yet.
      </p>
    )
  }

  const galaxies = galaxyIds
    .map((slug) => getGalaxyBySlug(slug))
    .filter((g): g is NonNullable<typeof g> => g !== undefined)

  if (galaxies.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
        No galaxies found.
      </p>
    )
  }

  // Build GalaxyPreview-compatible objects from the Galaxy type
  const previews: GalaxyPreview[] = galaxies.map((g) => ({
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
