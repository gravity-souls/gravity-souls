import type { PlanetProfile } from '@/types/planet'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { resolvePlanetTexture } from '@/lib/planet-textures'

// --- LivePlanetPreview --------------------------------------------------------
// Compact planet preview shown alongside creation steps.
// Re-renders on every draft change via parent memoization.

interface Props {
  planet: PlanetProfile
  /** Diameter of the planet orb (default 140) */
  size?: number
  /** Show planet name + trait chips below */
  showMeta?: boolean
}

export default function LivePlanetPreview({ planet, size = 140, showMeta = true }: Props) {
  const { visual } = planet
  const textureFile = resolvePlanetTexture(planet)

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Glowing container */}
      <div
        className="relative flex items-center justify-center rounded-3xl p-6"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${visual.coreColor}10 0%, transparent 70%)`,
          border: `1px solid ${visual.coreColor}18`,
          minWidth: size + 80,
          minHeight: size + 80,
        }}
      >
        <div className="relative flex items-center justify-center">
          <div
            className="absolute rounded-full"
            style={{
              width: size + 28,
              height: size + 28,
              border: `1px solid ${visual.accentColor ?? visual.coreColor}2c`,
              boxShadow: `0 0 ${Math.round(size * 0.35)}px ${visual.coreColor}22`,
            }}
          />
          <PlanetAvatar textureFile={textureFile} size={size} glowColor={visual.coreColor} />
        </div>
      </div>

      {/* Planet name */}
      <div className="text-center flex flex-col gap-2">
        <p
          className="text-base font-semibold"
          style={{
            background: `linear-gradient(135deg, #e8e0ff 0%, ${visual.coreColor} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {planet.name}
        </p>

        {showMeta && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {/* Mood chip */}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full capitalize"
              style={{
                background: `${visual.coreColor}14`,
                border: `1px solid ${visual.coreColor}28`,
                color: visual.coreColor,
              }}
            >
              {planet.mood}
            </span>
            {/* Lifestyle chip */}
            <span
              className="text-[10px] px-2 py-0.5 rounded-full capitalize"
              style={{
                background: 'rgba(167,139,250,0.08)',
                border: '1px solid rgba(167,139,250,0.18)',
                color: 'var(--star)',
              }}
            >
              {planet.lifestyle}
            </span>
            {/* Communication style if set */}
            {planet.communicationStyle && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'var(--ink)',
                }}
              >
                {planet.communicationStyle}
              </span>
            )}
          </div>
        )}

        {/* Theme tags */}
        {showMeta && planet.coreThemes.length > 0 && planet.coreThemes[0] !== 'inner drift' && (
          <div className="flex flex-wrap justify-center gap-1">
            {planet.coreThemes.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[9px] px-1.5 py-0.5 rounded"
                style={{
                  background: `${visual.coreColor}10`,
                  color: visual.coreColor,
                  opacity: 0.75,
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
