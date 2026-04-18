// --- CreationProgress ---------------------------------------------------------
// Step dots + current step title shown at the top of the ritual.

const STEP_LABELS = [
  'Emotional tone',
  'Interest ecology',
  'Atmosphere',
  'Cultural paths',
  'Relational gravity',
]

interface Props {
  step: number   // 1–5
  total?: number
}

export default function CreationProgress({ step, total = 5 }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {/* Dots */}
      <div className="flex items-center gap-2">
        {Array.from({ length: total }, (_, i) => {
          const n       = i + 1
          const done    = n < step
          const current = n === step
          return (
            <div key={n} className="flex items-center gap-2">
              <div
                className="rounded-full transition-all duration-500"
                style={{
                  width:  current ? 20 : done ? 8 : 6,
                  height: current ? 6  : done ? 8 : 6,
                  background: current
                    ? 'var(--star)'
                    : done
                    ? 'rgba(167,139,250,0.55)'
                    : 'rgba(167,139,250,0.15)',
                  boxShadow: current ? '0 0 8px var(--star)' : undefined,
                }}
              />
              {/* Connector line between dots */}
              {n < total && (
                <div
                  className="h-px transition-all duration-500"
                  style={{
                    width: 20,
                    background: done
                      ? 'rgba(167,139,250,0.4)'
                      : 'rgba(167,139,250,0.1)',
                  }}
                />
              )}
            </div>
          )
        })}

        {/* Step counter */}
        <span
          className="ml-auto text-[10px] uppercase tracking-widest tabular-nums"
          style={{ color: 'var(--ghost)', opacity: 0.6 }}
        >
          {step} / {total}
        </span>
      </div>

      {/* Current step label */}
      <p
        className="text-xs uppercase tracking-[0.22em] font-medium"
        style={{ color: 'var(--star)', opacity: 0.65 }}
      >
        {STEP_LABELS[step - 1]}
      </p>
    </div>
  )
}
