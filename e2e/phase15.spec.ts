/**
 * Phase 15 verification — Resonance orbit wired to real DB planet data.
 *
 * What CAN be automated:
 *   - Orbit nodes are visible for an authenticated resonator (real DB planets)
 *   - Selecting a node opens the drawer with real planet identity (not the empty state)
 *   - Drawer closes on Escape key
 *
 * What CANNOT be automated (visual):
 *   - Beam line colours and glow
 *   - Score ring rendering inside the drawer
 *   - Orbit node glow / active state styling
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

// Pre-dismiss Phase 14 CTA so we reach the orbital view on first load
const P14_KEY = 'gs_hint_dismissed_resonance-first-match-viewed'

test.describe('resonance orbit — real planet data', () => {
  test.use({ storageState: AUTH_WP })

  test.beforeEach(async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'domcontentloaded' })
    await page.evaluate((key) => localStorage.setItem(key, '1'), P14_KEY)
  })

  // ── 1. Orbit nodes visible ──────────────────────────────────────────────────

  test('orbit nodes are visible for authenticated resonator', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    // ResonancePlanetNode aria-label: "{name} — resonance score {score}"
    const node = page.getByRole('button', { name: /resonance score/i }).first()
    await expect(node).toBeVisible({ timeout: 8000 })
  })

  // ── 2. Drawer opens with real planet data ───────────────────────────────────

  test('selecting a node opens the drawer with planet identity', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    const node = page.getByRole('button', { name: /resonance score/i }).first()
    await expect(node).toBeVisible({ timeout: 8000 })
    await node.click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible()
    // "Compatibility" header is only rendered by DrawerContent (not the empty state)
    await expect(drawer.getByText(/compatibility/i)).toBeVisible()
  })

  // ── 3. Escape closes the drawer ─────────────────────────────────────────────

  test('drawer closes on Escape', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    const node = page.getByRole('button', { name: /resonance score/i }).first()
    await expect(node).toBeVisible({ timeout: 8000 })
    await node.click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
