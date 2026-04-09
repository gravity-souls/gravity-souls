import Link from 'next/link'
import type { PlanetProfile, ActiveStatus } from '@/types/planet'

// ─── Status badge ─────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ActiveStatus, { label: string; color: string; bg: string }> = {
  active:   { label: 'Active',   color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  drifting: { label: 'Drifting', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  quiet:    { label: 'Quiet',    color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
}

function StatusBadge({ status }: { status: ActiveStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium tracking-wide"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30` }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  )
}

// ─── Viewer-state action buttons ──────────────────────────────────────────

function ExplorerActions() {
  return (
    <Link
      href="/create-planet"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(99,102,241,0.1))',
        border: '1px solid rgba(167,139,250,0.25)',
        color: 'var(--star)',
      }}
    >
      <span style={{ opacity: 0.6 }}>◌</span>
      Create your planet to connect
    </Link>
  )
}

function ResonatorActions({ planet }: { planet: PlanetProfile }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          background: `linear-gradient(135deg, ${planet.visual.coreColor}22, ${planet.visual.accentColor}12)`,
          border: `1px solid ${planet.visual.coreColor}40`,
          color: planet.visual.coreColor,
        }}
      >
        ⟡ Send beam
      </button>
      <button
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(167,139,250,0.15)',
          color: 'var(--ink)',
        }}
      >
        ◈ Save
      </button>
    </div>
  )
}

// ─── PlanetHeader ─────────────────────────────────────────────────────────

interface Props {
  planet: PlanetProfile
  /** 'explorer' = viewer has no planet, 'resonator' = has a planet, 'self' = own planet */
  viewerRole: 'explorer' | 'resonator' | 'self'
  /** Breadcrumb context — planet they came from, if any */
  fromPlanet?: { id: string; name: string; coreColor: string }
}

/**
 * PlanetHeader — identity block at the top of the planet page.
 *
 * Shows: breadcrumb, name, tagline, location + language chips,
 * active status badge, and viewer-state-aware action buttons.
 */
export default function PlanetHeader({ planet, viewerRole, fromPlanet }: Props) {
  const { visual, name, tagline, location, languages, activeStatus, communicationStyle } = planet

  return (
    <header className="flex flex-col gap-4">
      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-xs flex-wrap" style={{ color: 'var(--ghost)' }}>
        {viewerRole === 'self' ? (
          <span style={{ color: 'var(--star)', opacity: 0.55 }}>My planet</span>
        ) : (
          <>
            <Link href="/galaxies" className="hover:opacity-80 transition-opacity">Galaxies</Link>
            {fromPlanet && (
              <>
                <span style={{ opacity: 0.35 }}>/</span>
                <Link
                  href={`/planet/${fromPlanet.id}`}
                  className="hover:opacity-80 transition-opacity"
                  style={{ color: fromPlanet.coreColor, opacity: 0.75 }}
                >
                  {fromPlanet.name}
                </Link>
              </>
            )}
            <span style={{ opacity: 0.35 }}>/</span>
            <span style={{ color: visual.coreColor, opacity: 0.8 }}>{name}</span>
          </>
        )}
      </nav>

      {/* ── Main identity ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Eyebrow */}
        <span
          className="text-[10px] uppercase tracking-[0.22em] font-semibold"
          style={{ color: 'var(--star)', opacity: 0.5 }}
        >
          {viewerRole === 'self' ? 'Your planet' : 'Planet profile'}
        </span>

        {/* Name */}
        <h1
          className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight"
          style={{
            background: `linear-gradient(135deg, #e8e0ff 0%, ${visual.coreColor} 55%, ${visual.accentColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {name}
        </h1>

        {/* Tagline */}
        {tagline && (
          <p
            className="text-base sm:text-lg italic leading-relaxed"
            style={{ color: 'var(--ink)', opacity: 0.75, maxWidth: '52ch' }}
          >
            &ldquo;{tagline}&rdquo;
          </p>
        )}
      </div>

      {/* ── Meta row: location, languages, status, comm style ────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Active status */}
        {activeStatus && <StatusBadge status={activeStatus} />}

        {/* Location */}
        {location && (
          <span
            className="text-sm"
            style={{ color: 'var(--ink)', opacity: 0.65 }}
          >
            ◎ {location}
          </span>
        )}

        {/* Languages */}
        {languages && languages.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {languages.map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  background: 'rgba(167,139,250,0.08)',
                  border: '1px solid rgba(167,139,250,0.18)',
                  color: 'var(--ink)',
                  opacity: 0.75,
                }}
              >
                {lang}
              </span>
            ))}
          </div>
        )}

        {/* Communication style */}
        {communicationStyle && (
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-medium capitalize"
            style={{
              background: `${visual.coreColor}10`,
              border: `1px solid ${visual.coreColor}28`,
              color: visual.coreColor,
            }}
          >
            {communicationStyle}
          </span>
        )}
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      {viewerRole === 'explorer' && <ExplorerActions />}
      {viewerRole === 'resonator' && <ResonatorActions planet={planet} />}
      {/* self: no actions here — SelfPlanetActions is a separate bar */}
    </header>
  )
}
