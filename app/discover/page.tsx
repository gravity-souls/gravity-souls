'use client'

import GlowButton from '@/components/ui/GlowButton'
import OrbitCard from '@/components/ui/OrbitCard'
import ResonanceLine from '@/components/ui/ResonanceLine'
import Tag from '@/components/ui/Tag'
import LightCone from '@/components/fx/LightCone'
import { matchedUniverses, toneColor, type MatchType } from '@/lib/mock-data'
import type { Universe } from '@/types/universe'
import { useLanguage } from '@/contexts/language-context'
import { t } from '@/lib/translations'

// --- Section config -----------------------------------------------------------

const sectionConfig: Record<
  MatchType,
  { label: string; sublabel: string; accentColor: string; scoreGradient: string }
> = {
  similar: {
    label:         'Similar',
    sublabel:      'Universes that resonate with your core frequency',
    accentColor:   '#818cf8',
    scoreGradient: 'linear-gradient(90deg, #6366f1, #a78bfa)',
  },
  complementary: {
    label:         'Complementary',
    sublabel:      'Universes that carry what you hold in reserve',
    accentColor:   '#34d399',
    scoreGradient: 'linear-gradient(90deg, #059669, #34d399)',
  },
  distant: {
    label:         'Distant',
    sublabel:      'Far orbit  -  a different kind of mirror',
    accentColor:   '#fbbf24',
    scoreGradient: 'linear-gradient(90deg, #d97706, #fbbf24)',
  },
}

const ORDER: MatchType[] = ['similar', 'complementary', 'distant']

const grouped = ORDER.reduce<Record<MatchType, Universe[]>>(
  (acc, type) => ({ ...acc, [type]: matchedUniverses.filter((u) => u.matchType === type) }),
  { similar: [], complementary: [], distant: [] },
)

// --- ResonanceBar -------------------------------------------------------------

function ResonanceBar({ score, gradient }: { score: number; gradient: string }) {
  const labelColor = gradient.includes('6366f1') ? '#818cf8'
    : gradient.includes('059669') ? '#34d399'
    : '#fbbf24'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: gradient, transition: 'width 0.8s ease' }}
        />
      </div>
      <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: labelColor }}>
        {score}%
      </span>
    </div>
  )
}

// --- Universe match card ------------------------------------------------------

function UniverseCard({ universe, cfg }: { universe: Universe; cfg: typeof sectionConfig.similar }) {
  const symbolColor = toneColor[universe.emotionTone]

  return (
    <OrbitCard
      hoverable
      lift
      glowColor={cfg.accentColor}
      className="flex flex-col gap-5 p-6"
    >
      {/* Top row: symbol orb + name */}
      <div className="flex items-start gap-4">
        <div
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center"
          style={{
            background: `radial-gradient(circle at 38% 32%, ${symbolColor}38, ${symbolColor}10)`,
            boxShadow: `0 0 0 1px ${symbolColor}28, 0 0 18px ${symbolColor}20`,
          }}
        >
          <span
            className="text-xl leading-none select-none"
            style={{ color: symbolColor, textShadow: `0 0 12px ${symbolColor}aa` }}
          >
            {universe.avatarSymbol}
          </span>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h3 className="text-base font-bold leading-tight" style={{ color: 'var(--foreground)' }}>
            {universe.name}
          </h3>
          {universe.tagline && (
            <p className="text-xs italic leading-snug truncate" style={{ color: 'var(--ink)', opacity: 0.65 }}>
              &ldquo;{universe.tagline}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      {universe.summary && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.7 }}>
          {universe.summary}
        </p>
      )}

      {/* Core themes */}
      <div className="flex flex-wrap gap-1.5">
        {universe.coreThemes.map((theme) => (
          <Tag key={theme} label={theme} variant="dim" />
        ))}
      </div>

      {/* Resonance reason */}
      <div
        className="rounded-xl p-4 flex flex-col gap-2"
        style={{
          background: `${cfg.accentColor}0c`,
          borderLeft: `2px solid ${cfg.accentColor}55`,
          backdropFilter: 'blur(6px)',
        }}
      >
        <span
          className="text-xs tracking-widest uppercase"
          style={{ color: cfg.accentColor, opacity: 0.6 }}
        >
          Why you resonate
        </span>
        <p className="text-sm leading-relaxed italic" style={{ color: 'var(--ink)', opacity: 0.75 }}>
          {universe.resonanceReason}
        </p>
      </div>

      {/* Score bar */}
      {universe.resonanceScore !== undefined && (
        <ResonanceBar score={universe.resonanceScore} gradient={cfg.scoreGradient} />
      )}
    </OrbitCard>
  )
}

// --- Page ---------------------------------------------------------------------

export default function DiscoverPage() {
  const { lang } = useLanguage()

  return (
    <div className="min-h-screen px-6 pt-8 pb-16 max-w-4xl mx-auto">

      {/* Subtle left-edge light cone */}
      <LightCone origin="top-left" color="rgba(129,140,248,1)" opacity={0.07} double={false} />

      <div className="relative z-10 flex flex-col gap-14 animate-fade-up">

        {/* -- Page header ------------------------------------------------- */}
        <div className="flex flex-col gap-3">
          <span
            className="text-xs font-medium tracking-[0.3em] uppercase"
            style={{ color: 'var(--star)', opacity: 0.6 }}
          >
            Resonance map
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
            {t(lang, 'discover.title').split('Velaris-9').map((part, i) => (
              <span key={i}>
                {part}
                {i === 0 && <span className="text-gradient">Velaris-9</span>}
              </span>
            ))}
          </h1>
          <p className="text-sm max-w-lg leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.7 }}>
            {t(lang, 'discover.subtitle')}
          </p>
        </div>

        {/* -- Grouped sections ------------------------------------------- */}
        {ORDER.map((type, sectionIdx) => {
          const universes = grouped[type]
          if (universes.length === 0) return null
          const cfg = sectionConfig[type]

          return (
            <section key={type} className="flex flex-col gap-5">

              {/* ResonanceLine above each section (skip the first) */}
              {sectionIdx > 0 && (
                <div className="-mt-6 mb-2">
                  <ResonanceLine matchType={type} strength={65} />
                </div>
              )}

              {/* Section header */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold tracking-[0.25em] uppercase"
                      style={{ color: cfg.accentColor }}
                    >
                      {cfg.label}
                    </span>
                    {/* Pulsing dot */}
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{
                        background: cfg.accentColor,
                        boxShadow: `0 0 8px ${cfg.accentColor}`,
                      }}
                    />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
                    {cfg.sublabel}
                  </p>
                </div>

                {/* Section divider beam */}
                <div
                  className="flex-1 h-px"
                  style={{
                    background: `linear-gradient(90deg, ${cfg.accentColor}38, transparent)`,
                    boxShadow: `0 0 6px ${cfg.accentColor}18`,
                  }}
                />
              </div>

              {/* Cards  -  2-col for similar/complementary, 1-col for distant */}
              <div
                className={
                  universes.length > 1
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    : 'grid grid-cols-1 gap-4'
                }
              >
                {universes.map((universe) => (
                  <UniverseCard key={universe.id} universe={universe} cfg={cfg} />
                ))}
              </div>
            </section>
          )
        })}

        {/* -- Footer CTA -------------------------------------------------- */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-[rgba(167,139,250,0.08)]">
          <GlowButton href="/create-universe" variant="primary" className="py-4 text-sm">
            Create your own universe
          </GlowButton>
          <GlowButton href="/universe/demo" variant="secondary" className="py-4 text-sm">
            View demo profile
          </GlowButton>
        </div>
      </div>
    </div>
  )
}
