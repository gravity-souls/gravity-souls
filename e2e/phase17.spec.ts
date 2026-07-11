/**
 * Phase 17 verification — Notifications page.
 *
 * What CAN be automated:
 *   - Authenticated access renders the page (empty state or list, not a crash / 404)
 *   - Unauthenticated access is intercepted by the proxy and redirected to sign-in
 *
 * What CANNOT be automated without seeding:
 *   - Mark-as-read visual state change (no notifications in fresh E2E DB)
 *   - Mark-all-read button (requires unread items)
 *   - Per-item delete (requires existing items)
 *   These are covered by manual smoke testing until a notification-seeding
 *   helper is added to global-setup.
 */

import { test, expect } from '@playwright/test'
import { AUTH_WP } from './test-ids'

// ── 1. Authenticated access ───────────────────────────────────────────────────

test.describe('notifications — authenticated', () => {
  test.use({ storageState: AUTH_WP })

  test('page renders for authenticated user — empty state or list', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'networkidle' })

    // The page must not stay on a 404 or redirect to sign-in
    const url = new URL(page.url())
    expect(url.pathname).toBe('/notifications')

    // Either the empty-state copy or the notification list must be present
    const hasEmpty = await page.getByText('No notifications yet').isVisible()
    const hasList  = await page.getByRole('list', { name: 'Notifications' }).isVisible()
    expect(hasEmpty || hasList).toBe(true)
  })

  test('page heading is visible', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'networkidle' })
    await expect(page.getByRole('heading', { level: 1, name: 'Notifications' })).toBeVisible()
  })
})

// ── 2. Unauthenticated access — proxy gate ────────────────────────────────────

test.describe('notifications — unauthenticated', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('proxy redirects to /sign-in?next=/notifications', async ({ page }) => {
    await page.goto('/notifications', { waitUntil: 'commit' })
    const url = new URL(page.url())
    expect(url.pathname).toBe('/sign-in')
    expect(url.searchParams.get('next')).toBe('/notifications')
  })
})
