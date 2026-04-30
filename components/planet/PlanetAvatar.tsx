'use client'

import Image from 'next/image'
import { useState } from 'react'

interface Props {
  /** Texture filename inside /textures/, e.g. "mars.jpg" */
  textureFile: string
  /** Diameter in pixels (default 48) */
  size?: number
  /** Hex glow color for the box-shadow aura (default #a78bfa) */
  glowColor?: string
  className?: string
}

/**
 * PlanetAvatar — lightweight planet image for lists, cards, and match tiles.
 * Uses Next Image with CSS border-radius + box-shadow glow. No WebGL.
 */
export default function PlanetAvatar({
  textureFile,
  size = 48,
  glowColor = '#a78bfa',
  className = '',
}: Props) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={`relative shrink-0 rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 ${Math.round(size * 0.4)}px ${glowColor}55, 0 0 ${size}px ${glowColor}20`,
      }}
    >
      {failed ? (
        /* CSS gradient sphere fallback */
        <div
          className="w-full h-full rounded-full"
          style={{
            background: `radial-gradient(circle at 35% 30%, ${glowColor}cc 0%, ${glowColor}44 60%, ${glowColor}18 100%)`,
          }}
        />
      ) : (
        <Image
          src={`/textures/${textureFile}`}
          alt=""
          width={size}
          height={size}
          draggable={false}
          onError={() => setFailed(true)}
          className="w-full h-full object-cover rounded-full select-none"
          style={{ display: 'block' }}
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
    </div>
  )
}
