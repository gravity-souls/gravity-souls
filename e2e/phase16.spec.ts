/**
 * Phase 16 verification — Planet detail page is API-backed only.
 *
 * What CAN be automated:
 *   - Navigating from the resonance drawer "View Planet" link renders a real planet profile
 *   - A bogus UUID renders the explicit not-found empty state without crashing
 *
 * What CANNOT be automated (visual):
 *   - PlanetHero styling, glow, and texture rendering
 *   - Resonance map layout
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

const P14_KEY = 'gs_hint_dismissed_resonance-first-match-viewed'

// ── 1. View Planet from resonance drawer ──────────────────────────────────────

test.describe('planet detail — real DB planet via resonance drawer', () => {
  test.use({ storageState: AUTH_WP })

  test.beforeEach(async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'domcontentloaded' })
    await page.evaluate((key) => localStorage.setItem(key, '1'), P14_KEY)
  })

  test('View Planet link lands on a real planet profile', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })

    // Open the resonance drawer on the first orbit node
    const node = page.getByRole('button', { name: /resonance score/i }).first()
    await expect(node).toBeVisible({ timeout: 8000 })
    await node.click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()

    // Click the "View Planet →" link inside the open drawer
    const viewLink = drawer.getByRole('link', { name: /view planet/i })
    await expect(viewLink).toBeVisible()

    await Promise.all([
      page.waitForURL('**/planet/**'),
      viewLink.click(),
    ])

    // PlanetHero renders an <h1> with the planet name
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible({ timeout: 8000 })
    await expect(heading).not.toBeEmpty()
  })
})

// ── 2. Bogus UUID renders not-found empty state ────────────────────────────────

test.describe('planet detail — not-found state', () => {
  test.use({ storageState: AUTH_WP })

  test('visiting a nonexistent UUID shows the not-found empty state', async ({ page }) => {
    // A valid UUID format that will never exist in the DB
    await page.goto('/planet/00000000-0000-0000-0000-000000000000', { waitUntil: 'networkidle' })

    await expect(page.getByText('Planet not found')).toBeVisible({ timeout: 8000 })
    // Confirm it did not crash (the return-to-stream link is present)
    await expect(page.getByRole('link', { name: /return to stream/i })).toBeVisible()
  })
})
