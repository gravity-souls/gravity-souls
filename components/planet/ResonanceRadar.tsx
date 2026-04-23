'use client'

/**
 * ResonanceRadar — SVG-based pentagon/radar chart for the Resonance Overview section.
 * Shows 5–6 personality dimensions as vertices of a polygon.
 */

interface Dimension {
  label: string
  value: number // 0–100
}

interface Props {
  dimensions: Dimension[]
  /** Accent color for the filled polygon (default #a78bfa) */
  accentColor?: string
  /** Overall balance score displayed below the chart */
  balance?: number
  className?: string
}

const SIZE = 200
const CENTER = SIZE / 2
const RADIUS = 72

function polarToCartesian(angleDeg: number, r: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return [CENTER + r * Math.cos(rad), CENTER + r * Math.sin(rad)]
}

export default function ResonanceRadar({
  dimensions,
  accentColor = '#a78bfa',
  balance,
  className = '',
}: Props) {
  const n = dimensions.length
  const angleStep = 360 / n

  // Grid rings (3 concentric)
  const rings = [0.33, 0.66, 1.0]

  // Data polygon points
  const dataPoints = dimensions.map((d, i) => {
    const r = (d.value / 100) * RADIUS
    return polarToCartesian(i * angleStep, r)
  })
  const dataPath = dataPoints.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
        {/* Concentric grid rings */}
        {rings.map((scale) => {
          const pts = Array.from({ length: n }, (_, i) => polarToCartesian(i * angleStep, RADIUS * scale))
          const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ') + ' Z'
          return (
            <path
              key={scale}
              d={path}
              fill="none"
              stroke="rgba(167,139,250,0.12)"
              strokeWidth="0.8"
            />
          )
        })}

        {/* Axis lines from center to vertices */}
        {Array.from({ length: n }, (_, i) => {
          const [x, y] = polarToCartesian(i * angleStep, RADIUS)
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="rgba(167,139,250,0.08)"
              strokeWidth="0.8"
            />
          )
        })}

        {/* Data polygon fill */}
        <path
          d={dataPath}
          fill={`${accentColor}18`}
          stroke={accentColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map(([x, y], i) => (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={3}
            fill={accentColor}
            stroke="rgba(4,3,18,0.6)"
            strokeWidth="1"
          />
        ))}

        {/* Dimension labels */}
        {dimensions.map((d, i) => {
          const [x, y] = polarToCartesian(i * angleStep, RADIUS + 18)
          return (
            <text
              key={d.label}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--ghost)"
              fontSize="9"
              letterSpacing="0.05em"
              style={{ textTransform: 'capitalize' }}
            >
              {d.label}
            </text>
          )
        })}
      </svg>

      {/* Balance score */}
      {balance !== undefined && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
            Resonance balance
          </span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: accentColor }}>
            {balance}%
          </span>
        </div>
      )}
    </div>
  )
}
