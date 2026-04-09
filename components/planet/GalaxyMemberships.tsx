import Link from 'next/link'
import { getGalaxyBySlug } from '@/lib/mock-galaxies'

// ─── GalaxyMemberships ───────────────────────────────────────────────────────
// Renders the galaxy communities a planet belongs to.
// Pass galaxyIds (slug array) from PlanetProfile.galaxyIds.

interface Props {
  galaxyIds: string[]
}

export default function GalaxyMemberships({ galaxyIds }: Props) {
  if (galaxyIds.length === 0) return null

  const galaxies = galaxyIds
    .map((slug) => getGalaxyBySlug(slug))
    .filter(Boolean) as NonNullable<ReturnType<typeof getGalaxyBySlug>>[]

  if (galaxies.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        Galaxies
      </span>

      <div className="flex flex-col gap-2">
        {galaxies.map((g) => (
          <Link
            key={g.slug}
            href={`/galaxy/${g.slug}`}
            className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200"
            style={{
              background: `${g.accentColor}08`,
              border: `1px solid ${g.accentColor}22`,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = `${g.accentColor}12`
              el.style.borderColor = `${g.accentColor}38`
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.background = `${g.accentColor}08`
              el.style.borderColor = `${g.accentColor}22`
            }}
          >
            {/* Symbol orb */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{
                background: `${g.accentColor}18`,
                border: `1px solid ${g.accentColor}35`,
                color: g.accentColor,
              }}
            >
              {g.symbol}
            </div>

            {/* Name + keywords */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                {g.name}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>
                {g.keywords.slice(0, 3).join(' · ')}
              </p>
            </div>

            {/* Member count */}
            <span
              className="text-[10px] shrink-0 tabular-nums"
              style={{ color: 'var(--ghost)' }}
            >
              {g.memberCount.toLocaleString()}
            </span>

            <span className="text-xs shrink-0" style={{ color: g.accentColor, opacity: 0.6 }}>→</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
