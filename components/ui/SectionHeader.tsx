import type { ReactNode } from 'react'

type Align = 'left' | 'center'

interface Props {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Optional element (button, link) placed top-right when align='left' */
  action?: ReactNode
  align?: Align
  /** Semantic heading level. Use 1 when this is the primary page heading. Default: 2 */
  level?: 1 | 2 | 3
  className?: string
}

/**
 * SectionHeader — standardised section title pattern.
 * Eyebrow (small caps label) + title + optional subtitle + optional action.
 *
 *   <SectionHeader
 *     eyebrow="Universe map"
 *     title="Nearby resonances"
 *     subtitle="Planets in your orbital range"
 *     action={<button>View all</button>}
 *   />
 */
export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  align = 'left',
  level = 2,
  className = '',
}: Props) {
  const isCentered = align === 'center'
  const Heading = `h${level}` as 'h1' | 'h2' | 'h3'

  return (
    <div
      className={`flex ${isCentered ? 'flex-col items-center text-center' : 'items-start justify-between'} gap-3 ${className}`}
    >
      <div className={`flex flex-col gap-1.5 ${isCentered ? 'items-center' : ''}`}>
        {eyebrow && (
          <span className="text-eyebrow">{eyebrow}</span>
        )}
        <Heading
          className="text-xl font-semibold leading-tight tracking-tight"
          style={{ color: 'var(--foreground)' }}
        >
          {title}
        </Heading>
        {subtitle && (
          <p
            className="text-sm leading-relaxed max-w-prose"
            style={{ color: 'var(--ink)', opacity: 0.75 }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {action && !isCentered && (
        <div className="shrink-0 pt-0.5">{action}</div>
      )}

      {action && isCentered && (
        <div className="mt-1">{action}</div>
      )}
    </div>
  )
}
