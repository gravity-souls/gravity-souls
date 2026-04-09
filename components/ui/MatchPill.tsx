import type { MatchType } from '@/types/universe'

type Size = 'sm' | 'md'

interface Props {
  type: MatchType
  /** Optional numeric score (0–100) shown after the label */
  score?: number
  size?: Size
  className?: string
}

const CONFIG: Record<MatchType, { label: string; symbol: string; pillClass: string }> = {
  similar: {
    label:     'Similar',
    symbol:    '◎',
    pillClass: 'pill-similar',
  },
  complementary: {
    label:     'Complement',
    symbol:    '◍',
    pillClass: 'pill-complementary',
  },
  distant: {
    label:     'Distant',
    symbol:    '○',
    pillClass: 'pill-distant',
  },
}

const SIZE_CLASS: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-[9px] gap-1',
  md: 'px-3 py-1   text-[10px] gap-1.5',
}

/**
 * MatchPill — compact resonance type indicator.
 *
 *   <MatchPill type="similar" score={88} />
 *   <MatchPill type="complementary" size="sm" />
 */
export default function MatchPill({ type, score, size = 'md', className = '' }: Props) {
  const cfg = CONFIG[type]

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium tracking-wide ${cfg.pillClass} ${SIZE_CLASS[size]} ${className}`}
    >
      <span className="shrink-0">{cfg.symbol}</span>
      <span>{cfg.label}</span>
      {score !== undefined && (
        <span className="opacity-60 tabular-nums">{score}</span>
      )}
    </span>
  )
}
