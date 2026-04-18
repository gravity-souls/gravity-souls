import type { OrbitReasonKey } from '@/types/match'
import { orbitColorHex } from '@/lib/match'

// --- Legend entries -----------------------------------------------------------

const LEGEND: Array<{ reason: OrbitReasonKey; label: string }> = [
  { reason: 'shared-interest',      label: 'Shared interests'   },
  { reason: 'expression-style',     label: 'Expression style'   },
  { reason: 'emotional-theme',      label: 'Emotional theme'    },
  { reason: 'culture-travel',       label: 'Culture & travel'   },
  { reason: 'art-books-music',      label: 'Arts & music'       },
  { reason: 'worldview-complement', label: 'Worldview contrast' },
]

const REASON_COLOR: Record<OrbitReasonKey, string> = {
  'shared-interest':      '#60a5fa',
  'expression-style':     '#a78bfa',
  'emotional-theme':      '#f87171',
  'culture-travel':       '#34d399',
  'art-books-music':      '#fbbf24',
  'worldview-complement': '#fb923c',
}

// --- MatchReasonLegend --------------------------------------------------------

interface Props {
  /** Highlight one entry as active */
  active?: OrbitReasonKey
  className?: string
}

export default function MatchReasonLegend({ active, className = '' }: Props) {
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-2 ${className}`}>
      {LEGEND.map(({ reason, label }) => {
        const color = REASON_COLOR[reason]
        const isActive = reason === active
        return (
          <div key={reason} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: color,
                opacity: isActive ? 1 : 0.45,
                boxShadow: isActive ? `0 0 6px ${color}` : undefined,
              }}
            />
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: isActive ? color : 'var(--ghost)', opacity: isActive ? 1 : 0.6 }}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
