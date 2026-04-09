import type { PlanetProfile } from '@/types/planet'

// ─── Orbit color tokens ────────────────────────────────────────────────────

const ORBIT: Record<string, string> = {
  blue:   '#60a5fa',
  purple: '#a78bfa',
  red:    '#f87171',
  green:  '#34d399',
  gold:   '#fbbf24',
  orange: '#fb923c',
}

// ─── Derive match dimensions from two planets ─────────────────────────────

interface MatchDimension {
  label: string
  score: number
  color: string
  note: string
}

function deriveMatchDimensions(
  viewer: PlanetProfile,
  subject: PlanetProfile,
): MatchDimension[] {
  const dims: MatchDimension[] = []

  // 1. Shared thematic resonance (blue)
  const sharedThemes = viewer.coreThemes.filter((t) => subject.coreThemes.includes(t))
  if (sharedThemes.length > 0) {
    dims.push({
      label: 'Shared resonance',
      score: Math.min(100, sharedThemes.length * 25 + 25),
      color: ORBIT.blue,
      note: sharedThemes.slice(0, 2).join(' · '),
    })
  }

  // 2. Expression style (purple)
  if (viewer.communicationStyle && subject.communicationStyle) {
    const same = viewer.communicationStyle === subject.communicationStyle
    dims.push({
      label: 'Expression style',
      score: same ? 92 : 48,
      color: ORBIT.purple,
      note: same
        ? `Both ${viewer.communicationStyle}`
        : `${viewer.communicationStyle} meets ${subject.communicationStyle}`,
    })
  }

  // 3. Emotional frequency (red) — closeness in introspective axis
  const introDiff = Math.abs(viewer.cognitiveAxes.introspective - subject.cognitiveAxes.introspective)
  dims.push({
    label: 'Emotional frequency',
    score: Math.max(20, 100 - introDiff),
    color: ORBIT.red,
    note: introDiff < 20 ? 'Close inner frequency' : 'Complementary depth',
  })

  // 4. Cultural orbit — shared travel cities (green)
  if (viewer.travelCities && subject.travelCities) {
    const shared = viewer.travelCities.filter((c) =>
      subject.travelCities!.some((sc) => sc.toLowerCase() === c.toLowerCase())
    )
    if (shared.length > 0) {
      dims.push({
        label: 'Cultural orbit',
        score: Math.min(100, shared.length * 30 + 40),
        color: ORBIT.green,
        note: shared.slice(0, 2).join(' · '),
      })
    }
  }

  // 5. Arts resonance — shared music/books (gold)
  const viewerArts = [...(viewer.musicTaste ?? []), ...(viewer.bookTaste ?? [])]
  const subjectArts = [...(subject.musicTaste ?? []), ...(subject.bookTaste ?? [])]
  const sharedArts = viewerArts.filter((a) =>
    subjectArts.some((sa) =>
      sa.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(sa.toLowerCase())
    )
  )
  if (sharedArts.length > 0) {
    dims.push({
      label: 'Arts resonance',
      score: Math.min(100, sharedArts.length * 35 + 30),
      color: ORBIT.gold,
      note: sharedArts[0],
    })
  }

  // 6. Worldview orbit — lifestyle complement (orange)
  if (dims.length < 4 && viewer.lifestyle !== subject.lifestyle) {
    dims.push({
      label: 'Worldview orbit',
      score: 62,
      color: ORBIT.orange,
      note: `${viewer.lifestyle} ↔ ${subject.lifestyle}`,
    })
  }

  return dims.slice(0, 4)
}

// ─── PlanetResonancePanel ─────────────────────────────────────────────────

interface Props {
  /** The planet being viewed */
  subject: PlanetProfile
  /** The logged-in viewer's planet (resonator only) */
  viewerPlanet: PlanetProfile
}

/**
 * PlanetResonancePanel — orbit-colored dimension bars showing why a resonator
 * and the subject planet have resonance potential.
 *
 * Only render when the viewer is a resonator (has viewerPlanet).
 */
export default function PlanetResonancePanel({ subject, viewerPlanet }: Props) {
  const dimensions = deriveMatchDimensions(viewerPlanet, subject)
  if (dimensions.length === 0) return null

  const overallScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  )

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: 'linear-gradient(160deg, rgba(28,24,72,0.5) 0%, rgba(8,6,28,0.4) 100%)',
        border: `1px solid ${subject.visual.coreColor}18`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top shimmer */}
      <div
        className="absolute top-0 left-4 right-4 h-px pointer-events-none"
        aria-hidden="true"
        style={{
          background: `linear-gradient(90deg, transparent, ${subject.visual.coreColor}50, transparent)`,
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] uppercase tracking-[0.2em] font-semibold"
          style={{ color: 'var(--star)', opacity: 0.52 }}
        >
          Resonance field
        </span>
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: `${subject.visual.coreColor}14`,
            border: `1px solid ${subject.visual.coreColor}30`,
            color: subject.visual.coreColor,
          }}
        >
          <span className="opacity-60 text-[10px]">match</span>
          {overallScore}
        </div>
      </div>

      {/* Dimension bars */}
      <div className="flex flex-col gap-3">
        {dimensions.map((dim) => (
          <div key={dim.label} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: 'var(--ink)', opacity: 0.82 }}>
                {dim.label}
              </span>
              <span className="text-[10px] max-w-[16ch] text-right truncate" style={{ color: dim.color, opacity: 0.7 }}>
                {dim.note}
              </span>
            </div>
            <div
              className="relative h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${dim.score}%`,
                  background: `linear-gradient(to right, ${dim.color}77, ${dim.color})`,
                  boxShadow: `0 0 6px ${dim.color}50`,
                  transition: 'width 0.8s ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Resonance note */}
      <p
        className="text-xs leading-relaxed italic border-t pt-3"
        style={{
          color: 'var(--ink)',
          opacity: 0.48,
          borderColor: 'rgba(167,139,250,0.08)',
        }}
      >
        These dimensions emerge from your planet and theirs — not an algorithm, but a mirror.
      </p>
    </div>
  )
}
