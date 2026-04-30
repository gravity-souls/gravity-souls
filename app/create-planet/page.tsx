'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { PlanetDraft } from '@/types/creation'
import type { PlanetProfile } from '@/types/planet'
import { INITIAL_DRAFT } from '@/types/creation'
import { buildPlanetFromDraft } from '@/lib/planet-builder'
import { getOrCreateUserId, getPlanetProfile, getSbtiResult, savePlanetProfile } from '@/lib/user'
import CreationProgress from '@/components/creation/CreationProgress'
import LivePlanetPreview from '@/components/creation/LivePlanetPreview'
import PlanetAwakeningState from '@/components/creation/PlanetAwakeningState'
import Step1EmotionalTone from '@/components/creation/steps/Step1EmotionalTone'
import Step2InterestEcology from '@/components/creation/steps/Step2InterestEcology'
import Step3AtmosphereStyle from '@/components/creation/steps/Step3AtmosphereStyle'
import Step4CulturalPaths from '@/components/creation/steps/Step4CulturalPaths'
import Step5RelationalGravity from '@/components/creation/steps/Step5RelationalGravity'
import GlowButton from '@/components/ui/GlowButton'

// --- Validation: can user proceed from each step? ----------------------------

function canProceed(step: number, draft: PlanetDraft): boolean {
  switch (step) {
    case 1: return !!draft.climateKey
    case 2: return draft.selectedThemes.length >= 1 && !!draft.lifestyle
    case 3: return !!draft.communicationStyle
    case 4: return true  // all optional
    case 5: return true  // all optional
    default: return false
  }
}

// --- Step heading metadata ----------------------------------------------------

const STEP_META = [
  { eyebrow: 'Step 1 of 5', hint: 'Choose a climate to continue' },
  { eyebrow: 'Step 2 of 5', hint: 'Select at least one theme and a habitat pattern' },
  { eyebrow: 'Step 3 of 5', hint: 'Choose a communication style to continue' },
  { eyebrow: 'Step 4 of 5', hint: 'All optional  -  skip if you prefer' },
  { eyebrow: 'Step 5 of 5', hint: 'Optional  -  your orbit forms from your planet regardless' },
]

// --- Page ---------------------------------------------------------------------

export default function CreatePlanetPage() {
  const [mounted,  setMounted]   = useState(false)
  const [userId,   setUserId]    = useState('')
  const [step,     setStep]      = useState<1 | 2 | 3 | 4 | 5>(1)
  const [draft,    setDraft]     = useState<PlanetDraft>(INITIAL_DRAFT)
  const [awakened, setAwakened]  = useState(false)
  const [finished, setFinished]  = useState<PlanetProfile | null>(null)
  const [customName, setCustomName] = useState('')
  const [saving,   setSaving]    = useState(false)

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return

      setMounted(true)
      const id = getOrCreateUserId()
      setUserId(id)

      const sbti = getSbtiResult()

      if (!sbti) {
        window.location.replace('/sbti?next=/create-planet')
        return
      }

      // If user already has a planet, go to settings instead
      const existing = getPlanetProfile()
      if (existing) {
        window.location.replace('/settings/planet')
      }
    })

    return () => { cancelled = true }
  }, [])

  // Live preview planet  -  re-derived on every draft change
  const previewPlanet = useMemo(
    () => (userId ? buildPlanetFromDraft(draft, userId) : null),
    [draft, userId],
  )

  function update<K extends keyof PlanetDraft>(key: K, value: PlanetDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleNext() {
    if (step < 5) { setStep((s) => (s + 1) as 1 | 2 | 3 | 4 | 5); return }
    // Step 5 -> complete
    if (!userId || !previewPlanet) return
    setSaving(true)

    const sbti = getSbtiResult()
    const nextPlanet = {
      ...previewPlanet,
      name: customName.trim() || previewPlanet.name,
      sbtiType: sbti?.typeCode,
      sbtiCn: sbti?.typeCn,
      sbtiPattern: sbti?.patternString,
    }

    // Save to localStorage as fallback
    savePlanetProfile(nextPlanet)

    // Save to database via API (primary persistence)
    try {
      await fetch('/api/my-planet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextPlanet.name,
          avatarSymbol: nextPlanet.avatarSymbol,
          tagline: nextPlanet.tagline,
          role: nextPlanet.role,
          mood: nextPlanet.mood,
          style: nextPlanet.style,
          lifestyle: nextPlanet.lifestyle,
          coreThemes: nextPlanet.coreThemes,
          contentFragments: nextPlanet.contentFragments,
          visual: nextPlanet.visual,
          abstractAxis: nextPlanet.cognitiveAxes.abstract,
          introspectiveAxis: nextPlanet.cognitiveAxes.introspective,
        }),
      })
    } catch {
      // localStorage fallback already saved above
    }

    setFinished(nextPlanet)
    setAwakened(true)
    setSaving(false)
  }

  function handleBack() {
    if (step > 1) setStep((s) => (s - 1) as 1 | 2 | 3 | 4 | 5)
  }

  if (!mounted || !previewPlanet) return null

  // -- Awakening ceremony ----------------------------------------------------
  if (awakened && finished) {
    return <PlanetAwakeningState planet={finished} />
  }

  const meta = STEP_META[step - 1]
  const ready = canProceed(step, draft)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>

      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        aria-hidden="true"
        style={{
          width: 600,
          height: 400,
          background: `radial-gradient(ellipse, ${previewPlanet.visual.coreColor}10 0%, transparent 70%)`,
          filter: 'blur(60px)',
          transition: 'background 0.8s ease',
        }}
      />

      {/* Top navigation bar */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-6 py-3"
        style={{
          background: 'rgba(3,3,15,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(167,139,250,0.07)',
        }}
      >
        <Link
          href="/"
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: 'var(--ghost)', textDecoration: 'none' }}
        >
          ← Cancel
        </Link>

        <span
          className="text-[10px] uppercase tracking-[0.25em] font-medium"
          style={{ color: 'var(--star)', opacity: 0.6 }}
        >
          Planet formation
        </span>

        {/* Skip to stream (only on cultural + gravity steps) */}
        {step >= 4 && (
          <button
            type="button"
            onClick={handleNext}
            className="text-xs transition-opacity hover:opacity-80"
            style={{ color: 'var(--ghost)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {step === 5 ? 'Finish →' : 'Skip →'}
          </button>
        )}
        {step < 4 && <div className="w-16" />}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_360px] min-h-0">

        {/* -- Left: step content -------------------------------------------- */}
        <div className="flex flex-col gap-6 px-6 sm:px-10 pt-8 pb-6 overflow-y-auto">

          {/* Progress */}
          <CreationProgress step={step} total={5} />

          {/* Eyebrow */}
          <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.45 }}>
            {meta.eyebrow}
          </p>

          {/* Step content */}
          <div className="flex-1">
            {step === 1 && (
              <Step1EmotionalTone
                value={draft.climateKey}
                onChange={(v) => update('climateKey', v)}
              />
            )}
            {step === 2 && (
              <Step2InterestEcology
                selectedThemes={draft.selectedThemes}
                lifestyle={draft.lifestyle}
                onThemesChange={(v) => update('selectedThemes', v)}
                onLifestyleChange={(v) => update('lifestyle', v)}
              />
            )}
            {step === 3 && (
              <Step3AtmosphereStyle
                communicationStyle={draft.communicationStyle}
                abstractAxis={draft.abstractAxis}
                introspectiveAxis={draft.introspectiveAxis}
                onStyleChange={(v) => update('communicationStyle', v)}
                onAbstractChange={(v) => update('abstractAxis', v)}
                onIntrospectiveChange={(v) => update('introspectiveAxis', v)}
              />
            )}
            {step === 4 && (
              <Step4CulturalPaths
                location={draft.location}
                languages={draft.languages}
                travelCities={draft.travelCities}
                culturalTags={draft.culturalTags}
                onLocationChange={(v) => update('location', v || undefined)}
                onLanguagesChange={(v) => update('languages', v)}
                onCitiesChange={(v) => update('travelCities', v)}
                onCulturalChange={(v) => update('culturalTags', v)}
              />
            )}
            {step === 5 && (
              <>
                {/* Custom planet name input */}
                <div className="flex flex-col gap-2 mb-6">
                  <label
                    htmlFor="planet-name"
                    className="text-xs font-medium tracking-wide"
                    style={{ color: 'var(--ink)' }}
                  >
                    Name your planet
                  </label>
                  <input
                    id="planet-name"
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={previewPlanet?.name ?? 'Enter a name...'}
                    maxLength={40}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border-mid)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <p className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.5 }}>
                    Leave blank to use the generated name
                  </p>
                </div>

                <Step5RelationalGravity
                  matchPreference={draft.matchPreference}
                  connectionTypes={draft.connectionTypes}
                  onMatchPrefChange={(v) => update('matchPreference', v)}
                  onConnectionTypesChange={(v) => update('connectionTypes', v)}
                />
              </>
            )}
          </div>

          {/* Navigation  -  shown on mobile below content */}
          <div className="lg:hidden flex items-center gap-3 pt-2">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(167,139,250,0.12)',
                  color: 'var(--ghost)',
                }}
              >
                Back
              </button>
            )}
            <GlowButton
              onClick={handleNext}
              variant="primary"
              disabled={!ready || saving}
              fullWidth={step === 1}
              className="flex-1 py-3 text-sm"
            >
              {saving ? 'Saving...' : step === 5 ? 'Awaken my planet' : 'Continue \u2192'}
            </GlowButton>
          </div>

          {/* Hint if not ready */}
          {!ready && (
            <p className="text-[11px] text-center lg:text-left" style={{ color: 'var(--ghost)', opacity: 0.45 }}>
              {meta.hint}
            </p>
          )}
        </div>

        {/* -- Right: live preview (desktop) + navigation --------------------- */}
        <div
          className="hidden lg:flex flex-col items-center justify-between gap-6 px-8 py-8 sticky top-13.25 h-[calc(100vh-53px)]"
          style={{
            borderLeft: '1px solid rgba(167,139,250,0.06)',
            background: 'rgba(255,255,255,0.01)',
          }}
        >
          {/* Planet preview */}
          <div className="flex-1 flex items-center justify-center w-full">
            <LivePlanetPreview planet={previewPlanet} size={160} />
          </div>


          {/* Desktop nav buttons */}
          <div className="w-full flex flex-col gap-3">
            <GlowButton
              onClick={handleNext}
              variant="primary"
              disabled={!ready || saving}
              fullWidth
              className="py-3.5 text-sm"
            >
              {saving ? 'Saving...' : step === 5 ? 'Awaken my planet' : 'Continue \u2192'}
            </GlowButton>

            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="w-full py-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ghost)',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
            )}

            {!ready && (
              <p className="text-[10px] text-center" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
                {meta.hint}
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
