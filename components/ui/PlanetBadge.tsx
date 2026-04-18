type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  /** Unicode symbol displayed at the centre of the badge */
  symbol: string
  /** Primary glow colour (hex or rgba) */
  color?: string
  size?: Size
  /** Draw a thin orbit ring around the badge */
  ring?: boolean
  /** Pulse glow animation */
  pulse?: boolean
  className?: string
}

const SIZE_MAP: Record<Size, { outer: number; inner: number; fontSize: number }> = {
  xs: { outer: 22,  inner: 18,  fontSize: 10 },
  sm: { outer: 34,  inner: 28,  fontSize: 14 },
  md: { outer: 50,  inner: 42,  fontSize: 20 },
  lg: { outer: 68,  inner: 58,  fontSize: 28 },
  xl: { outer: 96,  inner: 82,  fontSize: 40 },
}

const DEFAULT_COLOR = '#a78bfa'

/**
 * PlanetBadge  -  glowing avatar orb for a planet or universe symbol.
 * Used in nav items, stream cards, resonance maps, breadcrumbs.
 *
 *   <PlanetBadge symbol="⊙" color="#60a5fa" size="md" ring pulse />
 */
export default function PlanetBadge({
  symbol,
  color = DEFAULT_COLOR,
  size = 'md',
  ring = false,
  pulse = false,
  className = '',
}: Props) {
  const { outer, inner, fontSize } = SIZE_MAP[size]

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 ${className}`}
      style={{ width: outer, height: outer }}
      aria-hidden="true"
    >
      {/* Orbit ring */}
      {ring && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px solid ${color}22`,
            boxShadow: `0 0 0 1px ${color}10`,
          }}
        />
      )}

      {/* Outer glow halo */}
      <div
        className="absolute rounded-full"
        style={{
          width: outer,
          height: outer,
          background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        }}
      />

      {/* Inner orb */}
      <div
        className={`relative flex items-center justify-center rounded-full${pulse ? ' animate-pulse-glow' : ''}`}
        style={{
          width: inner,
          height: inner,
          background: `radial-gradient(circle at 38% 32%, ${color}30 0%, ${color}10 55%, transparent 100%)`,
          boxShadow: `0 0 0 1px ${color}22, 0 0 ${inner * 0.3}px ${color}28`,
        }}
      >
        <span
          className="select-none leading-none"
          style={{ fontSize, color, textShadow: `0 0 ${fontSize * 0.8}px ${color}` }}
        >
          {symbol}
        </span>
      </div>
    </div>
  )
}
