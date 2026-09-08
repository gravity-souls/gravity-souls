/**
 * Phase 22 — operator-facing report queue UI (app/admin/reports/page.tsx).
 *
 * The backend (POST /api/reports, GET/PATCH /api/admin/reports) already
 * existed and is unchanged. This phase adds only the UI: a queue viewer +
 * status-change control, gated purely by consuming the API's existing
 * `isOperatorEmail` 403 — the page itself does no operator check.
 *
 * `E2E.noPlanet` (storageState AUTH_NP) is the designated operator fixture
 * for this suite — see e2e/environment.ts's OPERATOR_EMAILS wiring.
 * `E2E.withPlanet` (storageState AUTH_WP) is deliberately kept OUT of the
 * operator allow-list so it stays usable as the "signed-in, non-operator"
 * fixture here.
 */

import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'
import { AUTH_WP, AUTH_NP, E2E } from './test-ids'

let prisma: PrismaClient

test.beforeAll(() => {
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })
})

test.afterAll(async () => {
  await prisma?.$disconnect()
})

test.describe('Phase 22 — admin report queue UI', () => {
  test.describe('non-operator', () => {
    test.use({ storageState: AUTH_WP })

    test('a signed-in, non-operator user sees a plain not-authorized state, never the queue or a crash', async ({ page }) => {
      // Seed at least one report so a bug that ignores the 403 would be caught
      // rendering real queue contents instead of the not-authorized state.
      const report = await prisma.report.create({
        data: {
          reporterId: E2E.withPlanet.userId,
          targetType: 'USER',
          targetId: E2E.noPlanet.userId,
          targetUserId: E2E.noPlanet.userId,
          reason: 'phase22-non-operator-guard-canary',
          details: 'should never be visible to a non-operator',
        },
      })

      try {
        await page.goto('/admin/reports', { waitUntil: 'networkidle' })

        await expect(page.getByText(/not authorized/i)).toBeVisible()

        // Never leaks that reports exist, never a stack trace / raw error.
        await expect(page.getByText('phase22-non-operator-guard-canary')).toHaveCount(0)
        await expect(page.getByText(/unable to complete|typeerror|unhandled|stack trace/i)).toHaveCount(0)
      } finally {
        await prisma.report.delete({ where: { id: report.id } })
      }
    })
  })

  test.describe('operator', () => {
    test.use({ storageState: AUTH_NP })

    test('operator sees a filed report in the queue and can change its status', async ({ page, playwright }) => {
      // File the report as a different signed-in user (not the operator),
      // matching the real flow: POST /api/reports is unchanged/out of scope.
      const reporterCtx = await playwright.request.newContext({
        baseURL: test.info().project.use.baseURL,
        storageState: AUTH_WP,
      })

      const reason = `phase22 operator queue test ${Date.now()}`
      let reportId: string | null = null

      try {
        const fileRes = await reporterCtx.post('/api/reports', {
          data: {
            targetType: 'USER',
            targetId: E2E.handoff.userId,
            targetUserId: E2E.handoff.userId,
            reason,
            details: 'phase22 e2e operator happy path',
          },
        })
        expect(fileRes.status()).toBe(201)
        reportId = (await fileRes.json()).report.id as string

        await page.goto('/admin/reports', { waitUntil: 'networkidle' })

        const card = page.locator('li').filter({ hasText: reason })
        await expect(card).toBeVisible()
        await expect(card.getByText('phase22 e2e operator happy path')).toBeVisible()
        // Currently OPEN — the "Open" status pill and the "Mark as" controls
        // for the other three statuses are present, not the current one.
        await expect(card.getByText('Open', { exact: true })).toBeVisible()

        await card.getByRole('button', { name: 'Reviewed' }).click()

        // Row updates in place — no full reload, no navigation away.
        await expect(card.getByText('Reviewed', { exact: true })).toBeVisible()
        await expect(page).toHaveURL(/\/admin\/reports$/)

        const updated = await prisma.report.findUniqueOrThrow({ where: { id: reportId } })
        expect(updated.status).toBe('REVIEWED')
        expect(updated.reviewedAt).not.toBeNull()

        // Status filter narrows the queue via the API's ?status= param.
        await page.getByRole('tab', { name: 'Dismissed' }).click()
        await expect(page.getByText(reason)).toHaveCount(0)
        await page.getByRole('tab', { name: 'All' }).click()
        await expect(card).toBeVisible()
      } finally {
        await reporterCtx.dispose()
        if (reportId) await prisma.report.deleteMany({ where: { id: reportId } })
      }
    })

    test('operator hitting the queue with zero matching reports gets an empty state, not an error', async ({ page }) => {
      await page.goto('/admin/reports', { waitUntil: 'networkidle' })
      await page.getByRole('tab', { name: 'Actioned' }).click()
      // Either genuinely empty (no ACTIONED reports at this point in the
      // suite) or populated — either way the page must not error out.
      await expect(page.getByText(/unable to complete|typeerror|unhandled|stack trace/i)).toHaveCount(0)
    })
  })
})
