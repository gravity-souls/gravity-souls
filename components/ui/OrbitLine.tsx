type Direction = 'horizontal' | 'vertical'

interface Props {
  direction?: Direction
  color?: string
  /** Total length in px — defaults to 100% via CSS */
  length?: number | string
  /** Centre orb visible at midpoint */
  orb?: boolean
  className?: string
}

/**
 * OrbitLine — a decorative gradient SVG divider with an optional centre orb.
 * Used as a section separator with the cosmic orbital metaphor.
 *
 *   <OrbitLine direction="horizontal" orb />
 *   <OrbitLine direction="vertical" length={80} color="#34d399" />
 */
export default function OrbitLine({
  direction = 'horizontal',
  color = '#a78bfa',
  length,
  orb = false,
  className = '',
}: Props) {
  const isH = direction === 'horizontal'

  if (isH) {
    return (
      <div
        className={`relative flex items-center ${className}`}
        style={{ width: length ?? '100%', height: 16 }}
        aria-hidden="true"
      >
        {/* Line */}
        <div
          className="absolute inset-x-0"
          style={{
            top: '50%',
            height: 1,
            background: `linear-gradient(90deg, transparent 0%, ${color}30 20%, ${color}55 50%, ${color}30 80%, transparent 100%)`,
            boxShadow: `0 0 6px ${color}20`,
          }}
        />

        {/* Centre orb */}
        {orb && (
          <div
            className="absolute left-1/2 top-1/2"
            style={{ transform: 'translate(-50%, -50%)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 6px ${color}, 0 0 12px ${color}55`,
              }}
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative flex justify-center ${className}`}
      style={{ height: length ?? 48, width: 16 }}
      aria-hidden="true"
    >
      {/* Vertical line */}
      <div
        className="absolute inset-y-0"
        style={{
          left: '50%',
          width: 1,
          background: `linear-gradient(180deg, transparent 0%, ${color}30 20%, ${color}55 50%, ${color}30 80%, transparent 100%)`,
          boxShadow: `0 0 6px ${color}20`,
        }}
      />

      {/* Centre orb */}
      {orb && (
        <div
          className="absolute top-1/2 left-1/2"
          style={{ transform: 'translate(-50%, -50%)' }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: color,
              boxShadow: `0 0 6px ${color}, 0 0 12px ${color}55`,
            }}
          />
        </div>
      )}
    </div>
  )
}
