import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'
import { orbitColorHex } from '@/lib/match'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { getTextureFile } from '@/lib/planet-textures'

// --- ResonancePlanetNode ------------------------------------------------------
// A single orbiting planet node in the ResonanceOrbitSystem.
// Positioned absolutely by the parent via `style` prop.

interface Props {
  match:    OrbitMatch
  planet:   PlanetProfile
  isActive: boolean
  onClick:  () => void
  /** Absolute CSS position for the node center */
  style:    React.CSSProperties
}

export default function ResonancePlanetNode({ match, planet, isActive, onClick, style }: Props) {
  const color = orbitColorHex(match.orbitColor)
  const size  = isActive ? 52 : 44

  return (
    <button
      onClick={onClick}
      className="absolute flex flex-col items-center gap-1.5 group"
      style={{
        ...style,
        transform: 'translate(-50%, -50%)',
        width:  size + 40, // click target wider than visual
        outline: 'none',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
      aria-label={`${planet.name}  -  resonance score ${match.score}`}
    >
      {/* Planet orb — texture-based avatar */}
      <div
        style={{
          width:  size,
          height: size,
          borderRadius: '50%',
          border: `2px solid ${color}`,
          boxShadow: isActive
            ? `0 0 0 4px ${color}22, 0 0 20px ${color}44`
            : `0 0 10px ${planet.visual.coreColor}44`,
          transition: 'all 0.25s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <PlanetAvatar
          textureFile={getTextureFile([planet.mood, planet.lifestyle, ...planet.coreThemes])}
          size={size}
          glowColor={planet.visual.coreColor}
        />

        {/* Score badge */}
        <div
          style={{
            position: 'absolute',
            top: -6,
            right: -6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: color,
            border: '1px solid rgba(4,3,18,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 8,
            fontWeight: 700,
            color: '#000',
            lineHeight: 1,
          }}
        >
          {match.score}
        </div>
      </div>

      {/* Planet name */}
      <span
        className="text-[10px] font-medium uppercase tracking-wide text-center leading-tight whitespace-nowrap transition-opacity duration-200"
        style={{
          color: isActive ? color : 'var(--ghost)',
          opacity: isActive ? 1 : 0.7,
          textShadow: isActive ? `0 0 10px ${color}88` : undefined,
          maxWidth: 80,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {planet.name}
      </span>
    </button>
  )
}
