import type { CSSProperties } from 'react'
import type { PlanetProfile, CommunicationStyle, ExplorationTrace } from '@/types/planet'

// ─── Theme → biome color ───────────────────────────────────────────────────

const THEME_COLOR: Record<string, string> = {
  'night & silence':      '#4338ca',
  'memory':               '#818cf8',
  'dream logic':          '#c4b5fd',
  'emotional texture':    '#f97316',
  'visual sensation':     '#2dd4bf',
  'inner structure':      '#60a5fa',
  'solitude & connection':'#34d399',
  'inner drift':          '#94a3b8',
  'unformed thoughts':    '#64748b',
}

function getThemeColor(theme: string): string {
  return THEME_COLOR[theme] ?? '#a78bfa'
}

// ─── Atmosphere halo character by communication style ──────────────────────

interface HaloConfig {
  rings: number
  spread: number   // px beyond planet edge
  opacity: number
  blur: number
}

const HALO_CONFIG: Record<CommunicationStyle, HaloConfig> = {
  direct:     { rings: 1, spread: 14, opacity: 0.45, blur: 6 },
  analytical: { rings: 2, spread: 18, opacity: 0.35, blur: 4 },
  poetic:     { rings: 3, spread: 32, opacity: 0.28, blur: 14 },
  reflective: { rings: 2, spread: 28, opacity: 0.22, blur: 18 },
  playful:    { rings: 3, spread: 22, opacity: 0.38, blur: 10 },
}

// ─── Sub-components ────────────────────────────────────────────────────────

function AtmosphereHalos({
  size,
  coreColor,
  style,
}: {
  size: number
  coreColor: string
  style: CommunicationStyle
}) {
  const cfg = HALO_CONFIG[style]
  return (
    <>
      {Array.from({ length: cfg.rings }).map((_, i) => {
        const spread = cfg.spread * (i + 1) * 0.7
        const haloSize = size + spread * 2
        const opacity = cfg.opacity * (1 - i * 0.25)
        return (
          <div
            key={i}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: haloSize,
              height: haloSize,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${coreColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
              filter: `blur(${cfg.blur + i * 4}px)`,
            }}
          />
        )
      })}
    </>
  )
}

function BiomeBands({
  size,
  coreColor,
  accentColor,
  themes,
}: {
  size: number
  coreColor: string
  accentColor: string
  themes: string[]
}) {
  // Each theme gets a radial blob at a different angular position on the sphere.
  // Positions are distributed evenly and slightly offset for organic feel.
  const positions = [
    { cx: '30%', cy: '25%' },
    { cx: '68%', cy: '55%' },
    { cx: '20%', cy: '68%' },
    { cx: '72%', cy: '22%' },
  ]

  const layers = themes.slice(0, 4).map((theme, i) => {
    const color = getThemeColor(theme)
    const pos = positions[i] ?? positions[0]
    return `radial-gradient(ellipse 55% 45% at ${pos.cx} ${pos.cy}, ${color}28 0%, transparent 60%)`
  })

  // Base planet gradient always last so it's underneath
  const base = `radial-gradient(circle at 35% 30%, ${accentColor}aa 0%, ${coreColor}66 40%, ${coreColor}22 70%, transparent 100%)`

  return (
    <div
      className="absolute inset-0 rounded-full"
      style={{ background: [...layers, base].join(', ') }}
    />
  )
}

function OrbitTraces({
  traces,
  size,
  coreColor,
}: {
  traces: ExplorationTrace[]
  size: number
  coreColor: string
}) {
  if (!traces.length) return null
  const canvasSize = size + 200

  return (
    <svg
      className="absolute pointer-events-none"
      width={canvasSize}
      height={canvasSize}
      viewBox={`0 0 ${canvasSize} ${canvasSize}`}
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      aria-hidden="true"
    >
      <defs>
        {traces.map((t, i) => (
          <filter key={`glow-${i}`} id={`trace-glow-${i}`}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>
      {traces.slice(0, 4).map((trace, i) => {
        const orbitOffset = 28 + i * 22
        const rx = (size / 2) + orbitOffset
        const ry = rx * 0.28
        const cx = canvasSize / 2
        const cy = canvasSize / 2
        // Dash length varies by trace count → busier orbit = more dashes
        const dash = Math.max(4, trace.count * 2)
        const gap = Math.max(8, 40 - trace.count * 2)
        return (
          <ellipse
            key={trace.planetType}
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={trace.color}
            strokeWidth="0.8"
            strokeOpacity={0.35 + i * 0.05}
            strokeDasharray={`${dash} ${gap}`}
            filter={`url(#trace-glow-${i})`}
          />
        )
      })}
    </svg>
  )
}

function SurfaceTexture({
  size,
  surfaceStyle,
  coreColor,
  accentColor,
}: {
  size: number
  surfaceStyle: string
  coreColor: string
  accentColor: string
}) {
  const textures: Record<string, string | undefined> = {
    cracked: `repeating-conic-gradient(${coreColor}08 0deg, transparent 3deg, transparent 8deg, ${coreColor}05 9deg)`,
    crystalline: `linear-gradient(135deg, ${accentColor}18 25%, transparent 25%, transparent 50%, ${accentColor}10 50%, ${accentColor}10 75%, transparent 75%)`,
    nebulous: `radial-gradient(ellipse at 60% 40%, ${accentColor}20 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, ${coreColor}15 0%, transparent 45%)`,
    smooth: undefined,
  }
  const bg = textures[surfaceStyle]
  if (!bg) return null
  return <div className="absolute inset-0 rounded-full" style={{ background: bg }} />
}

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
  const orbitRadius = planetSize * 0.6 + index * 22
  const dotSize = 6 - index * 0.9
  const duration = 20 + index * 8

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
        animationDelay: `-${(duration / Math.max(total, 1)) * index}s`,
      }}
      aria-hidden="true"
    >
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
          boxShadow: `0 0 ${dotSize * 2.5}px ${coreColor}`,
        }}
      />
    </div>
  )
}

// ─── PlanetScene ───────────────────────────────────────────────────────────

interface Props {
  planet: PlanetProfile
  /** Rendered diameter of the planet orb in px (default 300) */
  size?: number
  className?: string
  style?: CSSProperties
}

/**
 * PlanetScene — the large cinematic hero planet for /planet/[id] and /my-planet.
 *
 * Renders:
 *  - Outer nebula atmosphere (driven by communicationStyle)
 *  - Orbit trace rings (driven by explorationTraces)
 *  - Ring system (driven by ringStyle)
 *  - Planet orb with biome bands (driven by coreThemes) + surface texture
 *  - Satellite system
 *  - Avatar symbol at centre
 */
export default function PlanetScene({ planet, size = 300, className = '', style }: Props) {
  const { visual, communicationStyle, explorationTraces, coreThemes, avatarSymbol } = planet
  const { coreColor, accentColor, ringStyle, surfaceStyle, satelliteCount } = visual

  // Canvas needs room for: satellites + orbit traces + atmosphere halos
  const canvasSize = size + 200

  const ringCount = ringStyle === 'double' ? 2 : ringStyle === 'none' ? 0 : 1

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: canvasSize, height: canvasSize, ...style }}
    >
      {/* ── Outer atmosphere ──────────────────────────────────────────────── */}
      {communicationStyle && (
        <AtmosphereHalos size={size} coreColor={coreColor} style={communicationStyle} />
      )}

      {/* ── Exploration orbit traces ──────────────────────────────────────── */}
      {explorationTraces && explorationTraces.length > 0 && (
        <OrbitTraces traces={explorationTraces} size={size} coreColor={coreColor} />
      )}

      {/* ── Rings (behind planet) ─────────────────────────────────────────── */}
      {Array.from({ length: ringCount }).map((_, i) => {
        const gap = 14 + i * 18
        const w = size + gap * 2
        const h = size * 0.26 + i * 8
        if (ringStyle === 'broken') {
          const rx = w / 2
          const ry = h / 2
          return (
            <svg
              key={i}
              className="absolute pointer-events-none"
              width={w} height={h}
              viewBox={`0 0 ${w} ${h}`}
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <defs>
                <filter id={`rg-${i}`}>
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <ellipse cx={w/2} cy={h/2} rx={rx-2} ry={ry-1}
                fill="none" stroke={coreColor} strokeWidth="1.4" strokeOpacity="0.5"
                strokeDasharray={`${Math.PI*rx*0.6} ${Math.PI*rx*1.4}`}
                filter={`url(#rg-${i})`} />
              <ellipse cx={w/2} cy={h/2} rx={rx-2} ry={ry-1}
                fill="none" stroke={coreColor} strokeWidth="1.4" strokeOpacity="0.25"
                strokeDasharray={`${Math.PI*rx*0.32} ${Math.PI*rx*1.68}`}
                strokeDashoffset={Math.PI*rx*0.7}
                filter={`url(#rg-${i})`} />
            </svg>
          )
        }
        return (
          <svg
            key={i}
            className="absolute pointer-events-none"
            width={w} height={h}
            viewBox={`0 0 ${w} ${h}`}
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <defs>
              <filter id={`rg-${i}`}>
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            <ellipse cx={w/2} cy={h/2} rx={w/2-2} ry={h/2-1}
              fill="none" stroke={coreColor} strokeWidth="1.8"
              strokeOpacity={i === 0 ? 0.55 : 0.28}
              filter={`url(#rg-${i})`} />
          </svg>
        )
      })}

      {/* ── Planet orb ────────────────────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-center shrink-0 rounded-full animate-nebula-breathe"
        style={{
          width: size,
          height: size,
          boxShadow: [
            `0 0 0 1px ${coreColor}30`,
            `0 0 ${size * 0.25}px ${coreColor}44`,
            `0 0 ${size * 0.55}px ${coreColor}20`,
            `0 0 ${size * 1.0}px ${coreColor}08`,
          ].join(', '),
        }}
      >
        {/* Biome bands + base gradient */}
        <BiomeBands
          size={size}
          coreColor={coreColor}
          accentColor={accentColor}
          themes={coreThemes}
        />

        {/* Surface texture */}
        <SurfaceTexture
          size={size}
          surfaceStyle={surfaceStyle}
          coreColor={coreColor}
          accentColor={accentColor}
        />

        {/* Terminator shadow — adds depth to sphere */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at 72% 68%, rgba(0,0,0,0.45) 0%, transparent 55%)`,
          }}
        />

        {/* Centre symbol */}
        {avatarSymbol && (
          <span
            className="relative z-10 select-none leading-none"
            style={{
              fontSize: size * 0.22,
              color: accentColor,
              textShadow: `0 0 ${size * 0.15}px ${coreColor}cc`,
            }}
          >
            {avatarSymbol}
          </span>
        )}
      </div>

      {/* ── Satellites ────────────────────────────────────────────────────── */}
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
