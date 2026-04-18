import type { MatchDimensions, OrbitColor } from '@/types/match'
import { orbitColorHex } from '@/lib/match'

// --- Dimension display config -------------------------------------------------

const DIMENSION_META: Array<{
  key: keyof MatchDimensions
  label: string
  color: OrbitColor
}> = [
  { key: 'interests',  label: 'Shared interests',   color: 'blue'   },
  { key: 'expression', label: 'Expression style',   color: 'purple' },
  { key: 'emotion',    label: 'Emotional theme',    color: 'red'    },
  { key: 'culture',    label: 'Culture & travel',   color: 'green'  },
  { key: 'arts',       label: 'Arts & music',       color: 'gold'   },
  { key: 'worldview',  label: 'Worldview contrast', color: 'orange' },
]

// --- MatchDimensionBars -------------------------------------------------------

interface Props {
  dimensions: MatchDimensions
  /** Highlight one bar as primary */
  primaryColor?: OrbitColor
  compact?: boolean
}

export default function MatchDimensionBars({ dimensions, primaryColor, compact = false }: Props) {
  const scored = DIMENSION_META.filter(({ key }) => dimensions[key] !== undefined)

  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
      {scored.map(({ key, label, color }) => {
        const value  = dimensions[key] ?? 0
        const hex    = orbitColorHex(color)
        const isPrimary = color === primaryColor

        return (
          <div key={key} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span
                className={`${compact ? 'text-[10px]' : 'text-xs'} uppercase tracking-widest`}
                style={{ color: isPrimary ? hex : 'var(--ghost)', opacity: isPrimary ? 1 : 0.75 }}
              >
                {label}
              </span>
              <span
                className="text-[10px] tabular-nums font-medium"
                style={{ color: hex, opacity: isPrimary ? 1 : 0.65 }}
              >
                {value}
              </span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ height: compact ? 3 : 4, background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${value}%`,
                  background: `linear-gradient(to right, ${hex}55, ${hex})`,
                  boxShadow: isPrimary ? `0 0 8px ${hex}55` : undefined,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
