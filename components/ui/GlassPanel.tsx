import type { CSSProperties, ReactNode } from 'react'

type Variant = 'base' | 'elevated' | 'sunken'
type As = 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer'

interface Props {
  children: ReactNode
  variant?: Variant
  as?: As
  className?: string
  style?: CSSProperties
  onClick?: () => void
}

const variantClass: Record<Variant, string> = {
  base:     'glass-panel',
  elevated: 'glass-panel-elevated',
  sunken:   'glass-panel-sunken',
}

/**
 * GlassPanel  -  semantic glass surface, 3 variants.
 * Use instead of raw div + inline styles when you need a contained section.
 *
 *   <GlassPanel variant="elevated" className="p-6 rounded-2xl">
 *     …
 *   </GlassPanel>
 */
export default function GlassPanel({
  children,
  variant = 'base',
  as: Tag = 'div',
  className = '',
  style,
  onClick,
}: Props) {
  return (
    <Tag
      className={`rounded-2xl ${variantClass[variant]} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </Tag>
  )
}
