import { type ReactNode, type CSSProperties } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  hoverable?: boolean
  glowing?: boolean
  style?: CSSProperties
}

export default function GlassCard({ children, className = '', hoverable = false, glowing = false, style }: GlassCardProps) {
  return (
    <div
      style={style}
      className={[
        'glass rounded-2xl p-6',
        hoverable ? 'glass-hover transition-all duration-300 cursor-pointer' : '',
        glowing ? 'glow-ring' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
