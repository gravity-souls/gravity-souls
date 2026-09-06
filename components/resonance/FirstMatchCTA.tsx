'use client'

import { orbitColorHex } from '@/lib/match'
import { useHintDismissed } from '@/lib/hooks/useHintDismissed'
import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'

const HINT_KEY = 'resonance-first-match-viewed'

interface Props {
  topMatch:  OrbitMatch
  planet?:   PlanetProfile
  onReveal:  () => void
}

export default function FirstMatchCTA({ topMatch, planet, onReveal }: Props) {
  const dismissed = useHintDismissed(HINT_KEY)
  if (dismissed) return null

  const color = orbitColorHex(topMatch.orbitColor)
  const displayName   = planet?.name ?? null
  const displaySymbol = planet?.avatarSymbol ?? '◎'
  const symbolColor   = planet?.visual.coreColor ?? color

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-2xl mt-4"
      style={{
        background: `${color}08`,
        border: `1px solid ${color}20`,
      }}
    >
      {/* Planet symbol */}
      <div
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
        style={{
          background: `${symbolColor}15`,
          border: `1px solid ${symbolColor}35`,
        }}
        aria-hidden="true"
      >
        {displaySymbol}
      </div>

      {/* Copy */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
          {displayName ? `Meet ${displayName}` : 'Your closest match'}
        </p>
        <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--ink)', opacity: 0.7 }}>
          Signal strength {topMatch.score} — your highest resonance is waiting. See what you share.
        </p>
      </div>

      {/* Score badge */}
      <div
        className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold"
        style={{
          background: `${color}15`,
          border: `1px solid ${color}35`,
          color,
        }}
        aria-label={`Resonance score ${topMatch.score}`}
      >
        {topMatch.score}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={onReveal}
        className="shrink-0 text-xs px-3 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
        style={{
          background: `${color}18`,
          border: `1px solid ${color}35`,
          color,
          cursor: 'pointer',
        }}
      >
        Open my match →
      </button>
    </div>
  )
}
