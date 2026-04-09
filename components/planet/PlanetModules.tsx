import type { PlanetProfile } from '@/types/planet'

// ─── CognitiveStyleModule ─────────────────────────────────────────────────────
// 2-axis plot: abstract vs concrete (X), introspective vs outward (Y)

export function CognitiveStyleModule({ planet }: { planet: PlanetProfile }) {
  const { abstract, introspective } = planet.cognitiveAxes
  // Dot position: abstract=0→left, abstract=100→right; introspective=0→bottom, introspective=100→top
  const dotX = (abstract / 100) * 88 + 6   // 6%–94% of container width
  const dotY = ((100 - introspective) / 100) * 88 + 6

  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        Cognitive signature
      </span>

      {/* 2-axis field */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          height: 140,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(167,139,250,0.1)',
        }}
      >
        {/* Axis lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, rgba(167,139,250,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(167,139,250,0.06) 1px, transparent 1px)',
            backgroundSize: '25% 25%',
          }}
        />
        {/* Centre crosshair */}
        <div className="absolute" style={{ left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(167,139,250,0.12)' }} />
        <div className="absolute" style={{ top: '50%', left: 0, right: 0, height: 1, background: 'rgba(167,139,250,0.12)' }} />

        {/* Axis labels */}
        <span className="absolute text-[9px] uppercase tracking-widest" style={{ left: 6, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', opacity: 0.5 }}>concrete</span>
        <span className="absolute text-[9px] uppercase tracking-widest" style={{ right: 6, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', opacity: 0.5 }}>abstract</span>
        <span className="absolute text-[9px] uppercase tracking-widest" style={{ bottom: 4, left: '50%', transform: 'translateX(-50%)', color: 'var(--muted)', opacity: 0.5 }}>outward</span>
        <span className="absolute text-[9px] uppercase tracking-widest" style={{ top: 4, left: '50%', transform: 'translateX(-50%)', color: 'var(--muted)', opacity: 0.5 }}>inward</span>

        {/* Dot */}
        <div
          className="absolute"
          style={{
            left: `${dotX}%`,
            top: `${dotY}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Glow halo */}
          <div
            className="absolute rounded-full"
            style={{
              width: 24, height: 24,
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(circle, ${planet.visual.coreColor}40, transparent 70%)`,
            }}
          />
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{
              background: planet.visual.coreColor,
              boxShadow: `0 0 8px ${planet.visual.coreColor}, 0 0 16px ${planet.visual.coreColor}66`,
            }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs" style={{ color: 'var(--muted)', opacity: 0.6 }}>
        <span>Abstract {abstract}%</span>
        <span>Introspective {introspective}%</span>
      </div>
    </div>
  )
}

// ─── EmotionalFrequencyModule ─────────────────────────────────────────────────
// Vertical spectrum bars for each emotional dimension

export function EmotionalFrequencyModule({ planet }: { planet: PlanetProfile }) {
  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        Emotional frequency
      </span>

      <div className="flex gap-3 items-end" style={{ height: 100 }}>
        {planet.emotionalBars.map((bar) => (
          <div key={bar.label} className="flex-1 flex flex-col items-center gap-2">
            {/* Bar container */}
            <div
              className="w-full rounded-full relative overflow-hidden"
              style={{ height: 80, background: 'rgba(255,255,255,0.03)' }}
            >
              {/* Fill from bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 rounded-full"
                style={{
                  height: `${bar.value}%`,
                  background: `linear-gradient(to top, ${bar.color}, ${bar.color}55)`,
                  boxShadow: `0 0 8px ${bar.color}44`,
                  transition: 'height 0.8s ease',
                }}
              />
            </div>
            <span
              className="text-[9px] uppercase tracking-wider text-center leading-tight"
              style={{ color: bar.color, opacity: 0.75 }}
            >
              {bar.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ContentOrbit ─────────────────────────────────────────────────────────────
// Short text fragments arranged in a list with a subtle left-beam accent

export function ContentOrbit({ planet }: { planet: PlanetProfile }) {
  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        Thought fragments
      </span>

      <div className="flex flex-col gap-2">
        {planet.contentFragments.map((fragment, i) => (
          <div
            key={i}
            className="rounded-lg px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.025)',
              borderLeft: `2px solid ${planet.visual.coreColor}${i === 0 ? '88' : '44'}`,
            }}
          >
            <p
              className="text-sm leading-relaxed italic"
              style={{ color: 'var(--ink)', opacity: i === 0 ? 0.78 : 0.5 }}
            >
              &ldquo;{fragment}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ThemeCloud ────────────────────────────────────────────────────────────────

export function ThemeCloud({ planet }: { planet: PlanetProfile }) {
  return (
    <div className="flex flex-col gap-3">
      <span
        className="text-xs tracking-widest uppercase"
        style={{ color: 'var(--star)', opacity: 0.55 }}
      >
        Core themes
      </span>
      <div className="flex flex-wrap gap-2">
        {planet.coreThemes.map((theme) => (
          <span
            key={theme}
            className="px-3 py-1 rounded-full text-xs font-medium tracking-wide"
            style={{
              background: `${planet.visual.coreColor}12`,
              border: `1px solid ${planet.visual.coreColor}30`,
              color: planet.visual.coreColor,
            }}
          >
            {theme}
          </span>
        ))}
        <span
          className="px-3 py-1 rounded-full text-xs font-medium tracking-wide capitalize"
          style={{
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--star)',
          }}
        >
          {planet.mood}
        </span>
        <span
          className="px-3 py-1 rounded-full text-xs font-medium tracking-wide capitalize"
          style={{
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--star)',
          }}
        >
          {planet.lifestyle}
        </span>
      </div>
    </div>
  )
}
