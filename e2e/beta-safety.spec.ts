import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'
import { AUTH_WP, AUTH_NP, E2E } from './test-ids'

let prisma: PrismaClient
let communityId: string
test.beforeAll(async () => {
  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })
  const community = await prisma.community.create({ data: {
    slug: 'slow-thinkers', name: 'Slow Thinkers', symbol: '◎', tagline: 'Test community',
    description: 'Isolated safety test', keywords: [], mood: 'calm', accentColor: '#a78bfa',
  } })
  communityId = community.id
})
test.afterAll(async () => {
  if (communityId) await prisma.community.delete({ where: { id: communityId } })
  await prisma?.$disconnect()
})

test('anonymous discussion reads are repeatable and do not create content', async ({ request }) => {
  for (let i = 0; i < 3; i++) {
    const response = await request.get(`/api/communities/${communityId}/discussions`)
    expect(response.status()).toBe(200)
    expect(await response.json()).toEqual({ discussions: [] })
  }
  expect(await prisma.communityDiscussion.count({ where: { communityId } })).toBe(0)
  expect(await prisma.communityDiscussionReply.count({ where: { discussion: { communityId } } })).toBe(0)
  expect((await request.post('/api/communities/join', { data: { communityId } })).status()).toBe(401)
})

test.describe('authenticated API protections', () => {
  test.use({ storageState: AUTH_WP })

  test('concurrent joins never claim an ownerless community or award duplicate join XP', async ({ request }) => {
    const before = await prisma.xPEvent.count({ where: { userId: E2E.withPlanet.userId, type: 'GALAXY_JOINED' } })
    const results = await Promise.all(Array.from({ length: 4 }, () => request.post('/api/communities/join', { data: { communityId } })))
    for (const response of results) {
      expect(response.status()).toBe(200)
      expect((await response.json()).membership.role).toBe('MEMBER')
    }
    expect((await prisma.community.findUniqueOrThrow({ where: { id: communityId } })).creatorId).toBeNull()
    expect(await prisma.communityMembership.count({ where: { communityId } })).toBe(1)
    expect(await prisma.xPEvent.count({ where: { userId: E2E.withPlanet.userId, type: 'GALAXY_JOINED' } })).toBe(before + 1)
    const status = await request.patch(`/api/galaxies/${communityId}/events/nonexistent/status`, { data: { status: 'APPROVED' } })
    expect(status.status()).toBe(403)
  })

  test('invalid planet, calibration and message inputs do not mutate data', async ({ request }) => {
    const before = await prisma.planet.count({ where: { userId: E2E.withPlanet.userId, active: true } })
    for (const url of ['/api/planet', '/api/my-planet', '/api/questionnaire', '/api/onboarding/complete', '/api/conversations', '/api/communities/join']) {
      const response = await request.post(url, { data: 'null', headers: { 'Content-Type': 'application/json' } })
      expect(response.status(), url).toBe(400)
    }
    expect((await request.patch('/api/my-planet', { data: { abstractAxis: 101 } })).status()).toBe(400)
    expect((await request.post('/api/conversations', { data: { recipientId: E2E.noPlanet.userId, message: 'x'.repeat(2001) } })).status()).toBe(400)
    expect(await prisma.planet.count({ where: { userId: E2E.withPlanet.userId, active: true } })).toBe(before)
    expect(await prisma.directMessage.count()).toBe(0)
  })

  test('conversation participants remain enforced and a valid message persists', async ({ request, playwright }) => {
    const thread = await prisma.conversationThread.create({ data: { userAId: E2E.noPlanet.userId, userBId: E2E.handoff.userId } })
    try {
      expect((await request.get(`/api/conversations/${thread.id}`)).status()).toBe(403)
      expect((await request.post(`/api/conversations/${thread.id}`, { data: { content: 'intruder' } })).status()).toBe(403)
      const participant = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL, storageState: AUTH_NP })
      try {
        expect((await participant.post(`/api/conversations/${thread.id}`, { data: { content: '  Hello  ' } })).status()).toBe(201)
        expect((await prisma.directMessage.findFirstOrThrow({ where: { conversationId: thread.id } })).content).toBe('Hello')
      } finally { await participant.dispose() }
    } finally { await prisma.conversationThread.delete({ where: { id: thread.id } }) }
  })

  test('message failures retain the draft and IME Enter does not send', async ({ page }) => {
    const thread = await prisma.conversationThread.create({ data: { userAId: E2E.withPlanet.userId, userBId: E2E.noPlanet.userId } })
    try {
      await page.setViewportSize({ width: 390, height: 844 })
      await page.goto(`/messages/${thread.id}`)
      const composer = page.locator('textarea')
      await expect(composer).toHaveAttribute('maxlength', '2000')
      await composer.fill('你好，世界')
      let posts = 0
      await page.route(`**/api/conversations/${thread.id}`, async (route) => {
        if (route.request().method() === 'POST') {
          posts++
          await route.fulfill({ status: 503, json: { error: 'unavailable' } })
        } else await route.continue()
      })
      await composer.dispatchEvent('keydown', { key: 'Enter', isComposing: true })
      await expect(composer).toHaveValue('你好，世界')
      expect(posts).toBe(0)
      await composer.press('Enter')
      // Next.js's own route announcer also carries role="alert" — scope to the composer's own alert element.
      await expect(page.locator('p[role="alert"]')).toContainText('Your draft is kept')
      await expect(composer).toHaveValue('你好，世界')
      expect(await prisma.directMessage.count({ where: { conversationId: thread.id } })).toBe(0)
      await page.unroute(`**/api/conversations/${thread.id}`)
      await composer.press('Enter')
      await expect(composer).toHaveValue('')
      await expect(page.getByText('你好，世界', { exact: true })).toBeVisible()
      expect(await prisma.directMessage.count({ where: { conversationId: thread.id } })).toBe(1)
    } finally { await prisma.conversationThread.delete({ where: { id: thread.id } }) }
  })
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`galaxy empty/error states preserve real interactions at ${viewport.width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize(viewport)
    await page.goto('/galaxy/slow-thinkers')
    await expect(page.getByText('No discussions yet.', { exact: true })).toBeVisible()
    await expect(page.getByText('No posts yet. Join and start the first signal.')).toBeVisible()
    await expect(page.getByText('What book changed how slowly you allow yourself to think?')).toHaveCount(0)
    let fail = true
    await page.route(`**/api/communities/${communityId}/posts`, async (route) => {
      if (fail) await route.fulfill({ status: 503, json: { error: 'unavailable' } })
      else await route.continue()
    })
    await page.reload()
    await expect(page.getByText('Community posts could not be loaded.')).toBeVisible()
    fail = false
    await page.getByRole('button', { name: 'Try again', exact: true }).click()
    await expect(page.getByText('No posts yet. Join and start the first signal.')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
