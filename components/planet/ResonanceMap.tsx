import Link from 'next/link'
import type { ResonancePlanet, BeamColor } from '@/types/planet'

// --- Beam colour map ----------------------------------------------------------

const BEAM_COLORS: Record<BeamColor, { primary: string; glow: string; label: string }> = {
  violet: { primary: '#a78bfa', glow: '#6366f155', label: 'Emotion' },
  teal:   { primary: '#34d399', glow: '#059669aa', label: 'Interest' },
  amber:  { primary: '#fbbf24', glow: '#d9770688', label: 'Thought' },
  blue:   { primary: '#60a5fa', glow: '#2563eb88', label: 'Lifestyle' },
}

// --- SVG hub diagram ----------------------------------------------------------
// Central hub orb with radiating beam lines toward resonance planet symbols.

function ResonanceHub({
  planets,
  hubColor,
}: {
  planets: ResonancePlanet[]
  hubColor: string
}) {
  const W = 280
  const H = 240
  const cx = W / 2
  const cy = H / 2
  const orbitR = 95

  // Spread planets evenly in a fan (top half + sides)
  const angles = (() => {
    const count = planets.length
    if (count === 0) return []
    if (count === 1) return [270]
    const start = 180 + 20
    const end = 360 - 20
    const step = (end - start) / (count - 1)
    return Array.from({ length: count }, (_, i) => start + i * step)
  })()

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      <defs>
        {planets.map((p, i) => {
          const col = BEAM_COLORS[p.beamColor]
          return (
            <linearGradient key={p.id} id={`beam-grad-${p.id}`} gradientUnits="userSpaceOnUse"
              x1={cx} y1={cy}
              x2={cx + orbitR * Math.cos((angles[i] * Math.PI) / 180)}
              y2={cy + orbitR * Math.sin((angles[i] * Math.PI) / 180)}
            >
              <stop offset="0%"   stopColor={col.primary} stopOpacity="0.7" />
              <stop offset="100%" stopColor={col.primary} stopOpacity="0.15" />
            </linearGradient>
          )
        })}
        <filter id="hub-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="node-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Beam lines */}
      {planets.map((p, i) => {
        const rad = (angles[i] * Math.PI) / 180
        const ex = cx + orbitR * Math.cos(rad)
        const ey = cy + orbitR * Math.sin(rad)
        const col = BEAM_COLORS[p.beamColor]
        return (
          <g key={p.id}>
            {/* Wide soft beam */}
            <line
              x1={cx} y1={cy} x2={ex} y2={ey}
              stroke={col.glow}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.3"
            />
            {/* Sharp beam */}
            <line
              x1={cx} y1={cy} x2={ex} y2={ey}
              stroke={`url(#beam-grad-${p.id})`}
              strokeWidth="1.5"
              strokeLinecap="round"
              filter="url(#node-glow)"
            />
            {/* Strength tick mark at 60% along */}
            <circle
              cx={cx + orbitR * 0.55 * Math.cos(rad)}
              cy={cy + orbitR * 0.55 * Math.sin(rad)}
              r={2}
              fill={col.primary}
              opacity="0.7"
            />
          </g>
        )
      })}

      {/* Hub orb */}
      <circle cx={cx} cy={cy} r={22} fill={`${hubColor}18`} stroke={`${hubColor}40`} strokeWidth="1" filter="url(#hub-glow)" />
      <circle cx={cx} cy={cy} r={14} fill={`${hubColor}30`} stroke={`${hubColor}60`} strokeWidth="1" />
      <text x={cx} y={cy + 5} textAnchor="middle" fontSize="14" fill={hubColor} opacity="0.85">⊛</text>

      {/* Resonance planet symbols at orbit endpoints */}
      {planets.map((p, i) => {
        const rad = (angles[i] * Math.PI) / 180
        const ex = cx + orbitR * Math.cos(rad)
        const ey = cy + orbitR * Math.sin(rad)
        const col = BEAM_COLORS[p.beamColor]
        return (
          <g key={`node-${p.id}`} filter="url(#node-glow)">
            <circle cx={ex} cy={ey} r={14} fill={`${col.primary}15`} stroke={`${col.primary}50`} strokeWidth="1" />
            <text x={ex} y={ey + 5} textAnchor="middle" fontSize="12" fill={col.primary}>{p.avatarSymbol}</text>
          </g>
        )
      })}
    </svg>
  )
}

// --- Resonance planet card ----------------------------------------------------

function ResonancePlanetCard({ planet }: { planet: ResonancePlanet }) {
  const col = BEAM_COLORS[planet.beamColor]

  return (
    <Link
      href={`/planet/${planet.id}`}
      className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
      style={{
        background: `${col.primary}08`,
        border: `1px solid ${col.primary}22`,
      }}
    >
      {/* Symbol orb */}
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base"
        style={{
          background: `radial-gradient(circle, ${planet.coreColor}30, transparent 70%)`,
          boxShadow: `0 0 0 1px ${planet.coreColor}28`,
          color: planet.coreColor,
        }}
      >
        {planet.avatarSymbol}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{planet.name}</span>
          <span
            className="text-[9px] uppercase tracking-widest font-bold shrink-0"
            style={{ color: col.primary, opacity: 0.7 }}
          >
            {col.label}
          </span>
        </div>
        {planet.tagline && (
          <p className="text-xs italic truncate" style={{ color: 'var(--ink)', opacity: 0.6 }}>
            {planet.tagline}
          </p>
        )}
      </div>

      {/* Strength bar */}
      <div className="shrink-0 flex flex-col items-end gap-1">
        <span className="text-xs font-semibold tabular-nums" style={{ color: col.primary }}>
          {planet.strength}%
        </span>
        <div className="w-12 h-px rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${planet.strength}%`, background: col.primary }}
          />
        </div>
      </div>
    </Link>
  )
}

// --- ResonanceMap -------------------------------------------------------------

interface Props {
  planets: ResonancePlanet[]
  hubColor: string
  title?: string
}

export default function ResonanceMap({ planets, hubColor, title = 'Resonance field' }: Props) {
  if (planets.length === 0) return null

  return (
    <div className="flex flex-col gap-5">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        {title}
      </span>

      {/* SVG hub + beam diagram */}
      <div className="flex justify-center">
        <ResonanceHub planets={planets} hubColor={hubColor} />
      </div>

      {/* Planet cards */}
      <div className="flex flex-col gap-2">
        {planets.map((p) => (
          <ResonancePlanetCard key={p.id} planet={p} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
        {(Object.entries(BEAM_COLORS) as [BeamColor, typeof BEAM_COLORS[BeamColor]][]).map(([, col]) => (
          <div key={col.label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: col.primary }} />
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.7 }}>{col.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
