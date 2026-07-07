'use client'

import { useCallback, useState } from 'react'
import { INITIAL_DRAFT, type PlanetDraft } from '@/types/creation'

const DRAFT_KEY = 'gs_onboarding_draft'
const STEP_KEY  = 'gs_onboarding_step'
const READY_KEY = 'gs_onboarding_ready'

function readDraft(): PlanetDraft {
  if (typeof window === 'undefined') return INITIAL_DRAFT
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY)
    if (!raw) return INITIAL_DRAFT
    return { ...INITIAL_DRAFT, ...JSON.parse(raw) }
  } catch {
    return INITIAL_DRAFT
  }
}

function readStep(): number {
  if (typeof window === 'undefined') return 0
  const raw = sessionStorage.getItem(STEP_KEY)
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function useOnboardingState() {
  const [draft, setDraftState] = useState<PlanetDraft>(readDraft)
  const [step,  setStepState]  = useState<number>(readStep)

  const setDraft = useCallback((d: PlanetDraft) => {
    setDraftState(d)
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* storage unavailable */ }
  }, [])

  const setStep = useCallback((n: number) => {
    setStepState(n)
    try { sessionStorage.setItem(STEP_KEY, String(n)) } catch { /* storage unavailable */ }
  }, [])

  const markReady = useCallback(() => {
    try { sessionStorage.setItem(READY_KEY, 'true') } catch { /* storage unavailable */ }
  }, [])

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(DRAFT_KEY)
      sessionStorage.removeItem(STEP_KEY)
      sessionStorage.removeItem(READY_KEY)
    } catch { /* storage unavailable */ }
  }, [])

  return { draft, setDraft, step, setStep, markReady, clear }
}
