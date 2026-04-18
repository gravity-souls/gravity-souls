import type { ReactNode } from 'react'
import Link from 'next/link'

// --- Fog veil overlay -----------------------------------------------------

interface FogVeilProps {
  reason: string
  ctaLabel: string
  ctaHref: string
  accentColor?: string
}

function FogVeil({ reason, ctaLabel, ctaHref, accentColor = '#a78bfa' }: FogVeilProps) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
      style={{
        // Atmospheric fog  -  not a hard black overlay
        background: [
          'linear-gradient(to bottom,',
          '  rgba(3,3,15,0.0) 0%,',
          '  rgba(3,3,15,0.55) 30%,',
          '  rgba(3,3,15,0.82) 60%,',
          '  rgba(3,3,15,0.92) 100%)',
        ].join(' '),
        backdropFilter: 'blur(3px)',
        borderRadius: 'inherit',
        zIndex: 10,
      }}
    >
      {/* Glyph */}
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-base"
        style={{
          background: `${accentColor}10`,
          border: `1px solid ${accentColor}28`,
          color: accentColor,
          boxShadow: `0 0 18px ${accentColor}18`,
        }}
      >
        ◌
      </div>

      {/* Reason */}
      <p
        className="text-sm leading-relaxed max-w-[28ch]"
        style={{ color: 'var(--ink)', opacity: 0.72 }}
      >
        {reason}
      </p>

      {/* CTA */}
      <Link
        href={ctaHref}
        className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200"
        style={{
          background: `linear-gradient(135deg, ${accentColor}cc, rgba(99,102,241,0.8))`,
          color: '#fff',
          boxShadow: `0 0 24px ${accentColor}30`,
        }}
      >
        {ctaLabel}
      </Link>
    </div>
  )
}

// --- ProfileLayerSection --------------------------------------------------

interface Props {
  /** Section title  -  rendered as eyebrow label above children */
  title: string
  children: ReactNode
  /**
   * When true, children are rendered blurred beneath a FogVeil overlay.
   * When false (default), children are fully visible.
   */
  locked?: boolean
  /** Fog-veil copy explaining why this layer is locked */
  lockReason?: string
  /** CTA label inside the fog veil */
  lockCtaLabel?: string
  /** CTA destination */
  lockCtaHref?: string
  /** Accent colour for fog-veil glyph + CTA gradient */
  accentColor?: string
  className?: string
}

/**
 * ProfileLayerSection  -  wraps a section of the planet profile with an
 * eyebrow title. If `locked`, renders a subtle atmospheric fog-veil instead
 * of a hard disabled overlay, so the layer still feels beautiful and desirable.
 *
 * Usage:
 *   <ProfileLayerSection
 *     title="Cultural orbit"
 *     locked={viewerRole === 'explorer'}
 *     lockReason="Only resonators can enter this orbit"
 *     lockCtaLabel="Create your planet"
 *     lockCtaHref="/create-planet"
 *     accentColor={planet.visual.coreColor}
 *   >
 *     <CulturalOrbitContent />
 *   </ProfileLayerSection>
 */
export default function ProfileLayerSection({
  title,
  children,
  locked = false,
  lockReason = 'Create your planet to unlock deeper resonance',
  lockCtaLabel = 'Begin formation',
  lockCtaHref = '/create-planet',
  accentColor,
  className = '',
}: Props) {
  return (
    <section className={`flex flex-col gap-3 ${className}`}>
      {/* Eyebrow title */}
      <span
        className="text-[10px] uppercase tracking-[0.2em] font-semibold"
        style={{ color: 'var(--star)', opacity: 0.52 }}
      >
        {title}
      </span>

      {/* Content with optional fog veil */}
      <div className="relative rounded-xl overflow-hidden">
        {/* Content  -  blurred if locked */}
        <div
          style={
            locked
              ? { filter: 'blur(4px)', opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }
              : undefined
          }
        >
          {children}
        </div>

        {/* Fog veil overlay */}
        {locked && (
          <FogVeil
            reason={lockReason}
            ctaLabel={lockCtaLabel}
            ctaHref={lockCtaHref}
            accentColor={accentColor}
          />
        )}
      </div>
    </section>
  )
}
