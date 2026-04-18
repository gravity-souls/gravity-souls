// Server component  -  pure CSS conic/radial gradient beams.
// Renders soft spotlight cones using screen blend mode for a cinematic look.

interface LightConeProps {
  /** Position of the cone apex (source of the beam) */
  origin?: 'top-center' | 'top-left' | 'top-right'
  /** Colour at the bright centre of the cone */
  color?: string
  /** Overall opacity  -  keep low (0.07–0.18) for subtlety */
  opacity?: number
  /** Whether to add a second, wider softer cone behind the main one */
  double?: boolean
  className?: string
}

const ORIGINS: Record<
  NonNullable<LightConeProps['origin']>,
  { left?: string; right?: string; transform?: string }
> = {
  'top-center': { left: '50%', transform: 'translateX(-50%)' },
  'top-left':   { left: '-5%' },
  'top-right':  { right: '-5%' },
}

export default function LightCone({
  origin = 'top-center',
  color = 'rgba(167,139,250,1)',
  opacity = 0.13,
  double = true,
  className = '',
}: LightConeProps) {
  const pos = ORIGINS[origin]

  return (
    <div
      className={`fixed top-0 pointer-events-none ${className}`}
      style={{ ...pos, zIndex: 2 }}
      aria-hidden="true"
    >
      {/* Wide soft backing cone */}
      {double && (
        <div
          style={{
            width: '80vw',
            height: '85vh',
            background: `conic-gradient(from 270deg at 50% 0%, transparent 68deg, ${color} 90deg, ${color} 90deg, transparent 112deg)`,
            opacity: opacity * 0.45,
            filter: 'blur(55px)',
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* Sharp inner cone  -  offset so both overlap from same apex */}
      <div
        style={{
          position: double ? 'absolute' : 'relative',
          top: 0,
          left: double ? '50%' : undefined,
          transform: double ? 'translateX(-50%)' : undefined,
          width: '50vw',
          height: '72vh',
          background: `conic-gradient(from 270deg at 50% 0%, transparent 76deg, ${color} 90deg, ${color} 90deg, transparent 104deg)`,
          opacity,
          filter: 'blur(30px)',
          mixBlendMode: 'screen',
        }}
      />
    </div>
  )
}
