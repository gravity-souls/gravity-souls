import { LEVEL_NAMES, clampLevel } from '@/lib/xp'

const LEVEL_COLORS = {
  1: '#6b7280',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#a855f7',
  5: '#f59e0b',
} as const

interface Props {
  level: number
  size?: 'sm' | 'md'
}

export default function LevelBadge({ level, size = 'sm' }: Props) {
  const safeLevel = clampLevel(level)
  const color = LEVEL_COLORS[safeLevel]
  const isMax = safeLevel === 5

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[10px] font-bold ${isMax ? 'animate-pulse' : ''}`}
        style={{
          background: `${color}28`,
          borderColor: `${color}88`,
          color: safeLevel === 1 ? '#e5e7eb' : '#fff',
          boxShadow: isMax ? `0 0 16px ${color}88` : `0 0 8px ${color}44`,
        }}
        title={LEVEL_NAMES[safeLevel]}
      >
        {safeLevel}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${isMax ? 'animate-pulse' : ''}`}
      style={{
        background: `${color}18`,
        borderColor: `${color}66`,
        color: safeLevel === 1 ? '#d1d5db' : color,
        boxShadow: isMax ? `0 0 24px ${color}55` : `0 0 14px ${color}22`,
      }}
    >
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full text-[11px]" style={{ background: `${color}2f` }}>
        {safeLevel}
      </span>
      {LEVEL_NAMES[safeLevel]}
    </span>
  )
}
