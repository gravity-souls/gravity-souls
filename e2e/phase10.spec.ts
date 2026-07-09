/**
 * Phase 10 verification — Google OAuth wiring (non-Google-roundtrip checks only).
 *
 * What CAN be automated:
 *   - Google button active, Apple + WeChat disabled on sign-in and sign-up
 *   - /auth/social-landing → /resonance for authenticated user WITH planet
 *   - /auth/social-landing → /onboarding for authenticated user WITHOUT planet
 *   - /auth/social-landing?error=* → /sign-in?authError=1
 *   - Generated Google auth URL has clean client_id and correct redirect_uri
 *
 * What CANNOT be automated (requires live Google consent screen interaction):
 *   - OAuth round-trip (Google consent → callback → landing)
 *   - Account linking for same-email users
 *   - sessionStorage draft recovery after OAuth round-trip
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP, AUTH_NP } from './test-ids'

// ── 1. Button states on /sign-in ──────────────────────────────────────────────

test.describe('sign-in button states', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('Google button is enabled on /sign-in', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with google/i })
    await expect(btn).toBeEnabled()
  })

  test('Apple button is disabled on /sign-in', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with apple/i })
    await expect(btn).toBeDisabled()
  })

  test('WeChat button is disabled on /sign-in', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with wechat/i })
    await expect(btn).toBeDisabled()
  })
})

// ── 2. Button states on /sign-up ──────────────────────────────────────────────

test.describe('sign-up button states', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('Google button is enabled on /sign-up', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with google/i })
    await expect(btn).toBeEnabled()
  })

  test('Apple button is disabled on /sign-up', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with apple/i })
    await expect(btn).toBeDisabled()
  })

  test('WeChat button is disabled on /sign-up', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with wechat/i })
    await expect(btn).toBeDisabled()
  })
})

// ── 3. /auth/social-landing routing ──────────────────────────────────────────

test.describe('social-landing — user WITH planet', () => {
  test.use({ storageState: AUTH_WP })

  test('routes to /resonance', async ({ page }) => {
    await page.goto('/auth/social-landing', { waitUntil: 'commit' })
    await page.waitForURL('**/resonance', { timeout: 8000 })
    expect(new URL(page.url()).pathname).toBe('/resonance')
  })
})

test.describe('social-landing — user WITHOUT planet', () => {
  test.use({ storageState: AUTH_NP })

  test('routes to /onboarding', async ({ page }) => {
    await page.goto('/auth/social-landing', { waitUntil: 'commit' })
    await page.waitForURL('**/onboarding', { timeout: 8000 })
    expect(new URL(page.url()).pathname).toBe('/onboarding')
  })
})

test.describe('social-landing — error param', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('?error=access_denied routes to /sign-in?authError=1', async ({ page }) => {
    await page.goto('/auth/social-landing?error=access_denied', { waitUntil: 'commit' })
    await page.waitForURL('**/sign-in**', { timeout: 8000 })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('authError')).toBe('1')
  })
})

// ── 4. Generated Google auth URL has clean client_id ─────────────────────────

test.describe('Google OAuth URL correctness', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('client_id is clean and redirect_uri is localhost callback', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/social', {
      data: { provider: 'google', callbackURL: '/auth/social-landing' },
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.redirect).toBe(true)

    const url = new URL(body.url)
    const clientId = url.searchParams.get('client_id') ?? ''
    const redirectUri = url.searchParams.get('redirect_uri') ?? ''

    // client_id must not contain quotes or asterisk
    expect(clientId).not.toContain('"')
    expect(clientId).not.toContain('*')
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/)

    // redirect_uri must point to Better Auth's callback handler
    expect(redirectUri).toBe('http://localhost:3000/api/auth/callback/google')
  })
})
