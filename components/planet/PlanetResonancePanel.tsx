import { useTranslations } from 'next-intl'
import { themeLabel, lifestyleLabel, commStyleLabel } from '@/lib/planet-labels'
import type { PlanetProfile } from '@/types/planet'

// --- Orbit color tokens ----------------------------------------------------

const ORBIT: Record<string, string> = {
  blue:   '#60a5fa',
  purple: '#a78bfa',
  red:    '#f87171',
  green:  '#34d399',
  gold:   '#fbbf24',
  orange: '#fb923c',
}

// --- Derive match dimensions from two planets -----------------------------
// Each dimension carries raw data only — labels and notes are translated at
// render time (deriveMatchDimensions is a plain function, not a component,
// so it can't call useTranslations itself).

type MatchDimension =
  | { kind: 'sharedThemes'; score: number; color: string; themes: string[] }
  | { kind: 'expressionStyle'; score: number; color: string; same: boolean; viewerStyle: string; subjectStyle: string }
  | { kind: 'emotionalFrequency'; score: number; color: string; close: boolean }
  | { kind: 'culturalOrbit'; score: number; color: string; cities: string[] }
  | { kind: 'artsResonance'; score: number; color: string; art: string }
  | { kind: 'worldviewOrbit'; score: number; color: string; viewerLifestyle: string; subjectLifestyle: string }

function deriveMatchDimensions(
  viewer: PlanetProfile,
  subject: PlanetProfile,
): MatchDimension[] {
  const dims: MatchDimension[] = []

  // 1. Shared thematic resonance (blue)
  const sharedThemes = viewer.coreThemes.filter((t) => subject.coreThemes.includes(t))
  if (sharedThemes.length > 0) {
    dims.push({
      kind:  'sharedThemes',
      score: Math.min(100, sharedThemes.length * 25 + 25),
      color: ORBIT.blue,
      themes: sharedThemes.slice(0, 2),
    })
  }

  // 2. Expression style (purple)
  if (viewer.communicationStyle && subject.communicationStyle) {
    const same = viewer.communicationStyle === subject.communicationStyle
    dims.push({
      kind:  'expressionStyle',
      score: same ? 92 : 48,
      color: ORBIT.purple,
      same,
      viewerStyle:  viewer.communicationStyle,
      subjectStyle: subject.communicationStyle,
    })
  }

  // 3. Emotional frequency (red)  -  closeness in introspective axis
  const introDiff = Math.abs(viewer.cognitiveAxes.introspective - subject.cognitiveAxes.introspective)
  dims.push({
    kind:  'emotionalFrequency',
    score: Math.max(20, 100 - introDiff),
    color: ORBIT.red,
    close: introDiff < 20,
  })

  // 4. Cultural orbit  -  shared travel cities (green)
  if (viewer.travelCities && subject.travelCities) {
    const shared = viewer.travelCities.filter((c) =>
      subject.travelCities!.some((sc) => sc.toLowerCase() === c.toLowerCase())
    )
    if (shared.length > 0) {
      dims.push({
        kind:  'culturalOrbit',
        score: Math.min(100, shared.length * 30 + 40),
        color: ORBIT.green,
        cities: shared.slice(0, 2),
      })
    }
  }

  // 5. Arts resonance  -  shared music/books (gold)
  const viewerArts = [...(viewer.musicTaste ?? []), ...(viewer.bookTaste ?? [])]
  const subjectArts = [...(subject.musicTaste ?? []), ...(subject.bookTaste ?? [])]
  const sharedArts = viewerArts.filter((a) =>
    subjectArts.some((sa) =>
      sa.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(sa.toLowerCase())
    )
  )
  if (sharedArts.length > 0) {
    dims.push({
      kind:  'artsResonance',
      score: Math.min(100, sharedArts.length * 35 + 30),
      color: ORBIT.gold,
      art: sharedArts[0],
    })
  }

  // 6. Worldview orbit  -  lifestyle complement (orange)
  if (dims.length < 4 && viewer.lifestyle !== subject.lifestyle) {
    dims.push({
      kind:  'worldviewOrbit',
      score: 62,
      color: ORBIT.orange,
      viewerLifestyle:  viewer.lifestyle,
      subjectLifestyle: subject.lifestyle,
    })
  }

  return dims.slice(0, 4)
}

// --- Translation ------------------------------------------------------------

type SafeT = {
  (key: string, values?: Record<string, string | number>): string
  has(key: string): boolean
}

function dimensionLabel(t: SafeT, dim: MatchDimension): string {
  switch (dim.kind) {
    case 'sharedThemes':       return t('sharedResonance')
    case 'expressionStyle':    return t('expressionStyle')
    case 'emotionalFrequency': return t('emotionalFrequency')
    case 'culturalOrbit':      return t('culturalOrbit')
    case 'artsResonance':      return t('artsResonance')
    case 'worldviewOrbit':     return t('worldviewOrbit')
  }
}

function dimensionNote(t: SafeT, tCreation: SafeT, dim: MatchDimension): string {
  switch (dim.kind) {
    case 'sharedThemes':
      return dim.themes.map((theme) => themeLabel(tCreation, theme)).join(' · ')
    case 'expressionStyle':
      return dim.same
        ? t('bothStyle', { style: commStyleLabel(tCreation, dim.viewerStyle) })
        : t('styleMeets', { a: commStyleLabel(tCreation, dim.viewerStyle), b: commStyleLabel(tCreation, dim.subjectStyle) })
    case 'emotionalFrequency':
      return dim.close ? t('closeFrequency') : t('complementaryDepth')
    case 'culturalOrbit':
      return dim.cities.join(' · ')
    case 'artsResonance':
      return dim.art
    case 'worldviewOrbit':
      return t('worldviewNote', { a: lifestyleLabel(tCreation, dim.viewerLifestyle), b: lifestyleLabel(tCreation, dim.subjectLifestyle) })
  }
}

// --- PlanetResonancePanel -------------------------------------------------

interface Props {
  /** The planet being viewed */
  subject: PlanetProfile
  /** The logged-in viewer's planet (resonator only) */
  viewerPlanet: PlanetProfile
}

/**
 * PlanetResonancePanel  -  orbit-colored dimension bars showing why a resonator
 * and the subject planet have resonance potential.
 *
 * Only render when the viewer is a resonator (has viewerPlanet).
 */
export default function PlanetResonancePanel({ subject, viewerPlanet }: Props) {
  const t = useTranslations('resonancePanel')
  const tCreation = useTranslations('creationSteps')
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
          {t('resonanceField')}
        </span>
        <div
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: `${subject.visual.coreColor}14`,
            border: `1px solid ${subject.visual.coreColor}30`,
            color: subject.visual.coreColor,
          }}
        >
          <span className="opacity-60 text-[10px]">{t('match')}</span>
          {overallScore}
        </div>
      </div>

      {/* Dimension bars */}
      <div className="flex flex-col gap-3">
        {dimensions.map((dim) => (
          <div key={dim.kind} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium" style={{ color: 'var(--ink)', opacity: 0.82 }}>
                {dimensionLabel(t, dim)}
              </span>
              <span className="text-[10px] max-w-[16ch] text-right truncate" style={{ color: dim.color, opacity: 0.7 }}>
                {dimensionNote(t, tCreation, dim)}
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
        {t('footerNote')}
      </p>
    </div>
  )
}
