'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function SocialLandingInner() {
  const searchParams = useSearchParams()

  useEffect(() => {
    async function route() {
      // 1. One possible error surface from Better Auth OAuth failure
      if (searchParams.get('error')) {
        window.location.href = '/sign-in?authError=1'
        return
      }

      // 2. Best-effort sessionStorage draft recovery (new user coming from /onboarding)
      try {
        const ready = sessionStorage.getItem('gs_onboarding_ready') === 'true'
        const draftRaw = sessionStorage.getItem('gs_onboarding_draft')
        if (ready && draftRaw) {
          const draft = JSON.parse(draftRaw)
          const res = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draft }),
          })
          if (res.ok) {
            sessionStorage.removeItem('gs_onboarding_draft')
            sessionStorage.removeItem('gs_onboarding_step')
            sessionStorage.removeItem('gs_onboarding_ready')
            window.location.href = '/resonance'
            return
          }
          // non-200: fall through to main routing
        }
      } catch {
        // sessionStorage unavailable, JSON parse error, or fetch failure: fall through
      }

      // 3. Main routing: returning user → /resonance, new user → /onboarding
      try {
        const res = await fetch('/api/my-planet')
        window.location.href = res.ok ? '/resonance' : '/onboarding'
      } catch {
        window.location.href = '/onboarding'
      }
    }

    route()
  }, [searchParams])

  return (
    <main
      className="flex min-h-screen items-center justify-center"
      style={{ color: 'var(--ghost)' }}
    >
      <span className="text-sm">Entering your universe…</span>
    </main>
  )
}

export default function SocialLandingPage() {
  return (
    <Suspense>
      <SocialLandingInner />
    </Suspense>
  )
}
