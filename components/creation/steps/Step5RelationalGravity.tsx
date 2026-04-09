import { MATCH_PREF_OPTIONS, CONNECTION_TYPE_OPTIONS } from '@/types/creation'

// ─── Step5RelationalGravity ───────────────────────────────────────────────────
// Match preference (3 cards) + connection type multi-select.
// Shapes how the resonance engine weighs similar vs complementary planets.

interface Props {
  matchPreference?:          'similar' | 'complementary' | 'mixed'
  connectionTypes:           string[]
  onMatchPrefChange:         (v: 'similar' | 'complementary' | 'mixed') => void
  onConnectionTypesChange:   (types: string[]) => void
}

export default function Step5RelationalGravity({
  matchPreference,
  connectionTypes,
  onMatchPrefChange,
  onConnectionTypesChange,
}: Props) {
  function toggleConnection(key: string) {
    if (connectionTypes.includes(key)) {
      onConnectionTypesChange(connectionTypes.filter((k) => k !== key))
    } else {
      onConnectionTypesChange([...connectionTypes, key])
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Set the gravity of the connections you want
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
          This shapes how the resonance field aligns planets for you. It is a tendency, not a rule —
          you can always change it.
        </p>
      </div>

      {/* Match preference */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          Your orbit tendency
        </span>
        <div className="flex flex-col gap-2">
          {MATCH_PREF_OPTIONS.map((opt) => {
            const active = matchPreference === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onMatchPrefChange(opt.key)}
                className="flex items-start gap-4 p-4 rounded-2xl text-left transition-all duration-200"
                style={{
                  background: active ? `${opt.color}10` : 'rgba(255,255,255,0.025)',
                  border: active
                    ? `1.5px solid ${opt.color}38`
                    : '1.5px solid rgba(167,139,250,0.10)',
                  outline: 'none',
                }}
              >
                {/* Symbol orb */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 mt-0.5"
                  style={{
                    background: active ? `${opt.color}18` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? opt.color : 'rgba(167,139,250,0.12)'}44`,
                    color: active ? opt.color : 'rgba(167,139,250,0.35)',
                  }}
                >
                  {opt.symbol}
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: active ? opt.color : 'var(--foreground)' }}
                  >
                    {opt.label}
                  </span>
                  <span className="text-xs leading-snug" style={{ color: 'var(--ink)', opacity: active ? 0.8 : 0.55 }}>
                    {opt.description}
                  </span>
                </div>

                {active && (
                  <div
                    className="ml-auto w-2 h-2 rounded-full shrink-0 mt-1.5"
                    style={{ background: opt.color, boxShadow: `0 0 8px ${opt.color}` }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Connection types */}
      <div className="flex flex-col gap-3">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          What you are open to
        </span>
        <div className="flex flex-col gap-1.5">
          {CONNECTION_TYPE_OPTIONS.map((opt) => {
            const active = connectionTypes.includes(opt.key)
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggleConnection(opt.key)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200"
                style={{
                  background: active ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.02)',
                  border: active
                    ? '1px solid rgba(167,139,250,0.32)'
                    : '1px solid rgba(167,139,250,0.08)',
                  outline: 'none',
                }}
              >
                {/* Checkbox proxy */}
                <div
                  className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-all duration-150"
                  style={{
                    background: active ? 'var(--star)' : 'transparent',
                    border: active ? '1px solid var(--star)' : '1px solid rgba(167,139,250,0.25)',
                  }}
                >
                  {active && <span className="text-[10px] leading-none font-bold text-black">✓</span>}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-medium" style={{ color: active ? 'var(--foreground)' : 'var(--ink)' }}>
                    {opt.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
                    {opt.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
