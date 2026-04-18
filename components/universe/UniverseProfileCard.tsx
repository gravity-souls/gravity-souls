import OrbitCard from '@/components/ui/OrbitCard'
import GlassCard from '@/components/ui/GlassCard'
import Tag from '@/components/ui/Tag'
import { toneDescriptions, styleDescriptions, driftDescriptions, toneColor } from '@/lib/mock-data'
import type { Universe } from '@/types/universe'

interface Props {
  universe: Universe
}

export default function UniverseProfileCard({ universe: u }: Props) {
  const glowColor = toneColor[u.emotionTone]

  return (
    <div className="flex flex-col gap-5">

      {/* -- Hero OrbitCard ---------------------------------------------- */}
      <OrbitCard glowColor={glowColor} hoverable lift ringed className="p-7 sm:p-9">

        {/* Ambient background nebula inside the card */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              top: '-20%', right: '-10%',
              width: '55%', height: '140%',
              background: `radial-gradient(ellipse, ${glowColor}14 0%, transparent 65%)`,
              filter: 'blur(30px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-30%', left: '-10%',
              width: '45%', height: '120%',
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.09) 0%, transparent 65%)',
              filter: 'blur(24px)',
            }}
          />
        </div>

        <div className="relative flex items-start justify-between gap-6" style={{ zIndex: 1 }}>

          {/* Left: identity */}
          <div className="flex flex-col gap-4 min-w-0">
            <span
              className="text-xs font-medium tracking-[0.35em] uppercase"
              style={{ color: 'var(--star)', opacity: 0.5 }}
            >
              Universe profile
            </span>

            <div>
              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight leading-none"
                style={{
                  background: `linear-gradient(135deg, #e8e0ff 0%, ${glowColor} 55%, #818cf8 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {u.name}
              </h1>
              {u.tagline && (
                <p className="mt-2 text-sm italic leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.65 }}>
                  &ldquo;{u.tagline}&rdquo;
                </p>
              )}
            </div>

            {/* Frequency signature chips */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {[
                { label: u.emotionTone,     color: glowColor },
                { label: u.expressionStyle, color: '#818cf8' },
                { label: u.driftDirection,  color: '#6366f1' },
              ].map(({ label, color }, i) => (
                <span key={label} className="flex items-center gap-x-3">
                  <span
                    className="text-xs font-semibold tracking-widest uppercase"
                    style={{ color, textShadow: `0 0 10px ${color}66` }}
                  >
                    {label}
                  </span>
                  {i < 2 && (
                    <span style={{ color: 'var(--ghost)', opacity: 0.35 }} className="text-xs">·</span>
                  )}
                </span>
              ))}
            </div>

            {/* Core themes */}
            <div className="flex flex-wrap gap-2 pt-1">
              {u.coreThemes.map((theme) => (
                <Tag key={theme} label={theme} variant="accent" />
              ))}
            </div>
          </div>

          {/* Right: floating avatar orb */}
          <div
            className="shrink-0 hidden sm:flex items-center justify-center animate-float"
            aria-hidden="true"
          >
            {/* Outer ring */}
            <div
              className="absolute orbit-ring animate-spin-slow"
              style={{
                width: 96, height: 96,
                borderColor: `${glowColor}18`,
              }}
            />
            {/* Orb */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center relative"
              style={{
                background: `radial-gradient(circle at 38% 32%, ${glowColor}55, ${glowColor}18, transparent 80%)`,
                boxShadow: `0 0 0 1px ${glowColor}28, 0 0 32px ${glowColor}38, 0 0 80px ${glowColor}18`,
              }}
            >
              <span
                className="text-4xl leading-none select-none"
                style={{
                  color: glowColor,
                  textShadow: `0 0 20px ${glowColor}cc, 0 0 45px ${glowColor}66`,
                }}
              >
                {u.avatarSymbol}
              </span>
            </div>
          </div>
        </div>
      </OrbitCard>

      {/* -- Attribute trio ---------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { key: 'Emotion tone',     value: u.emotionTone,     desc: toneDescriptions[u.emotionTone],     accent: glowColor },
          { key: 'Expression style', value: u.expressionStyle, desc: styleDescriptions[u.expressionStyle], accent: '#818cf8' },
          { key: 'Drift direction',  value: u.driftDirection,  desc: driftDescriptions[u.driftDirection] ?? '', accent: '#6366f1' },
        ].map(({ key, value, desc, accent }) => (
          <GlassCard key={key} className="flex flex-col gap-2">
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: accent, opacity: 0.6 }}
            >
              {key}
            </span>
            <p
              className="text-sm font-semibold capitalize"
              style={{ color: 'var(--foreground)', textShadow: `0 0 12px ${accent}44` }}
            >
              {value}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>{desc}</p>
          </GlassCard>
        ))}
      </div>

      {/* -- Generated summary ------------------------------------------- */}
      <div
        className="rounded-2xl p-6 sm:p-7 flex flex-col gap-4"
        style={{
          background: `linear-gradient(135deg, rgba(28,24,72,0.45) 0%, rgba(12,10,42,0.38) 100%)`,
          border: `1px solid ${glowColor}18`,
          borderLeft: `2px solid ${glowColor}66`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: 'var(--star)', opacity: 0.5 }}
          >
            Gravity-Souls analysis
          </span>
          <span
            className="text-xs tracking-widest uppercase font-medium"
            style={{ color: glowColor, opacity: 0.45 }}
          >
            generated
          </span>
        </div>
        <p
          className="text-sm leading-8 font-light"
          style={{ color: 'var(--ink)', opacity: 0.72 }}
        >
          {u.summary ?? u.resonanceReason}
        </p>
      </div>
    </div>
  )
}
