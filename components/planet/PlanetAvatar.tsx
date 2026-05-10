'use client'

/* eslint-disable @next/next/no-img-element */

import { useState } from 'react'
import type { PlanetConfig } from '@/types/planet'
import LevelBadge from '@/components/planet/LevelBadge'

interface Props {
  planetConfig?: PlanetConfig
  /** Texture filename inside /textures/, e.g. "mars.jpg" */
  textureFile?: string
  /** Diameter in pixels (default 48) */
  size?: number
  /** Hex glow color for the box-shadow aura (default #a78bfa) */
  glowColor?: string
  /** Animate the surface horizontally for small non-WebGL previews */
  rotating?: boolean
  /** Seconds per surface rotation */
  rotationDuration?: number
  showBadge?: boolean
  level?: number
  className?: string
}

/**
 * PlanetAvatar — lightweight planet image for lists, cards, and match tiles.
 * Uses Next Image with CSS border-radius + box-shadow glow. No WebGL.
 */
export default function PlanetAvatar({
  planetConfig,
  textureFile,
  size = 48,
  glowColor = '#a78bfa',
  rotating = false,
  rotationDuration = 18,
  showBadge = false,
  level = 1,
  className = '',
}: Props) {
  const [failed, setFailed] = useState(false)
  const resolvedTexture = planetConfig?.baseTexture ?? textureFile ?? 'jupiter.jpg'
  const resolvedGlowColor = planetConfig?.tintColor ?? glowColor
  const textureSrc = planetConfig?.customTextureUrl ?? `/textures/${resolvedTexture}`

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${Math.round(size * 0.4)}px ${resolvedGlowColor}80, 0 0 ${size}px ${resolvedGlowColor}20`,
      }}
    >
      {failed ? (
        /* CSS gradient sphere fallback */
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${resolvedGlowColor}cc 0%, ${resolvedGlowColor}44 60%, ${resolvedGlowColor}18 100%)`,
          }}
        />
      ) : rotating ? (
        <div
          className="planet-avatar-rotating w-full h-full rounded-full select-none"
          style={{
            width: size,
            height: size,
            backgroundImage: `url(${textureSrc})`,
            backgroundRepeat: 'repeat-x',
            backgroundSize: '210% 100%',
            backgroundPosition: '0% 50%',
            overflow: 'hidden',
            animation: `planet-surface-drift ${rotationDuration}s linear infinite`,
          }}
          aria-hidden="true"
        >
          <img src={textureSrc} alt="" className="hidden" onError={() => setFailed(true)} />
        </div>
      ) : (
        <img
          src={textureSrc}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover rounded-full select-none"
          style={{ display: 'block', width: size, height: size }}
        />
      )}

      {/* Specular highlight overlay for sphere illusion */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.18) 0%, transparent 55%)',
        }}
      />

      {/* Terminator shadow for depth */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 72% 68%, rgba(0,0,0,0.35) 0%, transparent 50%)',
        }}
      />

      {showBadge && (
        <span className="absolute -right-1 -top-1 z-10">
          <LevelBadge level={level} size="sm" />
        </span>
      )}
    </div>
  )
}
