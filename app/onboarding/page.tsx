'use client'

import { useState } from 'react'
import Link from 'next/link'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import GlowButton from '@/components/ui/GlowButton'

type Phase = 'intro' | 'calibrating'

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>('intro')

  if (phase === 'calibrating') {
    return (
      <OnboardingShell>
        <div className="flex flex-col gap-6">
          <button
            type="button"
            onClick={() => setPhase('intro')}
            className="self-start text-sm transition-colors"
            style={{ color: 'var(--ghost)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ← Back
          </button>

          <div
            className="rounded-2xl px-6 py-12 flex flex-col items-center gap-5 text-center"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid var(--border-soft)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl animate-pulse"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.25), rgba(99,102,241,0.08))',
                boxShadow: '0 0 0 1px rgba(167,139,250,0.2)',
              }}
              aria-hidden="true"
            >
              ◌
            </div>
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                Calibration sequence initializing
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
                The full resonance flow is coming in the next phase.
              </p>
            </div>
          </div>
        </div>
      </OnboardingShell>
    )
  }

  return (
    <OnboardingShell>
      <div className="flex flex-col gap-10">

        {/* Orb */}
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

        {/* Copy */}
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

        {/* Divider */}
        <div className="divider-glow mx-auto w-24" aria-hidden="true" />

        {/* CTA */}
        <div className="flex flex-col items-center gap-4">
          <GlowButton
            variant="primary"
            className="w-full sm:w-auto px-10 py-3"
            onClick={() => setPhase('calibrating')}
          >
            Begin Calibration
          </GlowButton>
          <Link
            href="/sign-in"
            className="text-xs transition-colors"
            style={{ color: 'var(--ghost)', textDecoration: 'none' }}
          >
            Already have a planet?{' '}
            <span style={{ color: 'var(--star)' }}>Sign in</span>
          </Link>
        </div>

      </div>
    </OnboardingShell>
  )
}
