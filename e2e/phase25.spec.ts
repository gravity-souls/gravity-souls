/**
 * Phase 25 — sign-up policy-acceptance checkbox + POST /api/user/policy-acceptance.
 *
 * Founder-approved shape:
 *   - The sign-up form has a required, unchecked-by-default checkbox linking to
 *     /legal/terms, /legal/privacy, /legal/guidelines. Submission is blocked
 *     (disabled submit button) until it's checked.
 *   - On a successful sign-up, the client calls POST /api/user/policy-acceptance,
 *     which records all three PolicyType values (TERMS, PRIVACY, GUIDELINES) at
 *     lib/policy-versions.ts's CURRENT_POLICY_VERSION for the authenticated user.
 *   - The endpoint is idempotent: upserting on the (userId, policyType, version)
 *     unique constraint, so calling it twice never throws and never duplicates rows.
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'
import { TEST_BASE_URL } from './environment'
import { CURRENT_POLICY_VERSION } from '../lib/policy-versions'

let prisma: PrismaClient

const stamp = Date.now()
const signUpName = 'Phase25 Signup'
const signUpEmail = `gs_phase25_signup_${stamp}@test.local`
const signUpPassword = 'Phase25Password!1'

const idempotentName = 'Phase25 Idempotent'
const idempotentEmail = `gs_phase25_idem_${stamp}@test.local`
const idempotentPassword = 'Phase25Password!2'

let signUpUserId: string | null = null
let idempotentUserId: string | null = null

async function signUp(request: APIRequestContext, name: string, email: string, password: string) {
  const res = await request.post('/api/auth/sign-up/email', { data: { name, email, password } })
  if (!res.ok()) throw new Error(`sign-up failed for ${email}: ${res.status()} ${await res.text()}`)
  const sessionRes = await request.get('/api/auth/get-session')
  const sessionData = await sessionRes.json()
  return sessionData.user.id as string
}

test.describe.serial('Phase 25 — sign-up policy acceptance', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test.beforeAll(async () => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })
  })

  test.afterAll(async () => {
    try {
      const ids = [signUpUserId, idempotentUserId].filter((id): id is string => Boolean(id))
      if (ids.length > 0) await prisma.user.deleteMany({ where: { id: { in: ids } } })
    } finally {
      await prisma?.$disconnect()
    }
  })

  test('sign-up submit is blocked until the policy checkbox is checked', async ({ page }) => {
    await page.goto('/sign-up')
    await page.fill('#name', signUpName)
    await page.fill('#email', signUpEmail)
    await page.fill('#password', signUpPassword)

    const submit = page.locator('button[type="submit"]')
    const checkbox = page.locator('#policyAcceptance')

    await expect(checkbox).not.toBeChecked()
    await expect(submit).toBeDisabled()

    await checkbox.check()
    await expect(submit).toBeEnabled()

    // Reset for the next test, which performs the real submission.
    await checkbox.uncheck()
    await expect(submit).toBeDisabled()
  })

  test('a full sign-up with the checkbox checked succeeds and records PolicyAcceptance for all three types', async ({ page }) => {
    await page.goto('/sign-up')
    await page.fill('#name', signUpName)
    await page.fill('#email', signUpEmail)
    await page.fill('#password', signUpPassword)
    await page.check('#policyAcceptance')

    await page.click('button[type="submit"]')

    // Hard navigation via window.location.href once sign-up + follow-up calls resolve.
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-up'), { timeout: 20_000 })

    const user = await prisma.user.findUniqueOrThrow({ where: { email: signUpEmail } })
    signUpUserId = user.id

    // The policy-acceptance call is fire-and-forget from the client's perspective
    // (same posture as /api/user/language, /api/user/planet-config), so poll
    // briefly rather than assuming it already landed by the time we query.
    await expect.poll(
      () => prisma.policyAcceptance.count({ where: { userId: signUpUserId as string, version: CURRENT_POLICY_VERSION } }),
      { timeout: 10_000 },
    ).toBe(3)

    const rows = await prisma.policyAcceptance.findMany({ where: { userId: signUpUserId } })
    expect(rows.map((r) => r.policyType).sort()).toEqual(['GUIDELINES', 'PRIVACY', 'TERMS'])
    for (const row of rows) expect(row.version).toBe(CURRENT_POLICY_VERSION)
  })

  test('POST /api/user/policy-acceptance twice does not error and does not create duplicate rows', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: TEST_BASE_URL })
    idempotentUserId = await signUp(ctx, idempotentName, idempotentEmail, idempotentPassword)

    const first = await ctx.post('/api/user/policy-acceptance', { data: {} })
    expect(first.status()).toBe(201)
    const firstBody = await first.json()
    expect(firstBody.accepted).toBe(true)
    expect(firstBody.version).toBe(CURRENT_POLICY_VERSION)

    const second = await ctx.post('/api/user/policy-acceptance', { data: {} })
    expect(second.status()).toBe(201)

    const rows = await prisma.policyAcceptance.findMany({ where: { userId: idempotentUserId } })
    expect(rows.length).toBe(3)
    expect(rows.map((r) => r.policyType).sort()).toEqual(['GUIDELINES', 'PRIVACY', 'TERMS'])
    for (const row of rows) expect(row.version).toBe(CURRENT_POLICY_VERSION)

    await ctx.dispose()
  })
})
