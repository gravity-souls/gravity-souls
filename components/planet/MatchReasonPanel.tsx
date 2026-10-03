import type { PlanetProfile } from '@/types/planet'
import type { ResonancePlanet } from '@/types/planet'
import { useTranslations } from 'next-intl'
import { themeLabel } from '@/lib/planet-labels'

// --- Beam colour map (mirrors lib/match.ts) ----------------------------------
// `type` keys the matchReasonPanel.* translation lookups below (e.g.
// `${type}Resonance`, `${type}Description`) — not display text itself.

const BEAM_META: Record<string, { type: 'emotion' | 'interest' | 'thought' | 'lifestyle'; color: string }> = {
  violet: { type: 'emotion',   color: '#a78bfa' },
  teal:   { type: 'interest',  color: '#34d399' },
  amber:  { type: 'thought',   color: '#fbbf24' },
  blue:   { type: 'lifestyle', color: '#60a5fa' },
}

// --- Strength ring -----------------------------------------------------------

function StrengthRing({
  value,
  color,
}: {
  value: number
  color: string
}) {
  const r = 22
  const circumference = 2 * Math.PI * r
  const filled = (value / 100) * circumference

  return (
    <svg width={56} height={56} viewBox="0 0 56 56" aria-hidden="true">
      <defs>
        <filter id="ring-glow-match">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track */}
      <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
      {/* Fill */}
      <circle
        cx={28} cy={28} r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        strokeDashoffset={circumference * 0.25}   /* start at top */
        filter="url(#ring-glow-match)"
        opacity={0.85}
      />
      {/* Value text */}
      <text
        x={28} y={32}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill={color}
      >
        {value}
      </text>
    </svg>
  )
}

// --- MatchReasonPanel ---------------------------------------------------------

interface Props {
  match: ResonancePlanet
  /** The planet being viewed */
  targetPlanet: PlanetProfile
}

export default function MatchReasonPanel({ match, targetPlanet }: Props) {
  const t = useTranslations('matchReasonPanel')
  const tCreation = useTranslations('creationSteps')
  const meta = BEAM_META[match.beamColor] ?? BEAM_META.teal
  const { coreColor } = targetPlanet.visual

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: `linear-gradient(135deg, ${meta.color}0a 0%, rgba(12,8,36,0.80) 100%)`,
        border: `1px solid ${meta.color}28`,
      }}
    >
      {/* Atmospheric top shimmer */}
      <div
        className="absolute top-0 left-4 right-4 h-px pointer-events-none"
        aria-hidden="true"
        style={{
          background: `linear-gradient(90deg, transparent, ${meta.color}60, transparent)`,
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}35`,
            color: meta.color,
          }}
        >
          ⊛
        </div>
        <div>
          <p
            className="text-[10px] uppercase tracking-widest font-medium"
            style={{ color: 'var(--star)', opacity: 0.55 }}
          >
            {t('whyYouResonate')}
          </p>
          <p
            className="text-sm font-semibold"
            style={{ color: meta.color }}
          >
            {t(`${meta.type}Resonance`)}
          </p>
        </div>

        {/* Strength ring  -  pushed to right */}
        <div className="ml-auto shrink-0">
          <StrengthRing value={match.strength} color={meta.color} />
        </div>
      </div>

      {/* Reason description */}
      <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.72 }}>
        {t(`${meta.type}Description`) + (
          match.strength >= 70
            ? t('strongSignal')
            : match.strength >= 45
            ? t('commonGround')
            : t('quietConnection')
        )}
      </p>

      {/* Shared themes if any */}
      {targetPlanet.coreThemes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span
            className="text-[10px] uppercase tracking-widest self-center"
            style={{ color: 'var(--ghost)' }}
          >
            {t('sharedTerritory')}
          </span>
          {targetPlanet.coreThemes.slice(0, 3).map((theme) => (
            <span
              key={theme}
              className="text-[10px] px-2 py-0.5 rounded-md tracking-wide"
              style={{
                background: `${coreColor}10`,
                border: `1px solid ${coreColor}25`,
                color: coreColor,
              }}
            >
              {themeLabel(tCreation, theme)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
