/**
 * Phase 20 verification — galaxy identity/content resolves real Community
 * rows, not the retired lib/mock-galaxies.ts.
 *
 * Regression coverage for the production bug this rewiring fixes:
 * `/galaxy/[slug]` used to 404 based on a static, hardcoded list of 8 slugs
 * while fetching real posts/discussions from the live community APIs for
 * that same page — so any real Community created at runtime whose slug
 * wasn't one of the 8 hardcoded ones hard-404'd, even though its content
 * APIs worked fine. See docs/adr/0001-galaxy-content-model.md.
 */

import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'

let prisma: PrismaClient
let communityId: string

const REAL_SLUG = 'phase20-real-galaxy'
const REAL_NAME = 'Phase 20 Real Galaxy'
const REAL_TAGLINE = 'A galaxy resolved from a real Community row.'
const MISSING_SLUG = 'phase20-does-not-exist'

test.beforeAll(async () => {
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })
  const community = await prisma.community.create({
    data: {
      slug: REAL_SLUG,
      name: REAL_NAME,
      symbol: '✺',
      tagline: REAL_TAGLINE,
      description: 'Created for phase20 e2e coverage of the mock-galaxies retirement.',
      keywords: ['phase20'],
      mood: 'vibrant',
      accentColor: '#a78bfa',
      maturity: 'forming',
    },
  })
  communityId = community.id
})

test.afterAll(async () => {
  if (communityId) await prisma.community.delete({ where: { id: communityId } })
  await prisma?.$disconnect()
})

test('a real Community row resolves at /galaxy/[slug] instead of 404ing', async ({ page }) => {
  await page.goto(`/galaxy/${REAL_SLUG}`, { waitUntil: 'networkidle' })

  const url = new URL(page.url())
  expect(url.pathname).toBe(`/galaxy/${REAL_SLUG}`)

  await expect(page.getByRole('heading', { name: REAL_NAME })).toBeVisible()
  await expect(page.getByText(REAL_TAGLINE)).toBeVisible()
})

test('a slug with no matching Community shows the real not-found state, not a blank crash', async ({ page }) => {
  await page.goto(`/galaxy/${MISSING_SLUG}`, { waitUntil: 'networkidle' })

  // Rendered by app/not-found.tsx via notFound() — confirms the gate is now
  // driven by the same live API the rest of the page already used, not a
  // static mock list that could disagree with it.
  await expect(page.getByText("This planet doesn't exist")).toBeVisible()
})

test('/galaxies directory shows real communities with real, derived member counts', async ({ page }) => {
  await page.goto('/galaxies', { waitUntil: 'networkidle' })

  await expect(page.getByText(REAL_NAME)).toBeVisible()
  // memberCount is derived from _count.memberships (0 — no membership rows
  // exist for this fixture yet), never a hand-authored number like the old
  // mock catalogue's (e.g. 312, 548, 671).
  await expect(page.getByText('0 members')).toBeVisible()
})
