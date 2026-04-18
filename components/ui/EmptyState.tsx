import type { ReactNode } from 'react'

type Size = 'sm' | 'md' | 'lg'

interface Props {
  /** Large centre symbol (Unicode glyph) */
  symbol?: string
  title: string
  subtitle?: string
  /** Primary CTA element */
  action?: ReactNode
  /** Secondary action (link, ghost button) */
  secondaryAction?: ReactNode
  size?: Size
  className?: string
}

const SIZE_MAP: Record<Size, { symbolSize: string; titleSize: string }> = {
  sm: { symbolSize: 'text-4xl',  titleSize: 'text-base' },
  md: { symbolSize: 'text-5xl',  titleSize: 'text-lg'   },
  lg: { symbolSize: 'text-6xl',  titleSize: 'text-xl'   },
}

/**
 * EmptyState  -  standardised empty content placeholder.
 * Used on /my-planet, /my-universe, and locked sections.
 *
 *   <EmptyState
 *     symbol="◌"
 *     title="No resonances yet"
 *     subtitle="Create your universe to discover who orbits near you"
 *     action={<GlowButton href="/create-universe">Create</GlowButton>}
 *   />
 */
export default function EmptyState({
  symbol = '◌',
  title,
  subtitle,
  action,
  secondaryAction,
  size = 'md',
  className = '',
}: Props) {
  const { symbolSize, titleSize } = SIZE_MAP[size]

  return (
    <div className={`flex flex-col items-center text-center gap-6 py-12 px-6 ${className}`}>
      {/* Breathing symbol */}
      <div className="relative flex items-center justify-center">
        {/* Outer halo */}
        <div
          className="absolute rounded-full animate-empty-breathe"
          style={{
            width: 96, height: 96,
            background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          }}
        />
        <span
          className={`relative ${symbolSize} animate-empty-breathe`}
          style={{ color: 'var(--star)', opacity: 0.45 }}
          aria-hidden="true"
        >
          {symbol}
        </span>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2 max-w-sm">
        <h3
          className={`${titleSize} font-semibold leading-tight`}
          style={{ color: 'var(--foreground)' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--ink)', opacity: 0.65 }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
