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
  await expect(page.getByRole('alert')).toContainText(en.resonance.loadError)
  await expect(page.getByText(en.resonance.noMatchesTitle, { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: en.resonance.retry, exact: true }).click()
  await expect(page.getByText(en.resonance.noMatchesTitle, { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
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
    for (const absent of [copy.planetPage.emotionalTitle, copy.planetPage.thoughtFragments, copy.planetPage.culturalCoordinates]) await expect(page.getByText(absent, { exact: true })).toHaveCount(0)
    await page.route('**/api/notifications', route => route.fulfill({ json: { notifications: [{ id: 'notice', type: 'NEW_FOLLOWER', title: en.notifications.newFollowerTitle, body: en.notifications.newFollowerBody.replace('{name}', 'Étoile 星球'), read: true, actionUrl: null, createdAt: new Date().toISOString() }], unreadCount: 0, unreadMessagesCount: 0, nextCursor: null } }))
    await page.goto('/notifications')
    const list = page.getByRole('list', { name: copy.inboxWorkflow.notifications, exact: true })
    await expect(list).toContainText(copy.notifications.newFollowerTitle)
    await expect(list).toContainText(copy.notifications.newFollowerBody.replace('{name}', 'Étoile 星球'))
    // The compact bell uses the same localized copy.
    await page.getByRole('button', { name: copy.topbar.notifications, exact: true }).click()
    await expect(page.getByText(copy.notifications.newFollowerTitle, { exact: true })).toHaveCount(2)
  })
}

for (const mode of ['discover', 'personal']) {
  test(`${mode} map gives hover feedback without opening a planet`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.fillText
      CanvasRenderingContext2D.prototype.fillText = function(text, x, y, ...rest) {
        if (text === 'Hover peer') (this.canvas as HTMLCanvasElement & { peerPoint?: { x: number; y: number } }).peerPoint = { x, y }
        return original.call(this, text, x, y, ...rest)
      }
    })
    await page.route('**/api/star-map?**', route => route.fulfill({ json: { groups: [{ id: 'calm', count: 1, color: '#a78bfa' }], nodes: [{ id: peer.id, name: peer.name, groupId: 'calm', level: 1, planetConfig: config, score: 80, href: '/planet/peer' }], total: 1, scope: mode === 'personal' ? 'personal' : 'allVisible', nextCursor: null, selfPlanet: { id: 'mine', name: source.name, href: '/my-planet', planetConfig: config } } }))
    await page.goto(`/star-map?mode=${mode}`)
    const canvas = page.locator('canvas[aria-label]')
    await canvas.scrollIntoViewIfNeeded()
    await expect.poll(() => canvas.evaluate(el => (el as HTMLCanvasElement & { peerPoint?: { x: number; y: number } }).peerPoint)).toBeTruthy()
    const point = await canvas.evaluate(el => (el as HTMLCanvasElement & { peerPoint: { x: number; y: number } }).peerPoint)
    const box = (await canvas.boundingBox())!
    await canvas.dispatchEvent('pointermove', { pointerType: 'mouse', pointerId: 9, clientX: box.x + point.x, clientY: box.y + point.y - 28 })
    await expect(page.getByRole('tooltip')).toHaveText(peer.name)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveURL(new RegExp(`/star-map\\?mode=${mode}$`))
    await canvas.dispatchEvent('pointerleave', { pointerType: 'mouse', pointerId: 9 })
    await expect(page.getByRole('tooltip')).toHaveCount(0)
  })
}
