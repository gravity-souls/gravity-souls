import type { CommunicationStyle } from '@/types/planet'
import { COMM_STYLE_OPTIONS } from '@/types/creation'

// ─── Step3AtmosphereStyle ─────────────────────────────────────────────────────
// Communication style picker + two cognitive axis sliders.
// CommunicationStyle → atmosphere halos in PlanetScene.
// abstractAxis + introspectiveAxis → cognitiveAxes used by matching engine.

interface Props {
  communicationStyle?: CommunicationStyle
  abstractAxis:        number  // 0–100
  introspectiveAxis:   number  // 0–100
  onStyleChange:       (s: CommunicationStyle) => void
  onAbstractChange:    (v: number) => void
  onIntrospectiveChange: (v: number) => void
}

// ─── Axis slider ──────────────────────────────────────────────────────────────

function AxisSlider({
  value,
  onChange,
  labelLeft,
  labelRight,
  color = 'var(--star)',
}: {
  value:      number
  onChange:   (v: number) => void
  labelLeft:  string
  labelRight: string
  color?:     string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex items-center">
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${color}55 0%, ${color} ${value}%, rgba(255,255,255,0.08) ${value}%, rgba(255,255,255,0.08) 100%)`,
            // WebKit thumb
            WebkitAppearance: 'none',
          } as React.CSSProperties}
        />
      </div>
      <div className="flex justify-between text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
    </div>
  )
}

// ─── Step component ───────────────────────────────────────────────────────────

export default function Step3AtmosphereStyle({
  communicationStyle,
  abstractAxis,
  introspectiveAxis,
  onStyleChange,
  onAbstractChange,
  onIntrospectiveChange,
}: Props) {
  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Define how others feel your atmosphere
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
          This shapes the halo and texture of your planet — how it projects outward into the field
          before anyone reaches the surface.
        </p>
      </div>

      {/* Communication style */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          How you communicate
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {COMM_STYLE_OPTIONS.map((opt) => {
            const active = communicationStyle === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onStyleChange(opt.key)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: active ? 'rgba(167,139,250,0.12)' : 'rgba(255,255,255,0.025)',
                  border: active
                    ? '1px solid rgba(167,139,250,0.38)'
                    : '1px solid rgba(167,139,250,0.10)',
                  outline: 'none',
                }}
              >
                <span
                  className="text-lg w-6 text-center shrink-0"
                  style={{ color: active ? 'var(--star)' : 'rgba(167,139,250,0.4)', fontFamily: 'monospace' }}
                >
                  {opt.symbol}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-semibold" style={{ color: active ? 'var(--foreground)' : 'var(--ink)' }}>
                    {opt.label}
                  </span>
                  <span className="text-[10px] leading-snug" style={{ color: 'var(--ghost)', opacity: 0.65 }}>
                    {opt.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Cognitive axes */}
      <div className="flex flex-col gap-5">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          Cognitive signature
        </span>

        <div className="flex flex-col gap-4">
          <AxisSlider
            value={abstractAxis}
            onChange={onAbstractChange}
            labelLeft="Concrete"
            labelRight="Abstract"
            color="#60a5fa"
          />
          <AxisSlider
            value={introspectiveAxis}
            onChange={onIntrospectiveChange}
            labelLeft="Outward"
            labelRight="Introspective"
            color="#a78bfa"
          />
        </div>

        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--ghost)', opacity: 0.5 }}>
          These are not types or boxes. They describe your current centre of gravity — and they
          shape how the resonance engine reads your planet against others.
        </p>
      </div>
    </div>
  )
}
