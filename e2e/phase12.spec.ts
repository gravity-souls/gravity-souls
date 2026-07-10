/**
 * Phase 12 verification — Cinematic Planet Reveal (awakening ceremony).
 *
 * What CAN be automated:
 *   - After authenticated save, PlanetAwakeningState renders instead of immediate redirect
 *   - "Save my planet — create account" CTA is absent for authenticated users
 *   - Planet name heading is present in the awakening
 *   - "See my resonances" CTA navigates to /resonance
 *   - URL stays on /onboarding until the user acts (no auto-redirect)
 *
 * What CANNOT be automated (visual/animation):
 *   - Phase timing: scale-in at 200ms, orbit rings at 700ms, text fade at 1400ms
 *   - CSS animation fidelity and ring expansion rendering
 *   - Gradient text rendering of the planet name
 *   - Background radial glow expansion
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

test.describe('Phase 12 — Cinematic planet reveal (authenticated path)', () => {
  test.use({ storageState: AUTH_WP })

  test('awakening renders after save; URL stays; "create account" absent; resonance CTA works', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' })

    // Step 0 → intro: begin calibration
    await page.getByRole('button', { name: /begin calibration/i }).click()

    // Step 1 → emotional tone: pick a climate
    await page.getByRole('button', { name: /still/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 2 → interests: pick one theme + one lifestyle
    await page.getByRole('button', { name: /memory/i }).first().click()
    await page.getByRole('button', { name: /solitary/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 3 → communication style (sliders are optional — no interaction needed)
    await page.getByRole('button', { name: /analytical/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 4 → resonance signature: three required questions
    await page.getByRole('button', { name: /withdraw alone/i }).click()
    await page.getByRole('button', { name: /^curiosity$/i }).click()
    await page.getByRole('button', { name: /deep and slow/i }).click()
    await page.getByRole('button', { name: /see my planet/i }).click()

    // Step 5 → save
    const saveBtn = page.getByRole('button', { name: /save my planet/i })
    await expect(saveBtn).toBeEnabled({ timeout: 5000 })
    await saveBtn.click()

    // Awakening must render — the planet name h1 appears in PlanetAwakeningState
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible({ timeout: 8000 })

    // No auto-redirect: URL should still be on onboarding (not resonance) at this point
    await expect(page).not.toHaveURL(/\/resonance/)

    // "Save my planet — create account" must NOT appear for authenticated users
    const createAccountLink = page.getByRole('link', { name: /create account/i })
    await expect(createAccountLink).not.toBeVisible()

    // "See my resonances" CTA is present and navigates to /resonance
    const resonanceLink = page.getByRole('link', { name: /see my resonances/i })
    await expect(resonanceLink).toBeVisible({ timeout: 4000 })
    await resonanceLink.click()
    await expect(page).toHaveURL(/\/resonance/, { timeout: 5000 })
  })

  test('"Open my planet" CTA is present in the awakening', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /begin calibration/i }).click()
    await page.getByRole('button', { name: /still/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /memory/i }).first().click()
    await page.getByRole('button', { name: /solitary/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /analytical/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()
    await page.getByRole('button', { name: /withdraw alone/i }).click()
    await page.getByRole('button', { name: /^curiosity$/i }).click()
    await page.getByRole('button', { name: /deep and slow/i }).click()
    await page.getByRole('button', { name: /see my planet/i }).click()
    await page.getByRole('button', { name: /save my planet/i }).click()

    // Awakening rendered — "Open my planet" link visible
    const myPlanetLink = page.getByRole('link', { name: /open my planet/i })
    await expect(myPlanetLink).toBeVisible({ timeout: 8000 })
    await expect(myPlanetLink).toHaveAttribute('href', '/my-planet')
  })
})
