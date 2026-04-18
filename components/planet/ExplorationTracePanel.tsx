import type { ExplorationTrace } from '@/types/planet'
import { relativeTime } from '@/lib/time'

// --- Single trace row ------------------------------------------------------

function TraceRow({ trace, maxCount }: { trace: ExplorationTrace; maxCount: number }) {
  const fillWidth = Math.round((trace.count / maxCount) * 100)

  return (
    <div className="flex items-center gap-3">
      {/* Glow dot */}
      <div
        className="shrink-0 w-2 h-2 rounded-full"
        style={{
          background: trace.color,
          boxShadow: `0 0 6px ${trace.color}, 0 0 14px ${trace.color}55`,
        }}
        aria-hidden="true"
      />

      {/* Label + bar */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm truncate" style={{ color: 'var(--ink)', opacity: 0.82 }}>
            {trace.label}
          </span>
          <span className="text-[10px] shrink-0" style={{ color: 'var(--ghost)' }}>
            {relativeTime(trace.recentAt)}
          </span>
        </div>

        {/* Count bar track */}
        <div
          className="relative h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${fillWidth}%`,
              background: `linear-gradient(to right, ${trace.color}55, ${trace.color}99)`,
              transition: 'width 0.7s ease',
            }}
          />
        </div>
      </div>

      {/* Count bubble */}
      <span
        className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{
          background: `${trace.color}14`,
          color: trace.color,
          border: `1px solid ${trace.color}25`,
          minWidth: 22,
          textAlign: 'center',
        }}
      >
        {trace.count}
      </span>
    </div>
  )
}

// --- ExplorationTracePanel ------------------------------------------------

interface Props {
  traces: ExplorationTrace[]
  /** Accent color for section heading */
  accentColor?: string
}

/**
 * ExplorationTracePanel  -  shows the planet archetypes this user has recently
 * explored, as glowing trail dots with labels and relative counts.
 *
 * Wrap in ProfileLayerSection with locked=true for Explorer viewers.
 */
export default function ExplorationTracePanel({ traces, accentColor = '#a78bfa' }: Props) {
  if (!traces || traces.length === 0) return null

  const maxCount = Math.max(...traces.map((t) => t.count))

  return (
    <div className="flex flex-col gap-3">
      {/* Intro line */}
      <p
        className="text-xs leading-relaxed"
        style={{ color: 'var(--ink)', opacity: 0.5 }}
      >
        Planet types this orbit has recently passed through:
      </p>

      {/* Trace rows */}
      <div className="flex flex-col gap-3">
        {traces.map((trace) => (
          <TraceRow key={trace.planetType} trace={trace} maxCount={maxCount} />
        ))}
      </div>
    </div>
  )
}
