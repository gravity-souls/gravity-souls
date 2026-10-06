import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

const config = { baseTexture: 'mars.jpg', tintColor: '#a78bfa', atmosphereColor: '#c4b5fd', atmosphereDensity: .12, rotationSpeed: 0, cloudOpacity: 0, hasRing: false, ringColor: '' }
const source = { id: 'mine', userId: 'owner', name: 'Owner planet', mood: 'calm', lifestyle: 'solitary', coreThemes: ['connection'], contentFragments: [], culturalTags: [], travelCities: [], abstractAxis: 62, introspectiveAxis: 70, visual: { coreColor: '#a78bfa', accentColor: '#c4b5fd', climateKey: 'calm' }, planetConfig: config }
const peer = { ...source, id: 'peer', userId: 'other', name: 'Hover peer' }

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'feedback-fixture', url: baseURL! }, { name: 'locale', value: 'en', url: baseURL! }])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/get-session') return route.fulfill({ json: { user: { id: 'owner', name: 'Owner' }, session: { id: 'fixture' } } })
    if (path === '/api/me') return route.fulfill({ json: { user: { id: 'owner', name: 'Owner', userLevel: 1, xp: 0, planetConfig: config }, planet: source, profile: { visibility: 'MEMBERS' } } })
    if (path === '/api/my-planet') return route.fulfill({ json: source })
    if (path === '/api/planets/peer') return route.fulfill({ json: peer })
    if (path === '/api/planets/mine') return route.fulfill({ json: source })
    if (path === '/api/planets') return route.fulfill({ json: { planets: [peer] } })
    if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], unreadCount: 0, unreadMessagesCount: 0, nextCursor: null } })
    if (path === '/api/conversations') return route.fulfill({ json: { conversations: [], unreadMessagesCount: 0, nextCursor: null } })
    return route.fulfill({ json: { following: false, followedBy: false, saved: false, available: true, events: [], communities: [], planets: [], posts: [] } })
  })
})

test('resonance waits for both owner and matches instead of flashing an empty orbit', async ({ page }) => {
  let ownerReady!: () => void, matchesReady!: () => void
  const ownerGate = new Promise<void>(resolve => { ownerReady = resolve })
  const matchesGate = new Promise<void>(resolve => { matchesReady = resolve })
  await page.route('**/api/my-planet', async route => { await ownerGate; await route.fulfill({ json: source }) })
  await page.route('**/api/planets', async route => { await matchesGate; await route.fulfill({ json: { planets: [peer] } }) })
  try {
    await page.goto('/resonance')
    const loader = page.getByRole('status', { name: en.starMap.loading, exact: true })
    await expect(loader).toBeVisible()
    await expect(page.getByText(en.resonance.noMatchesTitle, { exact: true })).toHaveCount(0)
    ownerReady()
    await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('/api/my-planet')))).toBe(true)
    await expect(loader).toBeVisible()
    await expect(page.getByText(en.resonance.noMatchesTitle, { exact: true })).toHaveCount(0)
    matchesReady()
    await expect(page.getByRole('button', { name: /Hover peer · Signal Score/ }).first()).toBeVisible()
    await expect(loader).toHaveCount(0)
  } finally { ownerReady(); matchesReady() }
})

test('resonance request failure offers retry; a successful empty response is an empty orbit', async ({ page }) => {
  let fail = true
  await page.route('**/api/planets', route => route.fulfill({ status: fail ? 500 : 200, json: fail ? {} : { planets: [] } }))
  await page.goto('/resonance')
  await expect(page.getByRole('alert').filter({ hasText: en.resonance.loadError })).toContainText(en.resonance.loadError)
  await expect(page.getByText(en.resonance.noMatchesTitle, { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: en.resonance.retry, exact: true }).click()
  await expect(page.getByText(en.resonance.noMatchesTitle, { exact: true })).toBeVisible()
  await expect(page.getByRole('alert').filter({ hasText: en.resonance.loadError })).toHaveCount(0)
})

test('an old public self link redirects to My Planet and retains the map return route', async ({ page }) => {
  await page.goto('/planet/mine?from=personal-star-map-saved')
  await expect(page).toHaveURL(/\/my-planet\?from=personal-star-map-saved$/)
  await expect(page.getByRole('link', { name: en.starMap.returnPersonalMap, exact: true })).toHaveAttribute('href', '/star-map?mode=personal&collection=saved')
})

for (const [locale, copy] of Object.entries({ en, fr, zh })) {
  test(`public planet omits missing modules and stored notifications follow ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'locale', value: locale, url: baseURL! }])
    await page.goto('/planet/peer')
    await expect(page.getByRole('heading', { name: peer.name, exact: true })).toBeVisible()
    await expect(page.getByText(copy.planetPage.cognitiveTitle, { exact: true })).toBeVisible()
    await expect(page.getByText(copy.planetPage.cognitiveDescription, { exact: true })).toBeVisible()
    await expect(page.getByText(copy.planetPage.themesDescription, { exact: true })).toBeVisible()
    for (const absent of [copy.planetPage.emotionalTitle, copy.planetPage.thoughtFragments, copy.planetPage.culturalCoordinates]) await expect(page.getByTestId('planet-profile-modules').getByText(absent, { exact: true })).toHaveCount(0)
    await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: [{ id: 'notice', type: 'NEW_FOLLOWER', title: 'A new planet is following yours', body: 'Étoile 星球 started following you', read: true, actionUrl: null, createdAt: new Date().toISOString() }], unreadCount: 0, unreadMessagesCount: 0, nextCursor: null } }))
    await page.goto('/notifications')
    const list = page.getByRole('list', { name: copy.inboxWorkflow.notifications, exact: true })
    await expect(list).toContainText(copy.notifications.newFollowerTitle)
    await expect(list).toContainText(copy.notifications.newFollowerBody.replace('{name}', 'Étoile 星球'))
    // The compact bell uses the same localized copy.
    await page.getByRole('button', { name: copy.topbar.notifications, exact: true }).click()
    await expect(page.getByText(copy.notifications.newFollowerTitle, { exact: true })).toHaveCount(2)
  })
}

for (const mode of ['discover', 'personal']) for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  test(`${mode} map gives hover feedback without opening a planet (${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion })
    await page.addInitScript(() => {
      type TrackedCanvas = HTMLCanvasElement & { lastCircle?: { x: number; y: number; radius: number }; peerPoint?: { x: number; y: number; radius: number } }
      const arc = CanvasRenderingContext2D.prototype.arc
      CanvasRenderingContext2D.prototype.arc = function(x, y, radius, ...rest) {
        (this.canvas as TrackedCanvas).lastCircle = { x, y, radius }
        return arc.call(this, x, y, radius, ...rest)
      }
      const original = CanvasRenderingContext2D.prototype.fillText
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...rest) {
        if (text === 'Hover peer') (this.canvas as TrackedCanvas).peerPoint = (this.canvas as TrackedCanvas).lastCircle
        return original.call(this, text, x, y, ...rest)
      }
    })
    await page.route('**/api/star-map?**', route => route.fulfill({ json: { groups: [{ id: 'calm', count: 1, color: '#a78bfa' }], nodes: [{ id: peer.id, name: peer.name, groupId: 'calm', level: 1, planetConfig: config, score: 80, href: '/planet/peer' }], total: 1, scope: mode === 'personal' ? 'personal' : 'allVisible', nextCursor: null, selfPlanet: { id: 'mine', name: source.name, href: '/my-planet', planetConfig: config } } }))
    await page.goto(`/star-map?mode=${mode}`)
    const canvas = page.locator('canvas[aria-label]')
    await canvas.scrollIntoViewIfNeeded()
    await expect.poll(() => canvas.evaluate(el => (el as HTMLCanvasElement & { peerPoint?: { x: number; y: number } }).peerPoint)).toBeTruthy()
    await expect.poll(async () => {
      await canvas.evaluate(el => {
        const point = (el as HTMLCanvasElement & { peerPoint: { x: number; y: number } }).peerPoint
        const rect = el.getBoundingClientRect()
        el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', pointerId: 9, clientX: rect.x + point.x, clientY: rect.y + point.y }))
      })
      return page.getByRole('tooltip').isVisible()
    }).toBe(true)
    const point = await canvas.evaluate(el => {
      const point = (el as HTMLCanvasElement & { peerPoint: { x: number; y: number; radius: number } }).peerPoint
      const rect = el.getBoundingClientRect()
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', pointerId: 9, clientX: rect.x + point.x, clientY: rect.y + point.y }))
      return point
    })
    const tooltip = page.getByRole('tooltip')
    await expect(tooltip).toHaveText(peer.name)
    if (reducedMotion === 'no-preference') {
      await expect.poll(() => canvas.evaluate((el, start) => {
        const current = (el as HTMLCanvasElement & { peerPoint: { x: number; y: number } }).peerPoint
        return Math.hypot(current.x - start.x, current.y - start.y)
      }, point)).toBeGreaterThan(0.1)
      await expect(tooltip).toHaveText(peer.name)
    }
    await expect.poll(async () => {
      const current = await canvas.evaluate(el => (el as HTMLCanvasElement & { peerPoint: { x: number; y: number; radius: number } }).peerPoint)
      const tipBox = (await tooltip.boundingBox())!
      const canvasBox = (await canvas.boundingBox())!
      const tipCenter = Math.max(tipBox.width / 2 + 8, Math.min(canvasBox.width - tipBox.width / 2 - 8, current.x))
      return Math.max(
        Math.abs(tipBox.x + tipBox.width / 2 - (canvasBox.x + tipCenter)),
        Math.abs(canvasBox.y + current.y - current.radius - (tipBox.y + tipBox.height) - 6),
      )
    }).toBeLessThan(2)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`/star-map\\?mode=${mode}$`))
    await canvas.evaluate(el => {
      const rect = el.getBoundingClientRect()
      el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', pointerId: 9, clientX: rect.x + 10, clientY: rect.bottom - 10 }))
    })
    await expect(page.getByRole('tooltip')).toHaveCount(0)
    const self = page.getByRole('link', { name: /Open my planet/ })
    await self.focus()
    const selfTip = page.getByRole('tooltip')
    await expect(selfTip).toHaveText(source.name)
    const avatarBox = (await self.locator('img').boundingBox())!
    const selfTipBox = (await selfTip.boundingBox())!
    expect(Math.abs(avatarBox.y - selfTipBox.y - selfTipBox.height - 6)).toBeLessThan(2)
    expect(Math.abs(avatarBox.x + avatarBox.width / 2 - selfTipBox.x - selfTipBox.width / 2)).toBeLessThan(2)
  })
}
