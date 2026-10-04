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
 * Uses a lightweight image with CSS glow, clouds and a small ring. No WebGL.
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const resolvedTexture = planetConfig?.baseTexture ?? textureFile ?? 'jupiter.jpg'
  const resolvedGlowColor = planetConfig?.tintColor ?? glowColor
  const textureSrc = planetConfig?.customTextureUrl ?? `/textures/${resolvedTexture}`
  const failed = failedSrc === textureSrc
  const ringColor = planetConfig?.ringColor || resolvedGlowColor

  return (
    <div
      className={`relative shrink-0 rounded-full ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          boxShadow: `0 0 ${Math.round(size * 0.4)}px ${resolvedGlowColor}80, 0 0 ${size}px ${planetConfig?.atmosphereColor ?? resolvedGlowColor}30`,
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
          <img src={textureSrc} alt="" className="hidden" onError={() => setFailedSrc(textureSrc)} />
        </div>
      ) : (
        <img
          src={textureSrc}
          alt=""
          draggable={false}
          onError={() => setFailedSrc(textureSrc)}
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

      {planetConfig && planetConfig.cloudOpacity > 0 && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(165deg, transparent 0%, rgba(255,255,255,0.45) 12%, transparent 24%, transparent 40%)',
            opacity: planetConfig.cloudOpacity * 0.55,
          }}
        />
      )}
      </div>

      {planetConfig?.hasRing && size >= 24 && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border"
          style={{
            width: size * 1.22,
            height: size * 0.42,
            transform: 'translate(-50%, -50%) rotate(-22deg)',
            borderColor: `${ringColor}a8`,
            boxShadow: `0 0 ${Math.max(3, Math.round(size * 0.1))}px ${ringColor}88`,
          }}
          aria-hidden="true"
        />
      )}

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
