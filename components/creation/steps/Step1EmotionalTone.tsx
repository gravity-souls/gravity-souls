import { CLIMATE_OPTIONS } from '@/types/creation'

// ─── Step1EmotionalTone ───────────────────────────────────────────────────────
// Mood / climate picker. Selecting a value immediately changes the planet's
// core color and surface texture in the live preview.

interface Props {
  value?: string
  onChange: (key: string) => void
}

export default function Step1EmotionalTone({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Set the climate of your world
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
          This is not your personality. It is the current weather of your inner world — the tone
          that shapes how your planet reads to others.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CLIMATE_OPTIONS.map((opt) => {
          const active = value === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className="relative flex flex-col gap-2 p-4 rounded-2xl text-left transition-all duration-200"
              style={{
                background: active ? `${opt.coreColor}14` : 'rgba(255,255,255,0.025)',
                border: active
                  ? `1.5px solid ${opt.coreColor}55`
                  : '1.5px solid rgba(167,139,250,0.10)',
                boxShadow: active ? `0 0 20px ${opt.coreColor}20` : undefined,
                outline: 'none',
              }}
            >
              {/* Active indicator */}
              {active && (
                <div
                  className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: opt.coreColor, boxShadow: `0 0 6px ${opt.coreColor}` }}
                />
              )}

              {/* Symbol */}
              <span
                className="text-2xl leading-none"
                style={{ color: active ? opt.coreColor : 'rgba(167,139,250,0.4)' }}
              >
                {opt.symbol}
              </span>

              {/* Label */}
              <span
                className="text-sm font-semibold"
                style={{ color: active ? opt.coreColor : 'var(--foreground)' }}
              >
                {opt.label}
              </span>

              {/* Description */}
              <span
                className="text-[11px] leading-snug"
                style={{ color: 'var(--ghost)', opacity: active ? 0.85 : 0.6 }}
              >
                {opt.description}
              </span>
            </button>
          )
        })}
      </div>

      {value && (
        <p className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.5 }}>
          Climate locked — you can change this any time from your planet settings.
        </p>
      )}
    </div>
  )
}
