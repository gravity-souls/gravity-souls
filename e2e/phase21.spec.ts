/**
 * Phase 21 verification — onboarding gaps fixed additively, without touching
 * the step count, sign-up handoff, or sessionStorage contract:
 *
 *   1. Calibration (step 4 — resonance signature) is optional, not mandatory
 *      (docs/beta-execution.md: "Matching/calibration is optional"). A "Skip"
 *      action must let the user reach the reveal (step 5) and complete
 *      onboarding with resonanceAnswers empty/partial.
 *   2. A visibility choice (Profile.visibility: MEMBERS/PRIVATE) is surfaced
 *      during planet creation (step 2), not only later in /settings/planet.
 *      The choice persists to the created Profile; the default when untouched
 *      is MEMBERS.
 *
 * Reuses AUTH_WP (E2E.withPlanet — a user with an existing active planet), the
 * same fixture Phase 12's awakening-reveal tests already recalibrate through
 * /onboarding. Recalibration deactivates the prior planet and creates a new
 * one — Phase 12 already exercises this exact path, and global-setup resets
 * this fixture to a known state at the start of every full suite run.
 *
 * What CANNOT be automated (visual):
 *   - Awakening ceremony animation timing/rendering (covered by Phase 12).
 */

import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'
import { AUTH_WP, E2E } from './test-ids'

let prisma: PrismaClient

test.beforeAll(() => {
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })
})

test.afterAll(async () => {
  await prisma?.$disconnect()
})

test.describe('Phase 21 — calibration skip + onboarding visibility choice', () => {
  test.use({ storageState: AUTH_WP })

  test('skipping step 4 still reaches the reveal and completes onboarding; default visibility is MEMBERS', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' })

    // Step 0 → intro
    await page.getByRole('button', { name: /begin calibration/i }).click()

    // Step 1 → climate
    await page.getByRole('button', { name: /still/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 2 → theme + lifestyle. Visibility is deliberately left untouched
    // here to exercise the "default is MEMBERS" behaviour.
    await page.getByRole('button', { name: /memory/i }).first().click()
    await page.getByRole('button', { name: /solitary/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 3 → communication style
    await page.getByRole('button', { name: /analytical/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 4 → resonance signature: answer NOTHING, use Skip instead of Next.
    // The gated "Next"/"See my planet" button must still be disabled (calibration
    // is genuinely optional, not just an alternate always-enabled path).
    await expect(page.getByRole('button', { name: /see my planet/i })).toBeDisabled()
    await page.getByRole('button', { name: /skip/i }).click()

    // Step 5 → reveal reached despite zero resonance answers
    const saveBtn = page.getByRole('button', { name: /save my planet/i })
    await expect(saveBtn).toBeVisible({ timeout: 5000 })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()

    // Onboarding completed successfully — awakening state renders
    const myPlanetLink = page.getByRole('link', { name: /open my planet/i })
    await expect(myPlanetLink).toBeVisible({ timeout: 8000 })

    // resonanceAnswers persisted empty (skip, not a partial-but-required set)
    const latestResult = await prisma.questionnaireResult.findFirst({
      where: { userId: E2E.withPlanet.userId },
      orderBy: { createdAt: 'desc' },
    })
    expect(latestResult).not.toBeNull()
    expect(Object.keys(latestResult!.answers as object)).toHaveLength(0)

    // Visibility defaults to MEMBERS when the picker is never touched
    const profile = await prisma.profile.findUnique({ where: { userId: E2E.withPlanet.userId } })
    expect(profile?.visibility).toBe('MEMBERS')
  })

  test('choosing Private in step 2 persists to Profile.visibility', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /begin calibration/i }).click()
    await page.getByRole('button', { name: /still/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    await page.getByRole('button', { name: /memory/i }).first().click()
    await page.getByRole('button', { name: /solitary/i }).first().click()
    // Explicit Private choice, mirroring /settings/planet's PrivacySection copy.
    await page.getByRole('button', { name: /private/i }).click()
    await page.getByRole('button', { name: /^next$/i }).click()

    await page.getByRole('button', { name: /analytical/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Calibration skipped again — this fix is orthogonal to the visibility choice
    await page.getByRole('button', { name: /skip/i }).click()

    const saveBtn = page.getByRole('button', { name: /save my planet/i })
    await expect(saveBtn).toBeEnabled({ timeout: 5000 })
    await saveBtn.click()

    const myPlanetLink = page.getByRole('link', { name: /open my planet/i })
    await expect(myPlanetLink).toBeVisible({ timeout: 8000 })

    const profile = await prisma.profile.findUnique({ where: { userId: E2E.withPlanet.userId } })
    expect(profile?.visibility).toBe('PRIVATE')
  })

  test('recalibrating without touching the visibility picker does not reset an existing PRIVATE choice', async ({ page }) => {
    // Depends on the previous test having already set this account to PRIVATE.
    const before = await prisma.profile.findUnique({ where: { userId: E2E.withPlanet.userId } })
    expect(before?.visibility).toBe('PRIVATE')

    await page.goto('/onboarding', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: /begin calibration/i }).click()
    await page.getByRole('button', { name: /still/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    // Step 2 reached, but the visibility picker is deliberately left untouched —
    // this is the exact regression the ?? undefined update-branch guard prevents.
    await page.getByRole('button', { name: /memory/i }).first().click()
    await page.getByRole('button', { name: /solitary/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    await page.getByRole('button', { name: /analytical/i }).first().click()
    await page.getByRole('button', { name: /^next$/i }).click()

    await page.getByRole('button', { name: /skip/i }).click()

    const saveBtn = page.getByRole('button', { name: /save my planet/i })
    await expect(saveBtn).toBeEnabled({ timeout: 5000 })
    await saveBtn.click()

    const myPlanetLink = page.getByRole('link', { name: /open my planet/i })
    await expect(myPlanetLink).toBeVisible({ timeout: 8000 })

    const after = await prisma.profile.findUnique({ where: { userId: E2E.withPlanet.userId } })
    expect(after?.visibility).toBe('PRIVATE')
  })
})
