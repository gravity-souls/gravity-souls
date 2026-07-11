/**
 * Phase 13 verification — First-session hint on /resonance.
 *
 * What CAN be automated:
 *   - Hint visible when localStorage key absent (authenticated resonator user)
 *   - Hint text content is correct
 *   - Clicking "Got it" hides the hint immediately
 *   - Hint does not reappear after dismissal (localStorage key persists in-session)
 *   - Hint absent when localStorage key is pre-set (returning user)
 *   - Explorer branch unaffected (hint not rendered for users without a planet)
 *
 * What CANNOT be automated (visual):
 *   - CSS styling and layout of the hint strip
 *   - Spacing relative to SessionStats
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP, AUTH_NP } from './test-ids'

const HINT_KEY = 'gs_hint_dismissed_resonance-first-session'
// Phase 14 CTA suppresses Phase 13 hint until the user completes it.
// Pre-set this key so FirstMatchCTA is already dismissed and FirstSessionHint renders.
const P14_KEY  = 'gs_hint_dismissed_resonance-first-match-viewed'
const HINT_TEXT = 'Your orbit is live'

// ── 1. Hint visible for first-time resonator visit ────────────────────────────

test.describe('first-session hint — first visit', () => {
  test.use({ storageState: AUTH_WP })

  test.beforeEach(async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'domcontentloaded' })
    await page.evaluate((key) => localStorage.setItem(key, '1'), P14_KEY)
  })

  test('hint strip is visible when localStorage key is absent', async ({ page }) => {
    // Phase 14 key pre-set in beforeEach; Phase 13 key absent — hint should appear
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    const hint = page.getByRole('status')
    await expect(hint).toBeVisible({ timeout: 6000 })
    await expect(hint).toContainText(HINT_TEXT)
    await expect(hint).toContainText('Tap any to see what draws you together')
  })
})

// ── 2. Dismissal hides the hint immediately ───────────────────────────────────

test.describe('first-session hint — dismissal', () => {
  test.use({ storageState: AUTH_WP })

  test.beforeEach(async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'domcontentloaded' })
    await page.evaluate((key) => localStorage.setItem(key, '1'), P14_KEY)
  })

  test('clicking "Got it" hides the hint', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    const hint = page.getByRole('status')
    await expect(hint).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: /got it/i }).click()

    await expect(hint).not.toBeVisible()
  })

  test('hint does not reappear on reload after dismissal', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    await expect(page.getByRole('status')).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: /got it/i }).click()

    // Reload and confirm hint is gone
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.getByRole('status')).not.toBeVisible()
  })

  test('dismissal writes the correct localStorage key', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    await expect(page.getByRole('status')).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: /got it/i }).click()

    const value = await page.evaluate((key) => localStorage.getItem(key), HINT_KEY)
    expect(value).toBe('1')
  })
})

// ── 3. Returning user — hint pre-dismissed ────────────────────────────────────

test.describe('first-session hint — returning user', () => {
  test.use({ storageState: AUTH_WP })

  test('hint not shown when localStorage key is pre-set', async ({ page }) => {
    // Simulate a returning user by setting the key before navigation
    await page.goto('/resonance', { waitUntil: 'domcontentloaded' })
    await page.evaluate((key) => localStorage.setItem(key, '1'), HINT_KEY)

    await page.reload({ waitUntil: 'networkidle' })

    await expect(page.getByRole('status')).not.toBeVisible()
  })
})

// ── 4. Explorer branch unaffected ─────────────────────────────────────────────

test.describe('first-session hint — explorer state', () => {
  test.use({ storageState: AUTH_NP })

  test('hint not rendered for users without a planet (explorer state)', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    // Explorer state renders ResonanceEmptyState, not the orbital view
    // The hint lives only in the resonator branch, so it must be absent
    await expect(page.getByRole('status')).not.toBeVisible()
  })
})
