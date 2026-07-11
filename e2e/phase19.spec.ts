/**
 * Phase 19 verification — my-planet page is API-backed only.
 *
 * What CAN be automated:
 *   - Authenticated access renders the page (planet heading visible)
 *   - Unauthenticated access is intercepted by the proxy (/my-planet IS in the matcher)
 *
 * What CANNOT be automated without seeded data:
 *   - Recommended Communities section shows real community cards
 *     (depends on Community rows seeded in the E2E DB)
 *   - Resonant Matches carousel shows real planets
 *     (depends on other Planet rows in the E2E DB)
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

// ── 1. Authenticated access ───────────────────────────────────────────────────

test.describe('my-planet — authenticated', () => {
  test.use({ storageState: AUTH_WP })

  test('page renders planet heading for authenticated user', async ({ page }) => {
    await page.goto('/my-planet', { waitUntil: 'networkidle' })

    const url = new URL(page.url())
    expect(url.pathname).toBe('/my-planet')

    // Either the planet h1 or the "unformed planet" empty state must be visible
    const hasPlanet    = await page.getByRole('heading', { level: 1 }).isVisible()
    const hasUnformed  = await page.getByText('Your planet is unformed').isVisible()
    expect(hasPlanet || hasUnformed).toBe(true)
  })

  test('Recommended Communities section renders without crashing', async ({ page }) => {
    await page.goto('/my-planet', { waitUntil: 'networkidle' })

    // The section header is always rendered regardless of whether communities are seeded
    await expect(page.getByText('Recommended Communities')).toBeVisible({ timeout: 8000 })
  })
})

// ── 2. Unauthenticated access — proxy gate ────────────────────────────────────

test.describe('my-planet — unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('proxy redirects to /sign-in?next=/my-planet', async ({ page }) => {
    await page.goto('/my-planet', { waitUntil: 'commit' })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('next')).toBe('/my-planet')
  })
})
