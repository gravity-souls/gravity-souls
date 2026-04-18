'use client'

import { useMemo } from 'react'
import type { OrbitMatch } from '@/types/match'
import type { PlanetProfile } from '@/types/planet'
import { getPlanetById } from '@/lib/mock-planets'
import { orbitColorHex } from '@/lib/match'
import ResonancePlanetNode from '@/components/resonance/ResonancePlanetNode'

// --- Geometry -----------------------------------------------------------------

/** Evenly space N nodes around a circle, starting from the top. */
function distributeAngles(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i * 360) / n - 90)
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

// --- Beam line ----------------------------------------------------------------

function BeamLine({
  x1, y1, x2, y2,
  color,
  strength,
  isActive,
}: {
  x1: number; y1: number; x2: number; y2: number
  color: string; strength: number; isActive: boolean
}) {
  const opacity = isActive ? 0.7 : Math.max(0.15, strength / 200)
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={isActive ? 2 : 1}
      strokeOpacity={opacity}
      strokeDasharray={isActive ? undefined : '4 6'}
      style={{ filter: isActive ? `drop-shadow(0 0 4px ${color})` : undefined }}
    />
  )
}

// --- ResonanceOrbitSystem -----------------------------------------------------

interface Props {
  sourcePlanet:  PlanetProfile
  matches:       OrbitMatch[]
  activeId:      string | null
  onSelect:      (id: string | null) => void
  /** Canvas size in px (square) */
  size?:         number
}

export default function ResonanceOrbitSystem({
  sourcePlanet,
  matches,
  activeId,
  onSelect,
  size = 520,
}: Props) {
  const cx = size / 2
  const cy = size / 2
  const hubR = 54
  const orbitR = size * 0.36

  const angles = useMemo(() => distributeAngles(matches.length), [matches.length])

  const nodes = useMemo(() =>
    matches.map((match, i) => {
      const planet = getPlanetById(match.planetId)
      const angle  = angles[i]
      const pos    = polarToCartesian(cx, cy, orbitR, angle)
      return { match, planet, angle, pos }
    }),
    [matches, angles, cx, cy, orbitR],
  )

  return (
    <div
      className="relative select-none"
      style={{ width: size, height: size, maxWidth: '100%' }}
    >
      {/* SVG layer  -  orbit ring + beam lines */}
      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        aria-hidden="true"
      >
        {/* Orbit ring */}
        <circle
          cx={cx} cy={cy} r={orbitR}
          fill="none"
          stroke="rgba(167,139,250,0.08)"
          strokeWidth={1}
          strokeDasharray="2 8"
        />

        {/* Beam lines: hub edge → node center */}
        {nodes.map(({ match, pos }) => {
          if (!match) return null
          const color    = orbitColorHex(match.orbitColor)
          const isActive = match.planetId === activeId
          // Start beam from hub edge (not center)
          const ang = Math.atan2(pos.y - cy, pos.x - cx)
          return (
            <BeamLine
              key={match.planetId}
              x1={cx + Math.cos(ang) * hubR}
              y1={cy + Math.sin(ang) * hubR}
              x2={pos.x}
              y2={pos.y}
              color={color}
              strength={match.score}
              isActive={isActive}
            />
          )
        })}
      </svg>

      {/* Center hub  -  source planet */}
      <button
        className="absolute flex items-center justify-center rounded-full"
        style={{
          left: cx - hubR, top: cy - hubR,
          width: hubR * 2, height: hubR * 2,
          background: `radial-gradient(circle at 38% 35%, ${sourcePlanet.visual.coreColor}cc 0%, ${sourcePlanet.visual.coreColor}44 55%, transparent 100%)`,
          border: `2px solid ${sourcePlanet.visual.coreColor}55`,
          boxShadow: `0 0 0 8px ${sourcePlanet.visual.coreColor}08, 0 0 32px ${sourcePlanet.visual.coreColor}30`,
          fontSize: 26,
          color: sourcePlanet.visual.coreColor,
          cursor: 'default',
          outline: 'none',
        }}
        onClick={() => onSelect(null)}
        aria-label={`${sourcePlanet.name}  -  your planet`}
      >
        {sourcePlanet.avatarSymbol}
      </button>

      {/* "Your planet" label */}
      <div
        className="absolute text-[9px] uppercase tracking-widest text-center"
        style={{
          left:  cx - 40,
          top:   cy + hubR + 6,
          width: 80,
          color: 'var(--ghost)',
          opacity: 0.5,
        }}
      >
        Your planet
      </div>

      {/* Orbiting planet nodes */}
      {nodes.map(({ match, planet, pos }) => {
        if (!planet) return null
        const isActive = match.planetId === activeId
        return (
          <ResonancePlanetNode
            key={match.planetId}
            match={match}
            planet={planet}
            isActive={isActive}
            onClick={() => onSelect(isActive ? null : match.planetId)}
            style={{ left: pos.x, top: pos.y }}
          />
        )
      })}
    </div>
  )
}
