import type { ReactNode } from 'react'
import Link from 'next/link'

interface Props {
  /** Content to blur/obscure beneath the overlay */
  children: ReactNode
  /** Short explanation of why this is locked */
  reason?: string
  /** CTA label */
  ctaLabel?: string
  /** CTA destination */
  ctaHref?: string
  /** Called when CTA button is clicked (use instead of ctaHref for modals/actions) */
  onCta?: () => void
  /** Apply blur to underlying content */
  blur?: boolean
  className?: string
}

/**
 * LockedLayer  -  wraps content behind an overlay for premium/gated features.
 *
 *   <LockedLayer
 *     reason="Create your planet to unlock resonance matching"
 *     ctaLabel="Begin formation"
 *     ctaHref="/create-universe"
 *   >
 *     <ResonanceMap />
 *   </LockedLayer>
 */
export default function LockedLayer({
  children,
  reason,
  ctaLabel = 'Unlock',
  ctaHref,
  onCta,
  blur = true,
  className = '',
}: Props) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {/* Blurred underlying content */}
      <div className={blur ? 'locked-blur' : ''} aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-2xl px-6 text-center"
        style={{
          background: 'linear-gradient(160deg, rgba(8,6,28,0.82) 0%, rgba(20,16,50,0.78) 100%)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Lock symbol */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
          style={{
            background: 'rgba(124,58,237,0.12)',
            border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--star)',
            boxShadow: '0 0 20px rgba(124,58,237,0.15)',
          }}
        >
          ◌
        </div>

        {/* Reason text */}
        {reason && (
          <p
            className="text-sm leading-relaxed max-w-xs"
            style={{ color: 'var(--ink)', opacity: 0.75 }}
          >
            {reason}
          </p>
        )}

        {/* CTA */}
        {(ctaHref || onCta) && (
          ctaHref ? (
            <Link
              href={ctaHref}
              className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(124,58,237,0.3)',
              }}
            >
              {ctaLabel}
            </Link>
          ) : (
            <button
              onClick={onCta}
              className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(124,58,237,0.3)',
              }}
            >
              {ctaLabel}
            </button>
          )
        )}
      </div>
    </div>
  )
}
