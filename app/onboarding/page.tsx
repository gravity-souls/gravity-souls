'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import type { Lifestyle, CommunicationStyle } from '@/types/planet'
import type { ResonanceAnswers } from '@/types/creation'

// Step indices: 0 = intro, 1–3 = creation steps, 4 = resonance questions, 5 = reveal
const TOTAL_STEPS = 5

const RESONANCE_QUESTIONS: Array<{
  key: keyof ResonanceAnswers
  question: string
  required: boolean
  options: Array<{ value: string; label: string }>
}> = [
  {
    key: 'emotionalProcessing',
    question: 'When something weighs on you, you tend to…',
    required: true,
    options: [
      { value: 'alone',    label: 'Withdraw alone' },
      { value: 'together', label: 'Talk it through' },
      { value: 'creating', label: 'Create something' },
      { value: 'moving',   label: 'Move your body' },
    ],
  },
  {
    key: 'leadWith',
    question: 'Meeting someone new, you lead with…',
    required: true,
    options: [
      { value: 'curiosity', label: 'Curiosity' },
      { value: 'warmth',    label: 'Warmth' },
      { value: 'ideas',     label: 'Ideas' },
      { value: 'silence',   label: 'Quiet presence' },
    ],
  },
  {
    key: 'connectionSeeking',
    question: "The connection you're looking for right now…",
    required: true,
    options: [
      { value: 'deep-slow',    label: 'Deep and slow' },
      { value: 'playful',      label: 'Playful and light' },
      { value: 'intellectual', label: 'Intellectual' },
      { value: 'soulful',      label: 'Soulful' },
    ],
  },
  {
    key: 'solitudeNeed',
    question: 'How much solitude do you need?',
    required: false,
    options: [
      { value: 'daily',   label: 'Daily — I recharge alone' },
      { value: 'weekly',  label: 'Weekly' },
      { value: 'rarely',  label: 'Rarely' },
      { value: 'social',  label: 'I thrive in company' },
    ],
  },
  {
    key: 'lifeChapter',
    question: 'Your life right now feels like…',
    required: false,
    options: [
      { value: 'building',  label: 'Building' },
      { value: 'exploring', label: 'Exploring' },
      { value: 'healing',   label: 'Healing' },
      { value: 'waiting',   label: 'Waiting' },
    ],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { draft, setDraft, step, setStep, markReady, clear } = useOnboardingState()
  const { data: session, isPending: sessionPending } = authClient.useSession()
  const [saving, setSaving] = useState(false)
  const [revealError, setRevealError] = useState('')

  const previewPlanet = useMemo(() => buildPlanetFromDraft(draft, 'preview'), [draft])

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
          clear()
          router.push('/resonance')
        } else {
          setRevealError('Something went wrong. Please try again.')
        }
      } catch {
        setRevealError('Network error. Please try again.')
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
              Resonance Calibration
            </p>
            <h1
              className="text-3xl sm:text-4xl font-semibold leading-tight"
              style={{ color: 'var(--foreground)' }}
            >
              Discover your cosmic identity
            </h1>
            <p
              className="text-sm sm:text-base leading-relaxed max-w-sm mx-auto"
              style={{ color: 'var(--ink)', opacity: 0.72 }}
            >
              A short ritual to shape the planet that represents you — and to find
              the ones you resonate with.
            </p>
          </div>

          <div className="divider-glow mx-auto w-24" aria-hidden="true" />

          <div className="flex flex-col items-center gap-4">
            <GlowButton
              variant="primary"
              className="w-full sm:w-auto px-10 py-3"
              onClick={() => setStep(1)}
            >
              Begin Calibration
            </GlowButton>
            <Link href="/sign-in" className="text-xs transition-colors" style={{ color: 'var(--ghost)', textDecoration: 'none' }}>
              Already have a planet?{' '}
              <span style={{ color: 'var(--star)' }}>Sign in</span>
            </Link>
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
              Your planet has taken shape
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
              {sessionPending ? 'Resolving…' : saving ? 'Saving…' : 'Save My Planet'}
            </GlowButton>
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
              Already have a planet?{' '}
              <span style={{ color: 'var(--star)' }}>Sign in</span>
            </button>
          </div>

          <button
            type="button"
            onClick={back}
            className="text-xs transition-colors"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ghost)' }}
          >
            ← Back
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
          ← Back
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
            onThemesChange={(themes) => setDraft({ ...draft, selectedThemes: themes })}
            onLifestyleChange={(l: Lifestyle) => setDraft({ ...draft, lifestyle: l })}
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
                Resonance signature
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
                How you relate — to yourself and to others.
              </p>
            </div>

            {RESONANCE_QUESTIONS.map((q) => {
              const currentValue = draft.resonanceAnswers?.[q.key]
              return (
                <div key={q.key} className="flex flex-col gap-3">
                  <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                    {q.question}
                    {!q.required && (
                      <span
                        className="ml-2 text-[10px] uppercase tracking-widest"
                        style={{ color: 'var(--ghost)', opacity: 0.5 }}
                      >
                        optional
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt) => {
                      const active = currentValue === opt.value
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setResonanceAnswer(q.key, opt.value)}
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
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="pt-2">
          <GlowButton
            variant="primary"
            fullWidth
            disabled={!canProceed}
            onClick={advance}
          >
            {step === 4 ? 'See my planet' : 'Next'}
          </GlowButton>
        </div>
      </div>
    </OnboardingShell>
  )
}
