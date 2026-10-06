import { useTranslations } from 'next-intl'
import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'
import { orbitColorHex } from '@/lib/match'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { resolvePlanetTexture } from '@/lib/planet-textures'

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
  const t = useTranslations('resonance')
  const color = orbitColorHex(match.orbitColor)
  const size  = isActive ? 52 : 44

  return (
    <button
      onClick={onClick}
      title={planet.name}
      className="absolute flex flex-col items-center gap-1.5 group rounded-xl focus-visible:outline-2 focus-visible:outline-violet-200"
      style={{
        ...style,
        transform: 'translate(-50%, -50%)',
        width:  size + 40, // click target wider than visual
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
      }}
      aria-pressed={isActive}
      aria-label={`${planet.name} · ${t('signalScore')} ${match.score}`}
    >
      {/* Planet orb — texture-based avatar */}
      <div
        className="group-hover:scale-110 group-focus-visible:scale-110 motion-reduce:transition-none"
        style={{
          width:  size,
          height: size,
          borderRadius: '50%',
          border: 'none',
          boxShadow: isActive
            ? `0 0 20px ${planet.visual.coreColor}44`
            : `0 0 10px ${planet.visual.coreColor}44`,
          transition: 'all 0.25s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <PlanetAvatar
          planetConfig={planet.planetConfig}
          textureFile={resolvePlanetTexture(planet)}
          size={size}
          glowColor={planet.visual.coreColor}
          rotating
          rotationDuration={16 + (planet.id.length % 5) * 3}
        />

      </div>
      <span className="rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-none" style={{ color, background: `${color}14` }}>
        {match.score}
      </span>

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
