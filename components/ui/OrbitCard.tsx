'use client'

import { useRef, type ReactNode, type CSSProperties } from 'react'

interface OrbitCardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Accent colour used for the hover glow and top-right corner wash */
  glowColor?: string
  /** Enable mouse-following radial highlight */
  hoverable?: boolean
  /** Scale up slightly on hover */
  lift?: boolean
  /** Show a faint animated ring around the card border */
  ringed?: boolean
}

export default function OrbitCard({
  children,
  className = '',
  style,
  glowColor = '#7c3aed',
  hoverable = false,
  lift = false,
  ringed = false,
}: OrbitCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null)
  const glowRef  = useRef<HTMLDivElement>(null)

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current || !glowRef.current) return
    const { left, top } = cardRef.current.getBoundingClientRect()
    const x = e.clientX - left
    const y = e.clientY - top
    glowRef.current.style.background =
      `radial-gradient(280px circle at ${x}px ${y}px, ${glowColor}1a 0%, transparent 70%)`
  }

  function handleMouseLeave() {
    if (!glowRef.current) return
    glowRef.current.style.background = 'transparent'
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={hoverable ? handleMouseMove : undefined}
      onMouseLeave={hoverable ? handleMouseLeave : undefined}
      className={[
        'relative rounded-2xl overflow-hidden',
        lift ? 'transition-transform duration-500 hover:scale-[1.015] hover:-translate-y-1' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        // Deep glazed surface
        background:
          'linear-gradient(135deg, rgba(28,24,72,0.72) 0%, rgba(12,10,42,0.65) 45%, rgba(2,2,14,0.82) 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        // Layered border: subtle outer glow + inner highlight line
        boxShadow: ringed
          ? `0 0 0 1px ${glowColor}22, 0 0 0 1px rgba(255,255,255,0.04) inset, 0 28px 80px rgba(0,0,0,0.55), 0 0 60px ${glowColor}12`
          : '0 0 0 1px rgba(167,139,250,0.14), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 24px 64px rgba(0,0,0,0.5)',
        border: `1px solid ${glowColor}20`,
        ...style,
      }}
    >
      {/* Mouse-follow radial highlight */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none transition-all duration-300"
        style={{ zIndex: 0 }}
      />

      {/* Static top-right corner nebula wash */}
      <div
        className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 100% 0%, ${glowColor}12, transparent 70%)`,
          zIndex: 0,
        }}
      />

      {/* Bottom-left secondary accent */}
      <div
        className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 0% 100%, rgba(99,102,241,0.08), transparent 70%)`,
          zIndex: 0,
        }}
      />

      {/* Top edge shimmer line */}
      <div
        className="absolute top-0 left-6 right-6 h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor}40, rgba(255,255,255,0.15), ${glowColor}40, transparent)`,
          zIndex: 1,
        }}
      />

      {/* Content sits above all decorative layers */}
      <div className="relative" style={{ zIndex: 2 }}>
        {children}
      </div>
    </div>
  )
}
