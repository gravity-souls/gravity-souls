'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { authClient } from '@/lib/auth-client'
import { buildPlanetFromDraft } from '@/lib/planet-builder'
import { useOnboardingState } from '@/lib/hooks/useOnboardingState'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import CreationProgress from '@/components/creation/CreationProgress'
import LivePlanetPreview from '@/components/creation/LivePlanetPreview'
import Step1EmotionalTone from '@/components/creation/steps/Step1EmotionalTone'
import Step2InterestEcology from '@/components/creation/steps/Step2InterestEcology'
import Step3AtmosphereStyle from '@/components/creation/steps/Step3AtmosphereStyle'
import GlowButton from '@/components/ui/GlowButton'
import PlanetAwakeningState from '@/components/creation/PlanetAwakeningState'
import type { PlanetProfile, Lifestyle, CommunicationStyle } from '@/types/planet'
import RegistrationGate from '@/components/registration/RegistrationGate'
import type { ResonanceAnswers } from '@/types/creation'

// Step indices: 0 = intro, 1–3 = creation steps, 4 = resonance questions, 5 = reveal
const TOTAL_STEPS = 5

const RESONANCE_QUESTIONS: Array<{
  key: keyof ResonanceAnswers
  required: boolean
  options: string[]
}> = [
  { key: 'emotionalProcessing', required: true,  options: ['alone', 'together', 'creating', 'moving'] },
  { key: 'leadWith',            required: true,  options: ['curiosity', 'warmth', 'ideas', 'silence'] },
  { key: 'connectionSeeking',   required: true,  options: ['deep-slow', 'playful', 'intellectual', 'soulful'] },
  { key: 'solitudeNeed',        required: false, options: ['daily', 'weekly', 'rarely', 'social'] },
  { key: 'lifeChapter',         required: false, options: ['building', 'exploring', 'healing', 'waiting'] },
]

function CalibrationPage() {
  const router = useRouter()
  const t = useTranslations('createPlanet')
  const { draft, setDraft, step, setStep, markReady, clear } = useOnboardingState()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [saving, setSaving] = useState(false)
  const [revealError, setRevealError] = useState('')
  const [awakeningPlanet, setAwakeningPlanet] = useState<PlanetProfile | null>(null)

  // Seeded from the real signed-in user's id when available so the preview
  // (and the awakening reveal below, which reuses this same object as the
  // "saved" planet) matches what /api/onboarding/complete actually persists —
  // buildPlanetFromDraft's name/avatar are deterministic per (draft, userId),
  // so a placeholder seed here previously showed a different planet than the
  // one that got saved. Anonymous visitors (no session yet) still preview
  // against a placeholder, since no real id exists until they sign up.
  const previewPlanet = useMemo(
    () => buildPlanetFromDraft(draft, session?.user?.id ?? 'preview'),
    [draft, session?.user?.id],
  )

  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return !!draft.climateKey
      case 2: return draft.selectedThemes.length > 0 && !!draft.lifestyle
      case 3: return !!draft.communicationStyle
      case 4: {
        const r = draft.resonanceAnswers ?? {}
        return !!(r.emotionalProcessing && r.leadWith && r.connectionSeeking)
      }
      default: return true
    }
  }, [step, draft])

  function advance() { setStep(step + 1) }
  function back()    { setStep(Math.max(0, step - 1)) }

  // Calibration (step 4) is optional per docs/beta-execution.md — "Matching/calibration
  // is optional, not mandatory." This bypasses the canProceed gate and moves straight to
  // the reveal with whatever resonanceAnswers (possibly none) are already in the draft.
  function skipCalibration() { setStep(5) }

  function setResonanceAnswer(key: keyof ResonanceAnswers, value: string) {
    setDraft({
      ...draft,
      resonanceAnswers: { ...draft.resonanceAnswers, [key]: value },
    })
  }

  async function handleSave() {
    markReady()
    if (session?.user) {
      // Authenticated user re-calibrating — call complete directly
      setSaving(true)
      setRevealError('')
      try {
        const res = await fetch('/api/onboarding/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft }),
        })
        if (res.ok) {
          const savedPlanet = previewPlanet // capture before draft clears
          clear()
          setAwakeningPlanet(savedPlanet)
        } else {
          setRevealError(t('genericSaveError'))
        }
      } catch {
        setRevealError(t('genericNetworkError'))
      } finally {
        setSaving(false)
      }
    } else {
      router.push('/sign-up?from=onboarding')
    }
  }

  function handleSignInFromReveal() {
    markReady()
    router.push('/sign-in?from=onboarding')
  }

  // -- Awakening reveal (after authenticated save) ------------------------------
  if (awakeningPlanet) {
    return <PlanetAwakeningState planet={awakeningPlanet} />
  }

  // -- Intro (step 0) -----------------------------------------------------------
  if (step === 0) {
    return (
      <OnboardingShell>
        <div className="flex flex-col gap-10">
          <div className="flex justify-center pt-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl animate-pulse-glow"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.35), rgba(99,102,241,0.12))',
                boxShadow: '0 0 0 1px rgba(167,139,250,0.28), 0 0 48px rgba(124,58,237,0.18)',
              }}
              aria-hidden="true"
            >
              ◍
            </div>
          </div>

          <div className="flex flex-col gap-3 text-center">
            <p className="text-eyebrow" style={{ letterSpacing: '0.16em' }}>
              {t('introEyebrow')}
            </p>
            <h1
              className="text-3xl sm:text-4xl font-semibold leading-tight"
              style={{ color: 'var(--foreground)' }}
            >
              {t('introTitle')}
            </h1>
            <p
              className="text-sm sm:text-base leading-relaxed max-w-sm mx-auto"
              style={{ color: 'var(--ink)', opacity: 0.72 }}
            >
              {t('introDescription')}
            </p>
          </div>

          <div className="divider-glow mx-auto w-24" aria-hidden="true" />

          <div className="flex flex-col items-center gap-4">
            <GlowButton
              variant="primary"
              className="w-full sm:w-auto px-10 py-3"
              onClick={() => setStep(1)}
            >
              {t('beginCalibration')}
            </GlowButton>
            {!session?.user && (
              <Link href="/sign-in" className="text-xs transition-colors" style={{ color: 'var(--ghost)', textDecoration: 'none' }}>
                {t('alreadyHavePlanetQuestion')}{' '}
                <span style={{ color: 'var(--star)' }}>{t('signIn')}</span>
              </Link>
            )}
          </div>
        </div>
      </OnboardingShell>
    )
  }

  // -- Reveal (step 5) ----------------------------------------------------------
  if (step === 5) {
    return (
      <OnboardingShell>
        <div className="flex flex-col gap-8 items-center">
          <div className="text-center flex flex-col gap-1.5">
            <p className="text-eyebrow" style={{ letterSpacing: '0.16em' }}>
              {t('revealEyebrow')}
            </p>
            <h2 className="text-2xl font-semibold" style={{ color: 'var(--foreground)' }}>
              {previewPlanet.name}
            </h2>
          </div>

          <LivePlanetPreview planet={previewPlanet} size={180} />

          <div className="w-full flex flex-col gap-3 max-w-sm">
            {revealError && (
              <p className="text-sm text-center" style={{ color: '#f87171' }}>
                {revealError}
              </p>
            )}
            <GlowButton
              variant="primary"
              fullWidth
              disabled={sessionPending || saving}
              onClick={handleSave}
            >
              {sessionPending ? t('resolving') : saving ? t('saving') : t('saveMyPlanet')}
            </GlowButton>
            {!session?.user && (
              <button
                type="button"
                disabled={sessionPending}
                onClick={handleSignInFromReveal}
                className="text-xs text-center transition-opacity"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: sessionPending ? 'not-allowed' : 'pointer',
                  color: 'var(--ghost)',
                  opacity: sessionPending ? 0.4 : 1,
                }}
              >
                {t('alreadyHavePlanetQuestion')}{' '}
                <span style={{ color: 'var(--star)' }}>{t('signIn')}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={back}
            className="text-xs transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ghost)' }}
          >
            {t('back')}
          </button>
        </div>
      </OnboardingShell>
    )
  }

  // -- Calibration steps 1–4 ----------------------------------------------------
  return (
    <OnboardingShell previewSlot={<LivePlanetPreview planet={previewPlanet} size={140} />}>
      <div className="flex flex-col gap-6">
        <CreationProgress step={step} total={TOTAL_STEPS} />

        <button
          type="button"
          onClick={back}
          className="self-start text-sm transition-colors"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ghost)' }}
        >
          {t('back')}
        </button>

        {step === 1 && (
          <Step1EmotionalTone
            value={draft.climateKey}
            onChange={(key) => setDraft({ ...draft, climateKey: key })}
          />
        )}

        {step === 2 && (
          <Step2InterestEcology
            selectedThemes={draft.selectedThemes}
            lifestyle={draft.lifestyle}
            visibility={draft.visibility ?? 'MEMBERS'}
            onThemesChange={(themes) => setDraft({ ...draft, selectedThemes: themes })}
            onLifestyleChange={(l: Lifestyle) => setDraft({ ...draft, lifestyle: l })}
            onVisibilityChange={(v) => setDraft({ ...draft, visibility: v })}
          />
        )}

        {step === 3 && (
          <Step3AtmosphereStyle
            communicationStyle={draft.communicationStyle}
            abstractAxis={draft.abstractAxis}
            introspectiveAxis={draft.introspectiveAxis}
            onStyleChange={(s: CommunicationStyle) => setDraft({ ...draft, communicationStyle: s })}
            onAbstractChange={(v) => setDraft({ ...draft, abstractAxis: v })}
            onIntrospectiveChange={(v) => setDraft({ ...draft, introspectiveAxis: v })}
          />
        )}

        {step === 4 && (
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                {t('resonanceSignatureTitle')}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
                {t('resonanceSignatureSubtitle')}
              </p>
            </div>

            {RESONANCE_QUESTIONS.map((q) => {
              const currentValue = draft.resonanceAnswers?.[q.key]
              return (
                <div key={q.key} className="flex flex-col gap-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {t(`resonance.${q.key}.question`)}
                    {!q.required && (
                      <span
                        className="ml-2 text-[10px] uppercase tracking-widest"
                        style={{ color: 'var(--ghost)', opacity: 0.5 }}
                      >
                        {t('optional')}
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((value) => {
                      const active = currentValue === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setResonanceAnswer(q.key, value)}
                          className="px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all duration-200"
                          style={{
                            background: active ? 'rgba(167,139,250,0.14)' : 'rgba(255,255,255,0.025)',
                            border: active
                              ? '1px solid rgba(167,139,250,0.42)'
                              : '1px solid rgba(167,139,250,0.10)',
                            color: active ? 'var(--foreground)' : 'var(--ink)',
                            outline: 'none',
                          }}
                        >
                          {t(`resonance.${q.key}.${value}`)}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="pt-2 flex flex-col gap-2">
          <GlowButton
            variant="primary"
            fullWidth
            disabled={!canProceed}
            onClick={advance}
          >
            {step === 4 ? t('seeMyPlanet') : t('next')}
          </GlowButton>

          {/* Calibration is optional (docs/beta-execution.md) — always let the user
              skip straight to the reveal from step 4, regardless of how many of the
              resonance questions they've answered. */}
          {step === 4 && (
            <GlowButton
              variant="ghost"
              fullWidth
              onClick={skipCalibration}
            >
              {t('skip')}
            </GlowButton>
          )}
        </div>
      </div>
    </OnboardingShell>
  )
}

export default function OnboardingPage() {
  // The wizard saves private preferences separately. It does not silently make
  // the user's region or language public through Profile.
  return <RegistrationGate><CalibrationPage /></RegistrationGate>
}
