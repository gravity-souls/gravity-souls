'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'
import { getPlanetById } from '@/lib/mock-planets'
import { orbitColorHex } from '@/lib/match'
import GlowButton from '@/components/ui/GlowButton'
import MatchDimensionBars from '@/components/resonance/MatchDimensionBars'

// --- Relationship type labels -------------------------------------------------

const REL_LABEL: Record<string, string> = {
  'chat':                 'Casual signal',
  'friendship':           'Mutual orbit',
  'activity-buddy':       'Activity companion',
  'community-companion':  'Galaxy co-member',
  'deep-conversation':    'Deep conversation',
}

// --- Score ring ---------------------------------------------------------------

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r   = 28
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ

  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      <svg width={72} height={72} style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
        <circle cx={36} cy={36} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle
          cx={36} cy={36} r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
        />
      </svg>
      <span className="relative text-lg font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

// --- ResonanceDrawer ----------------------------------------------------------

interface Props {
  match:    OrbitMatch | null
  onClose:  () => void
}

export default function ResonanceDrawer({ match, onClose }: Props) {
  const open = match !== null

  // Escape key to close
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const planet: PlanetProfile | undefined = match ? getPlanetById(match.planetId) : undefined
  const color  = match ? orbitColorHex(match.orbitColor) : '#a78bfa'

  return (
    <>
      {/* Backdrop  -  mobile only */}
      <div
        className="fixed inset-0 z-40 lg:hidden transition-opacity duration-300"
        style={{
          background:   'rgba(4,3,18,0.70)',
          backdropFilter: 'blur(4px)',
          opacity:      open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel  -  right side on desktop, bottom sheet on mobile */}
      <div
        className="fixed z-50 flex flex-col overflow-hidden transition-transform duration-300 ease-in-out"
        style={{
          // Desktop: right panel
          top: 0, right: 0, bottom: 0, width: 400,
          background: 'linear-gradient(180deg, rgba(14,10,44,0.98) 0%, rgba(6,4,24,0.98) 100%)',
          borderLeft: `1px solid ${color}20`,
          boxShadow: `-24px 0 80px rgba(0,0,0,0.6), inset 1px 0 0 ${color}10`,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          // Mobile override handled by Tailwind below
        } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
      >
        {planet && match ? (
          <DrawerContent planet={planet} match={match} color={color} onClose={onClose} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span style={{ color: 'var(--ghost)' }}>Select a planet to see its resonance.</span>
          </div>
        )}
      </div>
    </>
  )
}

// --- Drawer content -----------------------------------------------------------

function DrawerContent({
  planet,
  match,
  color,
  onClose,
}: {
  planet:  PlanetProfile
  match:   OrbitMatch
  color:   string
  onClose: () => void
}) {
  return (
    <>
      {/* Top color bar */}
      <div className="h-1 w-full shrink-0" style={{ background: `linear-gradient(to right, transparent, ${color}, transparent)` }} />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

        {/* Close button */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
            Resonance detail
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all duration-150"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--ghost)',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Planet identity */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
            style={{
              background: `${planet.visual.coreColor}15`,
              border: `1px solid ${planet.visual.coreColor}35`,
              boxShadow: `0 0 24px ${planet.visual.coreColor}25`,
            }}
          >
            {planet.avatarSymbol}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
              {planet.name}
            </h2>
            {planet.tagline && (
              <p className="text-xs italic leading-snug" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                &ldquo;{planet.tagline}&rdquo;
              </p>
            )}
          </div>
          <ScoreRing score={match.score} color={color} />
        </div>

        {/* Resonance note */}
        <div
          className="px-4 py-3 rounded-xl"
          style={{
            background: `${color}08`,
            border: `1px solid ${color}20`,
          }}
        >
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.8 }}>
            &ldquo;{match.resonanceNote}&rdquo;
          </p>
        </div>

        {/* Dimension bars */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
            Resonance map
          </span>
          <MatchDimensionBars dimensions={match.dimensions} primaryColor={match.orbitColor} />
        </div>

        {/* Similarities */}
        {match.similarities.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#34d399', opacity: 0.7 }}>
              Gravitational pull
            </span>
            <ul className="flex flex-col gap-1.5">
              {match.similarities.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink)', opacity: 0.75 }}>
                  <span style={{ color: '#34d399', opacity: 0.7 }} className="shrink-0 mt-0.5">◎</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Differences */}
        {match.differences.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#fb923c', opacity: 0.7 }}>
              Productive contrast
            </span>
            <ul className="flex flex-col gap-1.5">
              {match.differences.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink)', opacity: 0.75 }}>
                  <span style={{ color: '#fb923c', opacity: 0.7 }} className="shrink-0 mt-0.5">◌</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested connection types */}
        {match.suggestedTypes.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
              Suggested orbit
            </span>
            <div className="flex flex-wrap gap-1.5">
              {match.suggestedTypes.map((type) => (
                <span
                  key={type}
                  className="text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wide"
                  style={{
                    background: `${color}10`,
                    border: `1px solid ${color}25`,
                    color,
                  }}
                >
                  {REL_LABEL[type] ?? type}
                </span>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* CTA footer */}
      <div
        className="shrink-0 px-6 py-4 flex flex-col gap-2"
        style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}
      >
        <GlowButton
          href={`/messages/${planet.id}`}
          variant="primary"
          className="w-full py-3 text-sm text-center"
        >
          Send a beam
        </GlowButton>
        <Link
          href={`/planet/${planet.id}`}
          className="text-center text-xs py-2 transition-opacity hover:opacity-80"
          style={{ color: 'var(--ghost)', textDecoration: 'none' }}
        >
          View full planet →
        </Link>
      </div>
    </>
  )
}
