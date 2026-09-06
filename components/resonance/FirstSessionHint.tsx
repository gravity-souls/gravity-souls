'use client'

import { dismissHint } from '@/lib/hints-preferences'

import { useHintDismissed } from '@/lib/hooks/useHintDismissed'

const HINT_KEY = 'resonance-first-session'

export default function FirstSessionHint() {
  const dismissed = useHintDismissed(HINT_KEY)
  if (dismissed) return null

  function handleDismiss() { dismissHint(HINT_KEY) }

  return (
    <div
      role="status"
      className="flex items-start gap-3 px-5 py-4 rounded-2xl mt-4"
      style={{
        background: 'rgba(167,139,250,0.06)',
        border: '1px solid rgba(167,139,250,0.15)',
      }}
    >
      <span className="text-base mt-0.5 shrink-0" aria-hidden="true" style={{ color: 'var(--star)', opacity: 0.7 }}>◎</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
          Your orbit is live
        </p>
        <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--ink)', opacity: 0.7 }}>
          These are the planets most attuned to yours. Tap any to see what draws you together.
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-xs px-2.5 py-1 rounded-lg transition-opacity hover:opacity-80"
        style={{
          background: 'rgba(167,139,250,0.10)',
          border: '1px solid rgba(167,139,250,0.18)',
          color: 'var(--ghost)',
          cursor: 'pointer',
        }}
      >
        Got it
      </button>
    </div>
  )
}
