'use client'

import { useTranslations } from 'next-intl'
import { dismissHint } from '@/lib/hints-preferences'
import { useHintDismissed } from '@/lib/hooks/useHintDismissed'

export default function FirstTimeHint({
  hintKey,
  title,
  body,
  className,
}: {
  hintKey: string
  title: string
  body: string
  className?: string
}) {
  const t = useTranslations('common')
  const dismissed = useHintDismissed(hintKey)
  if (dismissed) return null

  return (
    <div
      role="status"
      className={`flex items-start gap-3 px-5 py-4 rounded-2xl ${className ?? ''}`}
      style={{
        background: 'rgba(167,139,250,0.06)',
        border: '1px solid rgba(167,139,250,0.15)',
      }}
    >
      <span className="text-base mt-0.5 shrink-0" aria-hidden="true" style={{ color: 'var(--star)', opacity: 0.7 }}>◎</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{title}</p>
        <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--ink)', opacity: 0.7 }}>{body}</p>
      </div>
      <button
        type="button"
        onClick={() => dismissHint(hintKey)}
        className="shrink-0 text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
        style={{
          background: 'rgba(167,139,250,0.10)',
          border: '1px solid rgba(167,139,250,0.18)',
          color: 'var(--ghost)',
          cursor: 'pointer',
        }}
      >
        {t('gotIt')}
      </button>
    </div>
  )
}
