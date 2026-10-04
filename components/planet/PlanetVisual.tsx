import type { PlanetVisualConfig } from '@/types/planet'

// --- Size map -----------------------------------------------------------------

const SIZE_PX: Record<PlanetVisualConfig['size'], number> = {
  sm: 80,
  md: 120,
  lg: 160,
  xl: 200,
}

// --- Satellite ----------------------------------------------------------------

function Satellite({
  index,
  total,
  coreColor,
  accentColor,
  planetSize,
}: {
  index: number
  total: number
  coreColor: string
  accentColor: string
  planetSize: number
}) {
  const orbitRadius = planetSize * 0.75 + index * 18
  const dotSize = 5 - index * 0.8
  const duration = 18 + index * 7

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: orbitRadius * 2,
        height: orbitRadius * 2,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        animation: `orbit ${duration}s linear infinite`,
        animationDelay: `-${(duration / total) * index}s`,
      }}
      aria-hidden="true"
    >
      {/* Satellite dot at the top of the orbit wrapper */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: index % 2 === 0 ? coreColor : accentColor,
          boxShadow: `0 0 ${dotSize * 2}px ${coreColor}`,
        }}
      />
    </div>
  )
}

// --- PlanetVisual -------------------------------------------------------------

interface Props {
  visual: PlanetVisualConfig
  /** Optional symbol rendered at centre of the orb */
  symbol?: string
  className?: string
}

export default function PlanetVisual({ visual, symbol, className = '' }: Props) {
  const size = SIZE_PX[visual.size]
  const { coreColor, accentColor, satelliteCount } = visual


  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size + 120, height: size + 120 }}
    >
      {/* Planet orb */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-full animate-nebula-breathe"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 35% 30%, ${accentColor}aa 0%, ${coreColor}66 40%, ${coreColor}22 70%, transparent 100%)`,
          boxShadow: [
            `0 0 0 1px ${coreColor}30`,
            `0 0 ${size * 0.3}px ${coreColor}40`,
            `0 0 ${size * 0.7}px ${coreColor}18`,
          ].join(', '),
        }}
      >
        {/* Surface texture overlay */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: visual.surfaceStyle === 'cracked'
              ? `repeating-conic-gradient(${coreColor}08 0deg, transparent 3deg, transparent 8deg, ${coreColor}05 9deg)`
              : visual.surfaceStyle === 'crystalline'
              ? `linear-gradient(135deg, ${accentColor}18 25%, transparent 25%, transparent 50%, ${accentColor}10 50%, ${accentColor}10 75%, transparent 75%)`
              : visual.surfaceStyle === 'nebulous'
              ? `radial-gradient(ellipse at 60% 40%, ${accentColor}20 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, ${coreColor}15 0%, transparent 45%)`
              : undefined,
          }}
        />

        {/* Centre symbol */}
        {symbol && (
          <span
            className="relative z-10 select-none leading-none"
            style={{
              fontSize: size * 0.35,
              color: accentColor,
              textShadow: `0 0 ${size * 0.2}px ${coreColor}cc`,
            }}
          >
            {symbol}
          </span>
        )}
      </div>

      {/* Satellites */}
      {Array.from({ length: satelliteCount }).map((_, i) => (
        <Satellite
          key={i}
          index={i}
          total={satelliteCount}
          coreColor={coreColor}
          accentColor={accentColor}
          planetSize={size}
        />
      ))}
    </div>
  )
}
