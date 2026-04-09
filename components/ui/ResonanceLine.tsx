// Server component — pure SVG with gradient stroke + glow filter.
// Renders a glowing beam that visually separates resonance sections.

import type { MatchType } from '@/types/universe'

interface ResonanceLineProps {
  matchType: MatchType
  /** 0–100, controls opacity and intensity of the beam */
  strength?: number
  className?: string
}

const TYPE_CONFIG: Record<
  MatchType,
  { from: string; via: string; to: string; orb: string }
> = {
  similar: {
    from: '#4f46e5',
    via:  '#a78bfa',
    to:   '#6366f1',
    orb:  '#a78bfa',
  },
  complementary: {
    from: '#047857',
    via:  '#34d399',
    to:   '#059669',
    orb:  '#34d399',
  },
  distant: {
    from: '#92400e',
    via:  '#fbbf24',
    to:   '#d97706',
    orb:  '#fbbf24',
  },
}

export default function ResonanceLine({
  matchType,
  strength = 80,
  className = '',
}: ResonanceLineProps) {
  const cfg     = TYPE_CONFIG[matchType]
  const opacity = Math.max(0.1, Math.min(1, strength / 100)) * 0.7
  const id      = `rl-${matchType}`

  return (
    <div className={`w-full overflow-visible ${className}`} aria-hidden="true">
      <svg
        width="100%"
        height="20"
        viewBox="0 0 800 20"
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={cfg.from} stopOpacity="0" />
            <stop offset="18%"  stopColor={cfg.from} stopOpacity={opacity * 0.7} />
            <stop offset="45%"  stopColor={cfg.via}  stopOpacity={opacity} />
            <stop offset="55%"  stopColor={cfg.via}  stopOpacity={opacity} />
            <stop offset="82%"  stopColor={cfg.to}   stopOpacity={opacity * 0.7} />
            <stop offset="100%" stopColor={cfg.to}   stopOpacity="0" />
          </linearGradient>

          {/* Blur + composite for the glow effect */}
          <filter id={`${id}-glow`} x="-20%" y="-300%" width="140%" height="700%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Main beam */}
        <line
          x1="0"  y1="10"
          x2="800" y2="10"
          stroke={`url(#${id}-grad)`}
          strokeWidth="1"
          filter={`url(#${id}-glow)`}
        />

        {/* Secondary wider soft beam */}
        <line
          x1="0"  y1="10"
          x2="800" y2="10"
          stroke={`url(#${id}-grad)`}
          strokeWidth="4"
          opacity="0.25"
          filter={`url(#${id}-glow)`}
        />

        {/* Centre orb */}
        <circle
          cx="400" cy="10" r="3"
          fill={cfg.orb}
          opacity={opacity * 1.4}
          filter={`url(#${id}-glow)`}
        />

        {/* Flanking micro-orbs */}
        <circle cx="320" cy="10" r="1.5" fill={cfg.orb} opacity={opacity * 0.6} />
        <circle cx="480" cy="10" r="1.5" fill={cfg.orb} opacity={opacity * 0.6} />
      </svg>
    </div>
  )
}
