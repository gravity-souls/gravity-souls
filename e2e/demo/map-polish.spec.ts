import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'

const photo = '/textures/earth_day.jpg'
const config = { baseTexture: 'mars.jpg', customTextureUrl: photo, tintColor: '#a78bfa', atmosphereColor: '#c4b5fd', atmosphereDensity: .12, rotationSpeed: 0, cloudOpacity: 0, hasRing: false, ringColor: '' }
type Stats = { portraits: number; beams: number; corners: number[]; sources: string[] }

test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'locale', value: 'en', url: baseURL! }, { name: 'better-auth.session_token', value: 'map-polish-fixture', url: baseURL! }])
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/get-session') return route.fulfill({ json: { user: { id: 'owner', name: 'Owner', email: 'owner@test.invalid' }, session: { id: 's', userId: 'owner', expiresAt: '2099-01-01T00:00:00Z' } } })
    if (path === '/api/me') return route.fulfill({ json: { user: { name: 'Owner', userLevel: 5, planetConfig: config }, profile: {} } })
    if (path === '/api/planets') return route.fulfill({ json: [] })
    if (path === '/api/saved-planets') return route.fulfill({ json: { savedPlanets: [] } })
    return route.fulfill({ json: {} })
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    type Tracked = HTMLCanvasElement & { mapStats?: { portraits: number; beams: number; corners: number[]; sources: string[] } }
    const proto = CanvasRenderingContext2D.prototype
    const clear = proto.clearRect, image = proto.drawImage, stroke = proto.stroke, fill = proto.fillRect
    proto.clearRect = function(...args) { if (this.canvas.hasAttribute('aria-label')) (this.canvas as Tracked).mapStats = { portraits: 0, beams: 0, corners: [0,0,0,0], sources: [] }; return clear.apply(this,args) }
    proto.drawImage = function(...args: unknown[]) { const stats = (this.canvas as Tracked).mapStats; if (stats) { stats.portraits++; if (args[0] instanceof HTMLImageElement) stats.sources.push(new URL(args[0].src).pathname) }; return Reflect.apply(image,this,args) }
    proto.stroke = function(...args: unknown[]) { const stats = (this.canvas as Tracked).mapStats; if (stats) stats.beams++; return Reflect.apply(stroke,this,args) }
    proto.fillRect = function(x,y,w,h) { const stats = (this.canvas as Tracked).mapStats, rect = this.canvas.getBoundingClientRect(); if (stats && w < 4 && h < 4) { if (x < rect.width*.2 && y < rect.height*.2) stats.corners[0]++; if (x > rect.width*.8 && y < rect.height*.2) stats.corners[1]++; if (x < rect.width*.2 && y > rect.height*.8) stats.corners[2]++; if (x > rect.width*.8 && y > rect.height*.8) stats.corners[3]++ }; return fill.call(this,x,y,w,h) }
  })
})

for (const mode of ['discover','personal']) test(`${mode} zoom retains portrait nodes and real relationships without refetching`, async ({ page }) => {
  let reads = 0
  const nodes = Array.from({ length: 16 },(_,i) => ({ id: `peer-${i}`, name: `Peer ${i}`, displayName: `Peer ${i}`, groupId: 'calm', href: `/planet/peer-${i}`, avatarUrl: photo, planetConfig: config, score: 20+i*4, relationship: { saved: true, following: false, followedBy: false, conversationId: null } }))
  await page.route('**/api/star-map?**', route => { reads++; return route.fulfill({ json: { groups: [{ id: 'calm', count: nodes.length, color: '#a78bfa' }], nodes, total: nodes.length, scope: mode === 'personal' ? 'personal' : 'allVisible', nextCursor: null, selfPlanet: { id: 'own', name: 'Owner', href: '/my-planet', avatarUrl: photo, level: 5 } } }) })
  await page.goto(`/star-map?mode=${mode}`)
  const canvas = page.locator('canvas[aria-label]')
  await canvas.scrollIntoViewIfNeeded()
  const stats = () => canvas.evaluate(el => (el as HTMLCanvasElement & { mapStats: Stats }).mapStats)
  await expect.poll(async () => (await stats())?.portraits).toBe(16)
  expect((await stats()).beams).toBeGreaterThanOrEqual(16)
  if (mode === 'discover') await expect.poll(async () => (await stats()).corners.every(count => count >= 10)).toBe(true)
  for (const deltaY of [-1200,1200,-1200]) { await canvas.dispatchEvent('wheel',{ deltaY }); await expect.poll(async () => (await stats()).portraits).toBe(16); expect((await stats()).beams).toBeGreaterThanOrEqual(16) }
  expect(reads).toBe(1)
  await expect(page.getByRole('button',{ name: /Back to overview/ })).toHaveCount(0)
})

test('every galaxy gets an overview beam, including empty and single-member communities', async ({ page }) => {
  const groups = [0,1,8].map((count,i) => ({ id: `galaxy-${i}`, name: `Galaxy ${i}`, count, color: '#a78bfa' }))
  await page.route('**/api/star-map?**', route => route.fulfill({ json: { groups, nodes: groups.map(g => ({ id: g.id, groupId: g.id, name: g.name, kind: 'galaxy', href: '/galaxy/sample' })), total: 3, nextCursor: null, scope: 'batch' } }))
  await page.goto('/star-map?mode=galaxies')
  await expect.poll(() => page.locator('canvas[aria-label]').evaluate(el => (el as HTMLCanvasElement & { mapStats: Stats }).mapStats?.beams)).toBe(3)
})

test('selected planet opens a complete viewport dialog with a labelled score and returns focus on close', async ({ page }) => {
  await page.route('**/api/star-map?**', route => route.fulfill({ json: { groups: [{ id: 'calm', count: 1, color: '#a78bfa' }], nodes: [{ id: 'peer', name: 'Preview planet', groupId: 'calm', href: '/planet/peer', score: 86, planetConfig: config, tagline: 'A long profile preview '.repeat(25) }], total: 1, nextCursor: null, scope: 'allVisible' } }))
  await page.goto('/star-map')
  await expect(page.locator('#star-map-sidebar')).toContainText('Calm')
  const toggle = page.getByRole('button',{ name: en.starMap.browseObjects, exact: true })
  if (await toggle.isVisible()) await toggle.click()
  await page.getByRole('button',{ name: /Calm 1 planets/ }).click()
  const choice = page.getByRole('button',{ name: /Preview planet/ })
  await expect(choice).toContainText('Match score: 86%')
  await choice.click()
  const dialog = page.getByRole('dialog',{ name: 'Preview planet', exact: true })
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox(), size = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.y).toBeGreaterThanOrEqual(0); expect(box!.y+box!.height).toBeLessThanOrEqual(size.height)
  await dialog.getByRole('link',{ name: en.starMap.openPlanet }).scrollIntoViewIfNeeded()
  await expect(dialog.getByRole('link',{ name: en.starMap.openPlanet })).toBeVisible()
  await dialog.getByRole('button',{ name: en.planetPage.closePreview }).click()
  await expect(dialog).toHaveCount(0); await expect(choice).toBeFocused()
})

test('my planet has a breathing loading globe and grouped settings/customize/map/relationships controls', async ({ page }) => {
  let release!: () => void
  const ready = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/my-planet',async route => { await ready; await route.fulfill({ json: { id: 'own', userId: 'owner', name: 'Owner planet fixture', coreThemes: [], visual: {}, mood: 'calm', lifestyle: 'solitary', planetConfig: config } }) })
  await page.goto('/my-planet')
  await expect(page.getByRole('status',{ name: en.starMap.loading })).toBeVisible()
  release()
  const toolbar = page.getByRole('navigation',{ name: en.myPlanet.yourPlanet, exact: true })
  await expect(toolbar.getByRole('link',{ name: en.nav.settings, exact: true })).toHaveAttribute('href','/settings/planet')
  await expect(toolbar.getByRole('button',{ name: en.myPlanet.customizeYourPlanet, exact: true })).toBeVisible()
  await expect(toolbar.getByRole('link',{ name: en.nav.personalStarMap, exact: true })).toBeVisible()
  await expect(toolbar.getByRole('link',{ name: en.nav.relationships, exact: true })).toBeVisible()
})


test('email-registered owner and saved peers retain planet presets without provider portraits', async ({ page }) => {
  const preset = { ...config, customTextureUrl: undefined }
  await page.route('**/api/star-map?**', route => route.fulfill({ json: {
    groups: [{ id: 'calm', count: 1, color: '#a78bfa' }],
    nodes: [{ id: 'email-peer', name: 'Email planet', displayName: 'Email person', groupId: 'calm', href: '/planet/email-peer', avatarUrl: null, planetConfig: preset, relationship: { saved: true, following: false, followedBy: false, conversationId: null } }],
    selfPlanet: { id: 'email-owner', name: 'My planet', displayName: 'Owner', href: '/planet/email-owner', avatarUrl: null, planetConfig: preset, level: 1 },
    scope: 'personal', total: 1, nextCursor: null,
  } }))
  await page.goto('/star-map?mode=personal')
  const canvas = page.locator('canvas[aria-label]')
  await canvas.scrollIntoViewIfNeeded()
  await expect.poll(() => canvas.evaluate(el => (el as HTMLCanvasElement & { mapStats: Stats }).mapStats?.sources)).toContain('/textures/mars.jpg')
  await expect(page.locator('a[href*="/planet/email-owner"] img')).toHaveAttribute('src', '/textures/mars.jpg')
})
