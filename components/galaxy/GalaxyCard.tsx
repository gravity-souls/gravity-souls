import Link from 'next/link'
import type { GalaxyPreview } from '@/types/galaxy'

interface Props {
  galaxy:   GalaxyPreview
  /**
   * compact  -  horizontal strip card used on the homepage
   * full     -  directory card used on /galaxies
   */
  variant?: 'compact' | 'full'
  /** Whether the current user has joined this galaxy/community */
  joined?: boolean
  /** Called when the user clicks Join. If absent, no button is shown. */
  onJoin?: () => void
  /** True while a join request is in flight */
  joinLoading?: boolean
}

// --- Mood label display -----------------------------------------------------

const MOOD_LABEL: Record<GalaxyPreview['mood'], string> = {
  vibrant:       'Vibrant',
  contemplative: 'Contemplative',
  technical:     'Technical',
  creative:      'Creative',
  intimate:      'Intimate',
}

const MATURITY_LABEL: Record<GalaxyPreview['maturity'], string> = {
  forming:     'New',
  active:      'Active',
  established: 'Landmark',
}

// --- GalaxyCard -------------------------------------------------------------

export default function GalaxyCard({ galaxy, variant = 'full', joined, onJoin, joinLoading }: Props) {
  const { slug, name, symbol, tagline, keywords, mood, memberCount, maturity, accentColor } = galaxy

  if (variant === 'compact') {
    return <CompactCard slug={slug} name={name} symbol={symbol} tagline={tagline} keywords={keywords.slice(0, 3)} memberCount={memberCount} accentColor={accentColor} joined={joined} onJoin={onJoin} joinLoading={joinLoading} />
  }

  return <FullCard slug={slug} name={name} symbol={symbol} tagline={tagline} keywords={keywords} mood={mood} memberCount={memberCount} maturity={maturity} accentColor={accentColor} joined={joined} onJoin={onJoin} joinLoading={joinLoading} />
}

// --- Compact variant  -  strip card -------------------------------------------

function CompactCard({
  slug, name, symbol, tagline, keywords, memberCount, accentColor, joined, onJoin, joinLoading,
}: {
  slug: string; name: string; symbol: string; tagline?: string; keywords: string[]
  memberCount: number; accentColor: string
  joined?: boolean; onJoin?: () => void; joinLoading?: boolean
}) {
  const cardStyle = {
    width:      220,
    background: 'linear-gradient(160deg, rgba(18,14,52,0.82) 0%, rgba(6,4,20,0.90) 100%)',
    backdropFilter: 'blur(18px)',
    border:     `1px solid ${accentColor}22`,
    boxShadow:  `0 4px 24px rgba(0,0,0,0.4), 0 0 40px ${accentColor}08`,
    textDecoration: 'none',
    transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1), box-shadow 300ms ease, border-color 300ms ease',
  } as const

  const handleMouseEnter = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'translateY(-3px)'
    el.style.borderColor = `${accentColor}48`
    el.style.boxShadow = `0 8px 32px rgba(0,0,0,0.5), 0 0 60px ${accentColor}18`
  }
  const handleMouseLeave = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'translateY(0)'
    el.style.borderColor = `${accentColor}22`
    el.style.boxShadow = `0 4px 24px rgba(0,0,0,0.4), 0 0 40px ${accentColor}08`
  }

  const cardBody = (
    <>
      {/* Background symbol watermark */}
      <span
        className="absolute -right-2 -top-3 pointer-events-none select-none leading-none"
        style={{ fontSize: 64, color: accentColor, opacity: 0.07 }}
        aria-hidden="true"
      >
        {symbol}
      </span>

      {/* Accent top line */}
      <div
        className="absolute top-0 left-4 right-4 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}60, transparent)` }}
        aria-hidden="true"
      />

      {/* Symbol + name row */}
      <div className="flex items-center gap-2.5 relative z-10">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
          style={{
            background: `${accentColor}18`,
            border:     `1px solid ${accentColor}35`,
            color:      accentColor,
          }}
        >
          {symbol}
        </div>
        <span className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--foreground)' }}>
          {name}
        </span>
      </div>

      {/* Tagline */}
      {tagline && (
        <p
          className="text-xs leading-relaxed line-clamp-2 relative z-10"
          style={{ color: 'var(--ink)', opacity: 0.65 }}
        >
          {tagline}
        </p>
      )}

      {/* Keywords + member count */}
      <div className="flex flex-wrap gap-1 relative z-10 mt-auto">
        {keywords.map((k) => (
          <span
            key={k}
            className="text-[9px] px-1.5 py-0.5 rounded tracking-wide"
            style={{ background: `${accentColor}12`, color: accentColor, border: `1px solid ${accentColor}25` }}
          >
            {k}
          </span>
        ))}
        <span
          className="ml-auto text-[9px] tracking-wide self-center"
          style={{ color: 'var(--ghost)' }}
        >
          {memberCount.toLocaleString()} ·
        </span>
      </div>
    </>
  )

  // When onJoin is provided, use a div wrapper to avoid <button> inside <a> (invalid HTML)
  if (onJoin) {
    return (
      <div
        className="group relative flex-none flex flex-col gap-3 p-4 rounded-2xl overflow-hidden cursor-pointer"
        style={cardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => { window.location.href = `/galaxy/${slug}` }}
      >
        {cardBody}

        {/* Join button */}
        <div className="relative z-20 mt-1">
          {joined ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg tracking-wide"
              style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
            >
              Joined ✓
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onJoin() }}
              disabled={joinLoading}
              className="text-[10px] font-medium px-2.5 py-1 rounded-lg tracking-wide transition-all duration-200 disabled:opacity-50"
              style={{
                background: `${accentColor}25`,
                color: accentColor,
                border: `1px solid ${accentColor}40`,
                cursor: 'pointer',
              }}
            >
              {joinLoading ? '...' : 'Join'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default: plain Link card (no join button)
  return (
    <Link
      href={`/galaxy/${slug}`}
      className="group relative flex-none flex flex-col gap-3 p-4 rounded-2xl overflow-hidden"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {cardBody}
    </Link>
  )
}

// --- Full variant  -  directory card ------------------------------------------

function FullCard({
  slug, name, symbol, tagline, keywords, mood, memberCount, maturity, accentColor, joined, onJoin, joinLoading,
}: {
  slug: string; name: string; symbol: string; tagline?: string; keywords: string[]
  mood: GalaxyPreview['mood']; memberCount: number; maturity: GalaxyPreview['maturity']; accentColor: string
  joined?: boolean; onJoin?: () => void; joinLoading?: boolean
}) {
  const cardStyle = {
    background: 'linear-gradient(160deg, rgba(18,14,52,0.80) 0%, rgba(6,4,20,0.90) 100%)',
    backdropFilter: 'blur(20px)',
    border:     `1px solid ${accentColor}20`,
    boxShadow:  `0 4px 32px rgba(0,0,0,0.5), 0 0 60px ${accentColor}08`,
    textDecoration: 'none',
    transition: 'transform 300ms cubic-bezier(0.16,1,0.3,1), box-shadow 300ms ease, border-color 300ms ease',
  } as const

  const handleMouseEnter = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'translateY(-4px)'
    el.style.borderColor = `${accentColor}45`
    el.style.boxShadow = `0 12px 48px rgba(0,0,0,0.6), 0 0 80px ${accentColor}18`
  }
  const handleMouseLeave = (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement
    el.style.transform = 'translateY(0)'
    el.style.borderColor = `${accentColor}20`
    el.style.boxShadow = `0 4px 32px rgba(0,0,0,0.5), 0 0 60px ${accentColor}08`
  }

  const cardBody = (
    <>
      {/* Background symbol watermark */}
      <span
        className="absolute -right-4 -top-6 pointer-events-none select-none leading-none"
        style={{ fontSize: 96, color: accentColor, opacity: 0.06 }}
        aria-hidden="true"
      >
        {symbol}
      </span>

      {/* Atmospheric nebula wash from accentColor */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 80% 0%, ${accentColor}10 0%, transparent 60%)`,
        }}
        aria-hidden="true"
      />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-6 right-6 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}55, transparent)` }}
        aria-hidden="true"
      />

      {/* Header row: symbol orb + name */}
      <div className="flex items-center gap-3 relative z-10">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          style={{
            background: `${accentColor}20`,
            border:     `1px solid ${accentColor}40`,
            color:      accentColor,
            boxShadow:  `0 0 20px ${accentColor}20`,
          }}
        >
          {symbol}
        </div>
        <div>
          <p className="text-eyebrow mb-0.5">Galaxy</p>
          <h3 className="text-base font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
            {name}
          </h3>
        </div>
      </div>

      {/* Tagline */}
      {tagline && (
        <p
          className="text-sm leading-relaxed italic relative z-10"
          style={{ color: 'var(--ink)', opacity: 0.75 }}
        >
          "{tagline}"
        </p>
      )}

      {/* Keywords */}
      <div className="flex flex-wrap gap-1.5 relative z-10">
        {keywords.slice(0, 5).map((k) => (
          <span
            key={k}
            className="text-[10px] px-2 py-0.5 rounded-md tracking-wide"
            style={{
              background: `${accentColor}12`,
              color:      accentColor,
              border:     `1px solid ${accentColor}28`,
            }}
          >
            {k}
          </span>
        ))}
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-3 relative z-10 mt-auto pt-2" style={{ borderTop: `1px solid ${accentColor}15` }}>
        <span className="text-xs" style={{ color: 'var(--ghost)' }}>
          {memberCount.toLocaleString()} planets
        </span>
        <span className="text-xs" style={{ color: 'var(--ghost)' }}>·</span>
        <span className="text-xs" style={{ color: MOOD_LABEL[mood] ? accentColor : 'var(--ghost)', opacity: 0.8 }}>
          {MOOD_LABEL[mood]}
        </span>
        <span className="ml-auto text-[9px] px-2 py-0.5 rounded-md tracking-widest uppercase" style={{ color: 'var(--ghost)', background: 'var(--surface)' }}>
          {MATURITY_LABEL[maturity]}
        </span>
      </div>
    </>
  )

  // When onJoin is provided, use a div wrapper to avoid <button> inside <a>
  if (onJoin) {
    return (
      <div
        className="group relative flex flex-col gap-4 p-6 rounded-2xl overflow-hidden cursor-pointer"
        style={cardStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => { window.location.href = `/galaxy/${slug}` }}
      >
        {cardBody}

        {/* Join button */}
        <div className="relative z-20 mt-1">
          {joined ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg tracking-wide"
              style={{ background: `${accentColor}18`, color: accentColor, border: `1px solid ${accentColor}30` }}
            >
              Joined ✓
            </span>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onJoin() }}
              disabled={joinLoading}
              className="text-xs font-medium px-3 py-1.5 rounded-lg tracking-wide transition-all duration-200 disabled:opacity-50"
              style={{
                background: `${accentColor}25`,
                color: accentColor,
                border: `1px solid ${accentColor}40`,
                cursor: 'pointer',
              }}
            >
              {joinLoading ? '...' : 'Join'}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Default: plain Link card
  return (
    <Link
      href={`/galaxy/${slug}`}
      className="group relative flex flex-col gap-4 p-6 rounded-2xl overflow-hidden"
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {cardBody}
    </Link>
  )
}
