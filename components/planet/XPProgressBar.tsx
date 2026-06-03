import { LEVEL_NAMES, clampLevel, xpToNextLevel } from '@/lib/xp'
import { useTranslations } from 'next-intl'

interface Props {
  xp: number
  userLevel: number
}

export default function XPProgressBar({ xp, userLevel }: Props) {
  const t = useTranslations('common')
  const level = clampLevel(userLevel)
  const progress = xpToNextLevel(xp)
  const nextLevel = clampLevel(level + 1)
  const isMax = level === 5

  return (
    <div className="rounded-lg border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.035)' }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--ghost)' }}>{t('planetLevel')}</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{LEVEL_NAMES[level]}</p>
        </div>
        <span className="text-xs font-semibold" style={{ color: level === 5 ? '#f59e0b' : 'var(--star)' }}>Lv.{level}</span>
      </div>

      <div className="h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${progress.percentage}%`,
            background: isMax
              ? 'linear-gradient(90deg, #a855f7, #f59e0b)'
              : 'linear-gradient(90deg, #7c3aed, #a78bfa)',
            boxShadow: isMax ? '0 0 18px rgba(245,158,11,0.55)' : '0 0 14px rgba(167,139,250,0.35)',
          }}
        />
      </div>

      <p className="mt-2 text-xs" style={{ color: 'var(--ghost)' }}>
        {isMax
          ? t('maximumLevelReached')
          : t('xpToLevel', { current: progress.current, required: progress.required, level: LEVEL_NAMES[nextLevel] })}
      </p>
    </div>
  )
}
