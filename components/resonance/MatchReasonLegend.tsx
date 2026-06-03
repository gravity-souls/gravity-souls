import type { OrbitReasonKey } from '@/types/match'
import { useTranslations } from 'next-intl'

// --- Legend entries -----------------------------------------------------------

const LEGEND: Array<{ reason: OrbitReasonKey; labelKey: string }> = [
  { reason: 'shared-interest',      labelKey: 'reasons.sharedInterest'      },
  { reason: 'expression-style',     labelKey: 'reasons.expressionStyle'     },
  { reason: 'emotional-theme',      labelKey: 'reasons.emotionalTheme'      },
  { reason: 'culture-travel',       labelKey: 'reasons.cultureTravel'       },
  { reason: 'art-books-music',      labelKey: 'reasons.artBooksMusic'       },
  { reason: 'worldview-complement', labelKey: 'reasons.worldviewComplement' },
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
  const t = useTranslations('resonance')
  return (
    <div className={`flex flex-wrap gap-x-4 gap-y-2 ${className}`}>
      {LEGEND.map(({ reason, labelKey }) => {
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
              {t(labelKey)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
