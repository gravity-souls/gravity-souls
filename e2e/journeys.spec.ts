/**
 * Core journey suite — source of truth for the full auth/session/routing stack.
 *
 * These tests exercise the REAL auth flows (form sign-up, form sign-in, social-landing,
 * sign-out) rather than injected storageState sessions. They are the final gate before
 * any feature phase is considered done.
 *
 * Journey 1 — new user: sign-up + onboarding handoff → /resonance → reload → /my-planet
 * Journey 2 — existing user: sign-in → /resonance → reload → /my-planet
 * Journey 3 — social-landing: injected session → /resonance → reload
 * Journey 4 — sign-out / sign-back-in: protected redirect + ?next= return
 */

import { test, expect } from '@playwright/test'
import { E2E, JOURNEY, AUTH_WP, AUTH_SO } from './test-ids'

// ── Journey 1 ─────────────────────────────────────────────────────────────────
// New user sign-up with an onboarding draft in sessionStorage.
// Does NOT rely on injected storageState cookies.
// Exercises: authClient.signUp.email() → Set-Cookie → /api/onboarding/complete
//            → window.location.href = '/resonance' → reload → /my-planet

test.describe('Journey 1 — new user sign-up', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('sign-up → /api/onboarding/complete → /resonance → reload → /my-planet (no bounce to /sign-in)', async ({ page }) => {
    // Capture API response statuses for diagnostic output on failure
    const apiLog: Record<string, number> = {}
    page.on('response', (res) => {
      const u = new URL(res.url())
      if (u.pathname === '/api/onboarding/complete') apiLog['onboarding/complete'] = res.status()
      if (u.pathname === '/api/my-planet') apiLog['my-planet'] = res.status()
      if (u.pathname.startsWith('/api/auth/')) apiLog[u.pathname] = res.status()
    })

    // Navigate to sign-up with onboarding context
    await page.goto('/sign-up?from=onboarding')

    // Seed sessionStorage — mirrors what the onboarding page writes via useOnboardingState
    await page.evaluate(() => {
      const draft = {
        selectedThemes: ['inner structure', 'night & silence'],
        abstractAxis: 70,
        introspectiveAxis: 80,
        resonanceAnswers: {
          emotionalProcessing: 'alone',
          leadWith: 'curiosity',
          connectionSeeking: 'deep-slow',
        },
      }
      sessionStorage.setItem('gs_onboarding_draft', JSON.stringify(draft))
      sessionStorage.setItem('gs_onboarding_step', '5')
      sessionStorage.setItem('gs_onboarding_ready', 'true')
    })

    // Fill and submit sign-up form
    await page.fill('#name', JOURNEY.signUp.name)
    await page.fill('#email', JOURNEY.signUp.email)
    await page.fill('#password', JOURNEY.signUp.password)
    await page.click('button[type="submit"]')

    // Wait for the page to leave /sign-up (hard navigation via window.location.href)
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-up'), { timeout: 20_000 })
    const afterSignUp = new URL(page.url()).pathname

    // Diagnostic: log all captured statuses so we can see exactly where it broke
    console.log('[journey1] landed on:', afterSignUp)
    console.log('[journey1] API statuses:', JSON.stringify(apiLog))

    // Primary assertion: must land on /resonance, not /onboarding or /sign-in
    expect(afterSignUp, `Expected /resonance but got ${afterSignUp}. API log: ${JSON.stringify(apiLog)}`).toBe('/resonance')

    // /api/onboarding/complete must have been called and must have returned 200
    expect(apiLog['onboarding/complete'], '/api/onboarding/complete was not called or returned non-200').toBe(200)

    // Hard reload — session must persist (cookie survives a full page refresh)
    await page.reload({ waitUntil: 'networkidle' })
    const afterReload = new URL(page.url()).pathname
    expect(afterReload, `Expected /resonance after reload but got ${afterReload}`).toBe('/resonance')

    // Navigate to /my-planet — must stay there (not redirect to /sign-in or /onboarding)
    await page.goto('/my-planet')
    await page.waitForTimeout(3_000)
    const onMyPlanet = new URL(page.url()).pathname
    expect(onMyPlanet, `Expected /my-planet but got ${onMyPlanet}`).toBe('/my-planet')
  })
})

// ── Journey 2 ─────────────────────────────────────────────────────────────────
// Existing user with an active planet signs in via the form.
// Does NOT rely on injected storageState cookies.
// Exercises: authClient.signIn.email() → /api/my-planet check → window.location.href = '/resonance'

test.describe('Journey 2 — existing user sign-in', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('sign-in → /resonance → reload → /my-planet (no bounce to /sign-in)', async ({ page }) => {
    const apiLog: Record<string, number> = {}
    page.on('response', (res) => {
      const u = new URL(res.url())
      if (u.pathname === '/api/my-planet') apiLog['my-planet'] = res.status()
      if (u.pathname.startsWith('/api/auth/')) apiLog[u.pathname] = res.status()
    })

    await page.goto('/sign-in')
    await page.fill('#email', E2E.withPlanet.email)
    await page.fill('#password', E2E.withPlanet.password)
    await page.click('button[type="submit"]')

    // Priority 3 in sign-in: fetches /api/my-planet → ok → /resonance
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 20_000 })
    const afterSignIn = new URL(page.url()).pathname

    console.log('[journey2] landed on:', afterSignIn)
    console.log('[journey2] API statuses:', JSON.stringify(apiLog))

    expect(afterSignIn, `Expected /resonance but got ${afterSignIn}. API log: ${JSON.stringify(apiLog)}`).toBe('/resonance')

    // Hard reload — session must persist
    await page.reload({ waitUntil: 'networkidle' })
    const afterReload = new URL(page.url()).pathname
    expect(afterReload, `Expected /resonance after reload but got ${afterReload}`).toBe('/resonance')

    // Navigate to /my-planet
    await page.goto('/my-planet')
    await page.waitForTimeout(3_000)
    const onMyPlanet = new URL(page.url()).pathname
    expect(onMyPlanet, `Expected /my-planet but got ${onMyPlanet}`).toBe('/my-planet')
  })
})

// ── Journey 3 ─────────────────────────────────────────────────────────────────
// Social auth landing page with injected session (real OAuth round-trip not automatable).
// Verifies: /auth/social-landing routing + hard-nav to /resonance + reload persistence.

test.describe('Journey 3 — social-landing → /resonance → reload', () => {
  test.use({ storageState: AUTH_WP })

  test('/auth/social-landing → /resonance → reload (no bounce to /sign-in)', async ({ page }) => {
    await page.goto('/auth/social-landing', { waitUntil: 'commit' })
    await page.waitForURL('**/resonance', { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toBe('/resonance')

    // Hard reload — injected session must still be accepted by the server
    await page.reload({ waitUntil: 'networkidle' })
    const afterReload = new URL(page.url()).pathname
    expect(afterReload, `Expected /resonance after reload but got ${afterReload}`).toBe('/resonance')
  })
})

// ── Journey 4 ─────────────────────────────────────────────────────────────────
// Sign-out → protected route redirect → sign-in → return to intended destination.
// Uses a dedicated user (E2E.signOut) so no other test's session is affected.

test.describe('Journey 4 — sign-out / sign-back-in', () => {
  test.use({ storageState: AUTH_SO })

  test('sign-out → /resonance redirects to /sign-in → sign-in returns to /resonance', async ({ page }) => {
    // Confirm starting authenticated state
    await page.goto('/resonance')
    await page.waitForTimeout(2_000)
    expect(new URL(page.url()).pathname, 'Expected to start on /resonance').toBe('/resonance')

    // Sign out via the Better Auth API endpoint (deletes session from DB)
    const signOutStatus = await page.evaluate(async () =>
      (await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })).status
    )
    expect(signOutStatus).toBe(200)
    expect(await page.evaluate(async () => (await fetch('/api/auth/get-session')).json())).toBeNull()

    // Navigate to a protected route — proxy must now redirect to /sign-in?next=/resonance
    await page.goto('/resonance', { waitUntil: 'commit' })
    const redirectUrl = new URL(page.url())
    expect(redirectUrl.pathname, 'Proxy should redirect to /sign-in after sign-out').toBe('/sign-in')
    expect(redirectUrl.searchParams.get('next'), '?next= should be /resonance').toBe('/resonance')

    // Sign back in — sign-in page honours ?next= and navigates to /resonance
    await page.fill('#email', E2E.signOut.email)
    await page.fill('#password', E2E.signOut.password)
    await page.click('button[type="submit"]')

    await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 20_000 })
    const afterSignIn = new URL(page.url()).pathname
    expect(afterSignIn, `Expected /resonance after sign-back-in but got ${afterSignIn}`).toBe('/resonance')
  })
})
