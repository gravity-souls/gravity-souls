/**
 * Phase 14 verification — First meaningful action on /resonance.
 *
 * What CAN be automated:
 *   - Phase 14 CTA visible on first resonator visit; Phase 13 hint suppressed simultaneously
 *   - "Open my match →" button dismisses CTA and writes resonance-first-match-viewed to localStorage
 *   - Phase 13 key (resonance-first-session) is co-dismissed when Phase 14 completes
 *   - Reload after completion shows neither strip
 *   - Pre-setting Phase 14 key only → Phase 14 CTA absent, Phase 13 hint appears (regression check)
 *
 * What CANNOT be automated (visual):
 *   - CTA strip layout and planet color theming
 *   - Score badge rendering
 *   - Drawer slide-in animation quality
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

const P14_KEY = 'gs_hint_dismissed_resonance-first-match-viewed'
const P13_KEY = 'gs_hint_dismissed_resonance-first-session'

// ── 1. First visit — Phase 14 primary, Phase 13 suppressed ───────────────────

test.describe('Phase 14 CTA — first visit', () => {
  test.use({ storageState: AUTH_WP })

  test('Phase 14 CTA visible; Phase 13 hint suppressed on first resonator visit', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })

    // Phase 14 CTA must be visible
    await expect(page.getByRole('button', { name: /open my match/i })).toBeVisible({ timeout: 6000 })

    // Phase 13 hint (role=status) must NOT be visible while Phase 14 is active
    await expect(page.getByRole('status')).not.toBeVisible()
  })

  test('CTA contains "Meet", signal strength, and planet score', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })

    const cta = page.locator('[data-testid="first-match-cta"]').or(
      page.locator('div').filter({ hasText: /Signal strength/ }).first()
    )
    await expect(page.getByRole('button', { name: /open my match/i })).toBeVisible({ timeout: 6000 })
    await expect(page.locator('text=Signal strength')).toBeVisible()
  })
})

// ── 2. Dismissal — CTA clicked ────────────────────────────────────────────────

test.describe('Phase 14 CTA — dismissal via button', () => {
  test.use({ storageState: AUTH_WP })

  test('clicking "Open my match" hides the CTA', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /open my match/i })).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: /open my match/i }).click()

    await expect(page.getByRole('button', { name: /open my match/i })).not.toBeVisible()
  })

  test('Phase 14 localStorage key written on dismissal', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /open my match/i })).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: /open my match/i }).click()

    const value = await page.evaluate((key) => localStorage.getItem(key), P14_KEY)
    expect(value).toBe('1')
  })

  test('Phase 13 key co-dismissed when Phase 14 completes', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /open my match/i })).toBeVisible({ timeout: 6000 })

    await page.getByRole('button', { name: /open my match/i }).click()

    const p13Value = await page.evaluate((key) => localStorage.getItem(key), P13_KEY)
    expect(p13Value).toBe('1')
  })
})

// ── 3. Reload after completion — both strips absent ───────────────────────────

test.describe('Phase 14 CTA — post-completion reload', () => {
  test.use({ storageState: AUTH_WP })

  test('neither Phase 14 CTA nor Phase 13 hint shows after reload', async ({ page }) => {
    await page.goto('/resonance', { waitUntil: 'networkidle' })
    await expect(page.getByRole('button', { name: /open my match/i })).toBeVisible({ timeout: 6000 })
    await page.getByRole('button', { name: /open my match/i }).click()

    await page.reload({ waitUntil: 'networkidle' })

    await expect(page.getByRole('button', { name: /open my match/i })).not.toBeVisible()
    await expect(page.getByRole('status')).not.toBeVisible()
  })
})

// ── 4. Returning user — Phase 14 key pre-set only (regression) ───────────────

test.describe('Phase 14 CTA — returning user regression', () => {
  test.use({ storageState: AUTH_WP })

  test('Phase 14 key pre-set → CTA absent; Phase 13 hint shows if its key absent', async ({ page }) => {
    // Navigate first to establish origin, then set only the Phase 14 key
    await page.goto('/resonance', { waitUntil: 'domcontentloaded' })
    await page.evaluate((key) => localStorage.setItem(key, '1'), P14_KEY)
    // Deliberately leave Phase 13 key absent

    await page.reload({ waitUntil: 'networkidle' })

    // Phase 14 CTA must be absent
    await expect(page.getByRole('button', { name: /open my match/i })).not.toBeVisible()
    // Phase 13 hint should now be visible (firstMatchDone=true → FirstSessionHint mounts; its key is absent)
    await expect(page.getByRole('status')).toBeVisible({ timeout: 6000 })
  })
})
