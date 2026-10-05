import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import zh from '../../messages/zh.json'
import fr from '../../messages/fr.json'

for (const [locale, copy] of Object.entries({ en, fr, zh })) {
  test(`standalone report, flat photo and revoked access in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'locale', value: locale, url: baseURL! }, { name: 'better-auth.session_token', value: 'report-fixture', url: baseURL! }])
    const config = { baseTexture: 'mars.jpg', customTextureUrl: '/textures/earth_day.jpg', tintColor: '#123456', atmosphereColor: '#abcdef', atmosphereDensity: .1, hasRing: false, ringColor: '', rotationSpeed: .03, cloudOpacity: .5 }
    const source = { id: 'self', userId: 'owner', name: 'Report owner', mood: 'calm', lifestyle: 'solitary', coreThemes: ['art'], planetConfig: config }
    let failed = false, candidates = [{ ...source, id: 'other', userId: 'target', name: 'Report candidate' }]
    await page.route('**/api/my-planet', route => route.fulfill({ json: source }))
    await page.route('**/api/planets', route => route.fulfill({ status: failed ? 401 : 200, json: failed ? {} : { planets: candidates } }))
    await page.goto('/my-planet/report')
    await expect(page).toHaveURL(/\/my-planet\/report$/)
    await expect(page.getByRole('heading', { level: 1, name: copy.matchReport.title, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Report candidate', exact: true })).toBeVisible()
    await expect(page.locator('article img')).toHaveAttribute('src', config.customTextureUrl)
    await expect(page.locator('article canvas, article .planet-avatar-rotating')).toHaveCount(0)
    await expect(page.locator('article').getByRole('link', { name: copy.resonance.viewPlanet, exact: true })).toHaveAttribute('href', '/planet/other')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    candidates = []
    await page.getByRole('button', { name: copy.matchReport.refresh, exact: true }).click()
    await expect(page.getByRole('heading', { name: copy.matchReport.empty, exact: true })).toBeVisible()
    await expect(page.getByText('Report candidate', { exact: true })).toHaveCount(0)
    candidates = [{ ...source, id: 'other', userId: 'target', name: 'Report candidate' }]
    await page.getByRole('button', { name: copy.matchReport.refresh, exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Report candidate', exact: true })).toBeVisible()
    failed = true
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.locator('section[role="alert"]')).toContainText(copy.matchReport.auth)
    await expect(page.getByText('Report candidate', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('link', { name: copy.matchReport.signIn, exact: true })).toHaveAttribute('href', '/sign-in?next=/my-planet/report')
  })
}

test('saved group retains owner and actual gold relationship strokes', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'locale', value: 'en', url: baseURL! }, { name: 'better-auth.session_token', value: 'orbit-fixture', url: baseURL! }])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    let strokes = 0
    const original = CanvasRenderingContext2D.prototype.stroke
    CanvasRenderingContext2D.prototype.stroke = function (path?: Path2D) {
      if (String(this.strokeStyle).startsWith('#e9c779') || String(this.strokeStyle).includes('233, 199, 121')) strokes++
      return Reflect.apply(original, this, path ? [path] : [])
    }
    Object.defineProperty(window, '__savedStrokes', { get: () => strokes })
  })
  await page.route('**/api/star-map?**', route => route.fulfill({ json: { groups: [{ id: 'calm', count: 1, color: '#b89afa' }], nodes: [{ id: 'saved', name: 'Saved orbit target', href: '/planet/saved', groupId: 'calm', relationship: { saved: true, following: false, followedBy: false } }], total: 1, nextCursor: null, scope: 'personal', selfPlanet: { id: 'self', name: 'Orbit owner', href: '/planet/self' } } }))
  await page.goto('/star-map?mode=personal&collection=saved')
  const center = page.getByRole('link', { name: en.starMap.openSelf.replace('{name}', 'Orbit owner'), exact: true })
  await expect(center).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __savedStrokes: number }).__savedStrokes)).toBeGreaterThan(0)
  const prior = await page.evaluate(() => (window as unknown as { __savedStrokes: number }).__savedStrokes)
  const group = page.getByRole('button', { name: new RegExp(en.starMap.group_calm) }).first()
  if (!await group.isVisible()) await page.locator('button[aria-controls="star-map-sidebar"]').click()
  await group.click()
  await expect(center).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as unknown as { __savedStrokes: number }).__savedStrokes)).toBeGreaterThan(prior)
})
