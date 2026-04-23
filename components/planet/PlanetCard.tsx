'use client'

import type { CSSProperties } from 'react'
import type { PlanetProfile } from '@/types/planet'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { getTextureFile } from '@/lib/planet-textures'

interface Props {
  planet: PlanetProfile
  onClick?: () => void
  /** Size of the orb in px  -  defaults to 48 */
  size?: number
  /** Show the planet name label below the orb */
  showLabel?: boolean
  style?: CSSProperties
  className?: string
}

/**
 * PlanetCard  -  compact interactive planet dot.
 *
 * Used in:
 *   - Universe homepage field (scattered, absolute positioned)
 *   - Galaxy member lists (inline, smaller)
 *
 * For full planet profile display use PlanetVisual + PlanetModules.
 */
export default function PlanetCard({
  planet,
  onClick,
  size = 48,
  showLabel = true,
  style,
  className = '',
}: Props) {
  const { coreColor, accentColor } = planet.visual

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 ${className}`}
      style={style}
      aria-label={`${planet.name}${planet.tagline ? `  -  ${planet.tagline}` : ''}`}
    >
      {/* Hover halo  -  expands behind the orb on hover */}
      <div
        className="absolute rounded-full pointer-events-none opacity-0 group-hover:opacity-100"
        style={{
          width:     size * 2.5,
          height:    size * 2.5,
          top:       '50%',
          left:      '50%',
          transform: 'translate(-50%, -60%)',
          background: `radial-gradient(circle, ${coreColor}28 0%, transparent 70%)`,
          transition: 'opacity 500ms ease',
        }}
        aria-hidden="true"
      />

      {/* Planet orb — texture-based avatar */}
      <PlanetAvatar
        textureFile={getTextureFile([planet.mood, planet.lifestyle, ...planet.coreThemes])}
        size={size}
        glowColor={coreColor}
      />

      {/* Scale ring  -  grows on hover */}
      <div
        className="absolute rounded-full pointer-events-none border opacity-0 group-hover:opacity-100"
        style={{
          width:       size + 10,
          height:      size + 10,
          top:         '50%',
          left:        '50%',
          transform:   'translate(-50%, -60%)',
          borderColor: `${coreColor}55`,
          transition:  'opacity 400ms ease, width 500ms cubic-bezier(0.16,1,0.3,1), height 500ms cubic-bezier(0.16,1,0.3,1)',
        }}
        aria-hidden="true"
      />

      {/* Name label */}
      {showLabel && (
        <span
          className="text-center leading-none select-none transition-opacity duration-300 opacity-40 group-hover:opacity-80"
          style={{
            fontSize:    9,
            color:       'var(--ink)',
            letterSpacing: '0.1em',
            maxWidth:    size * 2,
            overflow:    'hidden',
            textOverflow: 'ellipsis',
            whiteSpace:  'nowrap',
          }}
        >
          {planet.name}
        </span>
      )}
    </button>
  )
}
