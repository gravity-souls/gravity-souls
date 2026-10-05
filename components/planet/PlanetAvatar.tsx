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
 * Uses a lightweight circular image. Uploaded photos stay flat and still.
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
  const photo = !!planetConfig?.customTextureUrl
  const haloAlpha = Math.round(Math.min(0.3, Math.max(0, planetConfig?.atmosphereDensity ?? 0.12)) / 0.3 * 96).toString(16).padStart(2, '0')

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
          boxShadow: `0 0 ${Math.round(size * 0.4)}px ${resolvedGlowColor}80, 0 0 ${size}px ${planetConfig?.atmosphereColor ?? resolvedGlowColor}${haloAlpha}`,
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
      ) : rotating && !photo ? (
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
      {!photo && <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.18) 0%, transparent 55%)',
        }}
      />}

      {!photo && planetConfig && planetConfig.cloudOpacity > 0 && (
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(165deg, transparent 0%, rgba(255,255,255,0.45) 12%, transparent 24%, transparent 40%)',
            opacity: planetConfig.cloudOpacity * 0.55,
          }}
        />
      )}
      </div>

      {/* Preset shading never overlays an uploaded photograph. */}
      {!photo && <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 72% 68%, rgba(0,0,0,0.35) 0%, transparent 50%)',
        }}
      />}

      {showBadge && (
        <span className="absolute -right-1 -top-1 z-10">
          <LevelBadge level={level} size="sm" />
        </span>
      )}
    </div>
  )
}
