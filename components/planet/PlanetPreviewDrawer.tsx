'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import PlanetVisual from './PlanetVisual'
import LockedLayer from '@/components/ui/LockedLayer'
import type { PlanetProfile } from '@/types/planet'

interface Props {
  planet:   PlanetProfile | null
  open:     boolean
  onClose:  () => void
  userRole?: 'explorer' | 'resonator'
}

/**
 * PlanetPreviewDrawer  -  slide-in panel showing a shallow planet preview.
 *
 * Explorer users see: name, themes, one quote fragment.
 * Resonator users see: all of the above + emotional bars + CTA to send a beam.
 *
 * Renders as a fixed right-side panel on desktop, bottom sheet on mobile.
 */
export default function PlanetPreviewDrawer({ planet, open, onClose, userRole = 'explorer' }: Props) {
  const isResonator = userRole === 'resonator'

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* -- Backdrop ------------------------------------------------------- */}
      <div
        className="fixed inset-0 z-50"
        style={{
          background:  'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          opacity:     open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition:  'opacity 320ms ease',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* -- Drawer panel --------------------------------------------------- */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={planet ? `Planet ${planet.name}` : 'Planet preview'}
        className="fixed z-50 flex flex-col"
        style={{
          // Desktop: right-side panel
          top:        'var(--nav-h)',
          right:      0,
          bottom:     0,
          width:      'min(400px, 100vw)',
          background: 'linear-gradient(160deg, rgba(18,14,52,0.97) 0%, rgba(6,4,20,0.99) 100%)',
          backdropFilter: 'blur(24px)',
          borderLeft: '1px solid var(--border-mid)',
          boxShadow:  'var(--shadow-panel)',
          transform:  open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 380ms cubic-bezier(0.16,1,0.3,1)',
          overflowY:  'auto',
        }}
      >
        {planet && <DrawerContent planet={planet} isResonator={isResonator} onClose={onClose} />}
      </div>
    </>
  )
}

// --- Drawer content (separated to avoid conditional hooks) ------------------

function DrawerContent({
  planet,
  isResonator,
  onClose,
}: {
  planet:       PlanetProfile
  isResonator:  boolean
  onClose:      () => void
}) {
  const { coreColor } = planet.visual
  const fragment = planet.contentFragments[0]

  return (
    <div className="flex flex-col h-full">

      {/* Close button */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <span className="text-eyebrow">Planet</span>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200"
          style={{
            color:      'var(--ghost)',
            background: 'transparent',
            border:     '1px solid var(--border-soft)',
            cursor:     'pointer',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--ghost)'
          }}
          aria-label="Close preview"
        >
          ×
        </button>
      </div>

      {/* Planet visual */}
      <div className="flex justify-center py-6 shrink-0">
        <PlanetVisual visual={planet.visual} symbol={planet.avatarSymbol} />
      </div>

      {/* Accent line under visual */}
      <div
        className="mx-6 mb-6 h-px shrink-0"
        style={{ background: `linear-gradient(90deg, transparent, ${coreColor}50, transparent)` }}
        aria-hidden="true"
      />

      {/* Scrollable info content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-5">

        {/* Name + tagline */}
        <div>
          <h2
            className="text-lg font-semibold leading-tight mb-1"
            style={{ color: 'var(--foreground)' }}
          >
            {planet.name}
          </h2>
          {planet.tagline && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.7 }}>
              {planet.tagline}
            </p>
          )}
        </div>

        {/* Role + mood */}
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-widest uppercase"
            style={{
              background: `${coreColor}18`,
              color:       coreColor,
              border:     `1px solid ${coreColor}35`,
            }}
          >
            {planet.mood}
          </span>
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-widest uppercase"
            style={{
              background: 'var(--surface)',
              color:       'var(--ink)',
              border:     '1px solid var(--border-soft)',
            }}
          >
            {planet.lifestyle}
          </span>
        </div>

        {/* Core themes */}
        <div>
          <p className="text-data-label mb-2">Themes</p>
          <div className="flex flex-wrap gap-1.5">
            {planet.coreThemes.slice(0, 4).map((theme) => (
              <span
                key={theme}
                className="px-2.5 py-1 rounded-lg text-xs"
                style={{
                  background: 'var(--surface-2)',
                  color:       'var(--ink)',
                  border:     '1px solid var(--border-soft)',
                }}
              >
                {theme}
              </span>
            ))}
          </div>
        </div>

        {/* Quote fragment */}
        {fragment && (
          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--surface)',
              border:     '1px solid var(--border-soft)',
              borderLeft: `2px solid ${coreColor}60`,
            }}
          >
            <p
              className="text-sm leading-relaxed italic"
              style={{ color: 'var(--ink)', opacity: 0.8 }}
            >
              "{fragment}"
            </p>
          </div>
        )}

        {/* Emotional bars  -  Resonator only */}
        {isResonator ? (
          <div>
            <p className="text-data-label mb-3">Resonance profile</p>
            <div className="flex flex-col gap-2.5">
              {planet.emotionalBars.map((bar) => (
                <div key={bar.label} className="flex items-center gap-3">
                  <span
                    className="w-16 shrink-0 text-[10px] tracking-wide"
                    style={{ color: 'var(--ghost)' }}
                  >
                    {bar.label}
                  </span>
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ height: 3, background: 'var(--surface-3)' }}
                  >
                    <div
                      style={{
                        width:      `${bar.value}%`,
                        height:     '100%',
                        background: `linear-gradient(90deg, ${bar.color}aa, ${bar.color})`,
                        borderRadius: 'inherit',
                      }}
                    />
                  </div>
                  <span
                    className="w-8 shrink-0 text-right text-[10px]"
                    style={{ color: 'var(--ghost)' }}
                  >
                    {bar.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <LockedLayer
            reason="Create your planet to see full resonance profiles"
            ctaLabel="Begin formation"
            ctaHref="/create-planet"
            blur={false}
            className="rounded-xl"
          >
            {/* Skeleton bars behind the lock */}
            <div className="p-4 flex flex-col gap-2.5">
              {[60, 45, 80, 30].map((w, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-16 h-2 rounded" style={{ background: 'var(--surface-3)' }} />
                  <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
                </div>
              ))}
            </div>
          </LockedLayer>
        )}
      </div>

      {/* -- Footer CTAs ---------------------------------------------------- */}
      <div
        className="px-6 py-4 flex flex-col gap-2 shrink-0"
        style={{ borderTop: '1px solid var(--border-soft)' }}
      >
        {/* View full planet  -  always available */}
        <Link
          href={`/planet/${planet.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200"
          style={{
            color:      'var(--foreground)',
            background: `linear-gradient(135deg, ${coreColor}35, ${coreColor}20)`,
            border:     `1px solid ${coreColor}45`,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${coreColor}30`
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
          }}
        >
          View planet
        </Link>

        {/* Resonator-only actions */}
        {isResonator ? (
          <div className="flex gap-2">
            <button
              className="flex-1 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-200"
              style={{
                color:      'var(--ink)',
                background: 'var(--surface)',
                border:     '1px solid var(--border-soft)',
                cursor:     'pointer',
              }}
              onClick={() => {/* Phase 6 */}}
            >
              Save planet
            </button>
            <button
              className="flex-1 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-200"
              style={{
                color:      'var(--star)',
                background: 'rgba(167,139,250,0.08)',
                border:     '1px solid var(--border-accent)',
                cursor:     'pointer',
              }}
              onClick={() => {/* Phase 6 */}}
            >
              Send beam
            </button>
          </div>
        ) : (
          <p className="text-center text-xs" style={{ color: 'var(--ghost)' }}>
            Create your planet to connect
          </p>
        )}
      </div>
    </div>
  )
}
