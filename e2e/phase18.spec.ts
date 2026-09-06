/**
 * Phase 18 verification — Messages pages are API-backed only.
 *
 * What CAN be automated:
 *   - Authenticated access renders the messages list (empty inbox or list)
 *   - ?to=<bogus-uuid> shows the "signal unavailable" error state (no mock fallback)
 *   - Unauthenticated access shows the client-side "sign in required" state
 *     (/messages is not in the proxy matcher — auth gate is handled by the 401 API response)
 *
 * What CANNOT be automated without seeded conversations:
 *   - Opening a real /messages/<id> conversation
 *   - Sending a message
 *   These require a seeded conversation in global-setup.
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

// ── 1. Authenticated: messages list ───────────────────────────────────────────

test.describe('messages — authenticated list', () => {
  test.use({ storageState: AUTH_WP })

  test('page renders for authenticated user — empty inbox or conversation list', async ({ page }) => {
    await page.goto('/messages', { waitUntil: 'networkidle' })

    const url = new URL(page.url())
    expect(url.pathname).toBe('/messages')

    const hasEmpty = await page.getByText('No beams yet').isVisible()
    const hasList  = await page.locator('a[href^="/messages/"]').first().isVisible()
    expect(hasEmpty || hasList).toBe(true)
  })

  test('page heading is visible', async ({ page }) => {
    await page.goto('/messages', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
})

// ── 2. Authenticated: bogus planet ID shows error state ───────────────────────

test.describe('messages — invalid ?to= target', () => {
  test.use({ storageState: AUTH_WP })

  test('bogus UUID shows signal-unavailable error state', async ({ page }) => {
    await page.goto(
      '/messages?to=00000000-0000-0000-0000-000000000000',
      { waitUntil: 'networkidle' },
    )

    // EmptyState title when openError is set
    await expect(page.getByText('Signal unavailable')).toBeVisible({ timeout: 8000 })
    // Subtitle from t('planetMissing')
    await expect(page.getByText('This planet could not be found anymore.')).toBeVisible()
  })
})

// ── 3. Unauthenticated: client-side auth gate ─────────────────────────────────

test.describe('messages — unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('shows sign-in required state when not authenticated', async ({ page }) => {
    // /messages is not in the proxy matcher — the page loads and the API returns 401
    await page.goto('/messages', { waitUntil: 'networkidle' })

    await expect(page.getByText('Sign in required')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('main').getByRole('link', { name: 'Sign in' })).toBeVisible()
  })
})
