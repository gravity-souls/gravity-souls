/**
 * Phase 11 verification — Apple OAuth wiring (non-Apple-roundtrip checks only).
 *
 * What CAN be automated:
 *   - Apple button enabled, Google button still enabled on sign-in and sign-up
 *   - Generated Apple auth URL has correct client_id, redirect_uri, response_type, response_mode, scope
 *   - POST to /api/auth/callback/apple with Origin: https://appleid.apple.com does NOT return 403 INVALID_ORIGIN
 *
 * What CANNOT be automated (requires real Apple ID and human interaction):
 *   - Apple consent screen round-trip
 *   - Name stored on first auth, blank on repeat auth
 *   - Private relay email handling
 *   - Routing through /auth/social-landing after successful Apple sign-in
 */

import { test, expect } from '@playwright/test'

// ── 1. Button states on /sign-in ──────────────────────────────────────────────

test.describe('sign-in button states (Phase 11)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('Apple button is enabled on /sign-in', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with apple/i })
    await expect(btn).toBeEnabled()
  })

  test('Google button still enabled on /sign-in (regression)', async ({ page }) => {
    await page.goto('/sign-in', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with google/i })
    await expect(btn).toBeEnabled()
  })
})

// ── 2. Button states on /sign-up ──────────────────────────────────────────────

test.describe('sign-up button states (Phase 11)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('Apple button is enabled on /sign-up', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with apple/i })
    await expect(btn).toBeEnabled()
  })

  test('Google button still enabled on /sign-up (regression)', async ({ page }) => {
    await page.goto('/sign-up', { waitUntil: 'networkidle' })
    const btn = page.getByRole('button', { name: /continue with google/i })
    await expect(btn).toBeEnabled()
  })
})

// ── 3. Generated Apple auth URL correctness ───────────────────────────────────

test.describe('Apple OAuth URL correctness', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('client_id, redirect_uri, response_type, response_mode, scope are correct', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/social', {
      data: { provider: 'apple', callbackURL: '/auth/social-landing' },
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    })
    expect(res.ok()).toBeTruthy()
    const body = await res.json()
    expect(body.redirect).toBe(true)

    const url = new URL(body.url)
    expect(url.hostname).toBe('appleid.apple.com')

    const clientId = url.searchParams.get('client_id') ?? ''
    expect(clientId).not.toContain('"')
    expect(clientId).not.toContain('*')
    expect(clientId.length).toBeGreaterThan(0)

    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/callback/apple')

    const responseType = url.searchParams.get('response_type') ?? ''
    expect(responseType).toContain('code')
    expect(responseType).toContain('id_token')

    expect(url.searchParams.get('response_mode')).toBe('form_post')

    const scope = url.searchParams.get('scope') ?? ''
    expect(scope).toContain('email')
    expect(scope).toContain('name')
  })
})

// ── 4. trustedOrigins: Apple form_post callback not rejected with INVALID_ORIGIN ──

test.describe('Apple callback origin check', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('POST /api/auth/callback/apple with Origin: https://appleid.apple.com does not return 403', async ({ request }) => {
    // This test verifies that https://appleid.apple.com is in trustedOrigins.
    // Full callback processing will fail (missing valid state/code) — that is expected.
    // The only assertion is that the response is NOT a 403 INVALID_ORIGIN.
    const res = await request.post('/api/auth/callback/apple', {
      form: { code: 'fake_code', state: 'fake_state', id_token: 'fake_token' },
      headers: { 'Origin': 'https://appleid.apple.com' },
    })
    expect(res.status()).not.toBe(403)
  })
})
