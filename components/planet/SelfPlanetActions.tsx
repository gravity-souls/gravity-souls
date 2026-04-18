import Link from 'next/link'
import type { PlanetProfile } from '@/types/planet'

// --- Planet depth / completion --------------------------------------------

function computeDepthScore(planet: PlanetProfile): number {
  let score = 30 // base: planet exists
  if (planet.tagline)                       score += 10
  if (planet.location)                      score += 8
  if (planet.languages?.length)             score += 5
  if (planet.coreThemes.length >= 3)        score += 7
  if (planet.contentFragments.length >= 3)  score += 8
  if (planet.communicationStyle)            score += 7
  if (planet.travelCities?.length)          score += 5
  if (planet.musicTaste?.length)            score += 5
  if (planet.bookTaste?.length)             score += 5
  if (planet.galaxyIds?.length)             score += 5
  if (planet.explorationTraces?.length)     score += 5
  if (planet.sbtiType)                      score += 8
  return Math.min(100, score)
}

function DepthMeter({ score, coreColor }: { score: number; coreColor: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--ink)', opacity: 0.55 }}>Planet depth</span>
        <span style={{ color: coreColor, fontWeight: 600 }}>{score}%</span>
      </div>
      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            background: `linear-gradient(to right, ${coreColor}66, ${coreColor})`,
            boxShadow: `0 0 8px ${coreColor}44`,
          }}
        />
      </div>
    </div>
  )
}

// --- Action item -------------------------------------------------------------

function ActionItem({
  href,
  symbol,
  label,
  description,
  accent,
}: {
  href: string
  symbol: string
  label: string
  description: string
  accent: string
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 p-4 rounded-2xl transition-all duration-200"
      style={{
        background: `${accent}08`,
        border: `1px solid ${accent}20`,
        textDecoration: 'none',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = `${accent}12`
        el.style.borderColor = `${accent}35`
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.background = `${accent}08`
        el.style.borderColor = `${accent}20`
        el.style.transform = 'translateY(0)'
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5"
        style={{
          background: `${accent}18`,
          border: `1px solid ${accent}30`,
          color: accent,
        }}
      >
        {symbol}
      </div>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          {label}
        </span>
        <span className="text-xs leading-snug" style={{ color: 'var(--ghost)' }}>
          {description}
        </span>
      </div>
      <span
        className="ml-auto text-xs self-center shrink-0"
        style={{ color: accent, opacity: 0.6 }}
      >
        →
      </span>
    </Link>
  )
}

// --- SelfPlanetActions --------------------------------------------------------
// Ownership action panel shown on /my-planet.

interface Props {
  planet: PlanetProfile
}

export default function SelfPlanetActions({ planet }: Props) {
  const depthScore = computeDepthScore(planet)
  const { coreColor } = planet.visual

  return (
    <div
      className="rounded-2xl p-4 sm:p-5 flex flex-col gap-4"
      style={{
        background: 'linear-gradient(160deg, rgba(28,24,72,0.4) 0%, rgba(8,6,28,0.35) 100%)',
        border: '1px solid rgba(167,139,250,0.1)',
      }}
    >
      {/* Depth meter */}
      <DepthMeter score={depthScore} coreColor={coreColor} />

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <ActionItem
          href="/create-universe"
          symbol="◎"
          label="Edit planet"
          description="Re-express yourself. Recalibrate your orbit frequency."
          accent={coreColor}
        />
        <ActionItem
          href="/settings/planet"
          symbol="◈"
          label="Tune atmosphere"
          description="Adjust communication style, location, and languages."
          accent="#a78bfa"
        />
        <ActionItem
          href="/sbti?next=/my-planet"
          symbol="◇"
          label={planet.sbtiType ? 'Retake soul scan' : 'Take soul scan'}
          description={planet.sbtiType ? 'Re-run SBTI and update your archetype badge.' : 'Map your archetype and attach it to your planet.'}
          accent="#fb923c"
        />
        <ActionItem
          href="/resonance"
          symbol="⊛"
          label="Open resonance"
          description="See which planets have entered your orbit today."
          accent="#34d399"
        />
      </div>

      {/* Completion nudge */}
      {depthScore < 80 && (
        <p className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.65 }}>
          Add location, languages, cultural taste, or an SBTI scan to deepen your planet&apos;s resonance field.
        </p>
      )}
    </div>
  )
}
