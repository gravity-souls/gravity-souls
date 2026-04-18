import type { Lifestyle } from '@/types/planet'
import { THEME_OPTIONS, LIFESTYLE_OPTIONS } from '@/types/creation'

// --- Step2InterestEcology -----------------------------------------------------
// Theme multi-select (up to 5) + lifestyle choice.
// Themes map to biome bands in PlanetScene; lifestyle sets satellite count.

interface Props {
  selectedThemes:    string[]
  lifestyle?:        Lifestyle
  onThemesChange:    (themes: string[]) => void
  onLifestyleChange: (l: Lifestyle) => void
}

const MAX_THEMES = 5

export default function Step2InterestEcology({
  selectedThemes,
  lifestyle,
  onThemesChange,
  onLifestyleChange,
}: Props) {
  function toggleTheme(key: string) {
    if (selectedThemes.includes(key)) {
      onThemesChange(selectedThemes.filter((t) => t !== key))
    } else if (selectedThemes.length < MAX_THEMES) {
      onThemesChange([...selectedThemes, key])
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          Choose what shapes your surface
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
          Select up to {MAX_THEMES} themes that feel like yours. These become the terrain bands of
          your planet  -  the ecology others sense when they enter your orbit.
        </p>
      </div>

      {/* Theme grid */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
            Core themes
          </span>
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--ghost)', opacity: 0.5 }}>
            {selectedThemes.length} / {MAX_THEMES}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {THEME_OPTIONS.map((opt) => {
            const active  = selectedThemes.includes(opt.key)
            const blocked = !active && selectedThemes.length >= MAX_THEMES
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => !blocked && toggleTheme(opt.key)}
                disabled={blocked}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all duration-200"
                style={{
                  background: active ? `${opt.color}18` : 'rgba(255,255,255,0.03)',
                  border: active
                    ? `1px solid ${opt.color}45`
                    : '1px solid rgba(167,139,250,0.10)',
                  opacity: blocked ? 0.35 : 1,
                  cursor: blocked ? 'not-allowed' : 'pointer',
                  outline: 'none',
                }}
                title={opt.description}
              >
                {/* Color dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: active ? opt.color : 'rgba(167,139,250,0.25)',
                    boxShadow: active ? `0 0 6px ${opt.color}` : undefined,
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: active ? opt.color : 'var(--ink)', opacity: active ? 1 : 0.7 }}
                >
                  {opt.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Lifestyle picker */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          Habitat pattern
        </span>
        <div className="grid grid-cols-2 gap-2">
          {LIFESTYLE_OPTIONS.map((opt) => {
            const active = lifestyle === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => onLifestyleChange(opt.key)}
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
                  className="text-lg shrink-0"
                  style={{ color: active ? 'var(--star)' : 'rgba(167,139,250,0.4)' }}
                >
                  {opt.symbol}
                </span>
                <div className="flex flex-col gap-0">
                  <span className="text-xs font-semibold" style={{ color: active ? 'var(--foreground)' : 'var(--ink)' }}>
                    {opt.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.65 }}>
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
