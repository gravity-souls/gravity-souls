import { test, expect, type Page } from '@playwright/test'

const route = '/demo/cosmic-globe'
const globe = (page: Page) => page.locator('[data-status]')

// Count real WebGL draws, including static frames, without adding test hooks to production.
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const counter = { draws: 0 }
    Object.defineProperty(window, '__globeFrames', { value: counter })
    const original = WebGL2RenderingContext.prototype.drawArrays
    WebGL2RenderingContext.prototype.drawArrays = function (...args) {
      counter.draws++
      return original.apply(this, args)
    }
  })
}
const draws = (page: Page) => page.evaluate(() => (window as unknown as { __globeFrames: { draws: number } }).__globeFrames.draws)
async function expectStopped(page: Page) {
  await page.waitForTimeout(200)
  const before = await draws(page)
  await page.waitForTimeout(250)
  expect(await draws(page)).toBe(before)
}

// No business API calls are needed even when a visitor changes language.
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => { throw error })
  await instrument(page)
})

test('guided steps, controls, layout, and destinations', async ({ page }) => {
  const apiRequests: string[] = []
  page.on('request', (request) => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()) })
  await page.goto(route)
  await expect(globe(page)).toHaveAttribute('data-status', 'ready')
  await expect(page.locator('canvas')).toHaveCount(1)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('with you.')
  const create = page.getByRole('link', { name: 'Create my planet' })
  await expect(create).toBeInViewport({ ratio: 1 })
  await expect(create).toHaveAttribute('href', '/onboarding')
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', '/sign-in')
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(globe(page)).toHaveAttribute('data-step', '1')
  await expect(page.getByRole('heading', { level: 2 })).toContainText('shared interests')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(globe(page)).toHaveAttribute('data-step', '2')
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(globe(page)).toHaveAttribute('data-step', '1')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expectStopped(page)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(globe(page)).toHaveAttribute('data-step', '0')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await expectStopped(page)
  const before = await draws(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => draws(page)).toBeGreaterThan(before)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(apiRequests).toEqual([])
  await create.click()
  await expect(page).toHaveURL(/\/onboarding$/)
})

test('keyboard selection and reduced motion remain usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(route)
  await expect(globe(page)).toHaveAttribute('data-status', 'ready')
  await expectStopped(page)
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  const community = page.getByRole('button', { name: '03 Your community' })
  await community.focus()
  await page.keyboard.press('Enter')
  await expect(community).toHaveAttribute('aria-current', 'step')
  await expect(globe(page)).toHaveAttribute('data-step', '2')
  await expectStopped(page)
  const before = await draws(page)
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect.poll(() => draws(page)).toBeGreaterThan(before)
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expectStopped(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expectStopped(page) // An explicit pause survives a device-preference change.
})

test('ambient motion visibly changes the globe without advancing the story', async ({ page }) => {
  await page.goto(route)
  await expect(globe(page)).toHaveAttribute('data-status', 'ready')
  const canvas = page.locator('canvas')
  const first = await canvas.screenshot()
  await page.waitForTimeout(600)
  expect((await canvas.screenshot()).equals(first)).toBe(false)
  await expect(globe(page)).toHaveAttribute('data-step', '0')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expectStopped(page)
  const still = await canvas.screenshot()
  await page.waitForTimeout(300)
  expect((await canvas.screenshot()).equals(still)).toBe(true)
})

test('locale switching stays local and translates the full story', async ({ page }) => {
  const writes: string[] = []
  page.on('request', (request) => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()) })
  await page.goto(route)
  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page.getByRole('button', { name: /Français/ }).click()
  await expect(page.getByRole('link', { name: 'Créer ma planète' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await page.getByRole('button', { name: 'Langue', exact: true }).click()
  await page.getByRole('button', { name: /中文/ }).click()
  await expect(page.getByRole('link', { name: '创建我的星球' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh')
  await expect(page.locator('canvas')).toHaveCount(1)
  expect(writes).toEqual([])
})

test('WebGL failure preserves all content and actions', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith('webgl')) return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto(route)
  await expect(globe(page)).toHaveAttribute('data-status', 'unavailable')
  await expect(page.getByTestId('globe-fallback')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { level: 2 })).toContainText('shared interests')
  await expect(page.getByRole('link', { name: 'Create my planet' })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
})

test('visibility, offscreen rendering, resize, and context recovery', async ({ page }) => {
  await page.goto(route)
  await expect(globe(page)).toHaveAttribute('data-status', 'ready')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expectStopped(page)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const before = await draws(page)
  await expect.poll(() => draws(page)).toBeGreaterThan(before)
  // Move the scene outside the viewport to exercise the actual IntersectionObserver.
  await globe(page).evaluate((element) => { element.style.transform = 'translateY(5000px)' })
  await expectStopped(page)
  await globe(page).evaluate((element) => { element.style.transform = '' })
  await expect.poll(() => draws(page)).toBeGreaterThan(before)
  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.locator('canvas')).toHaveCount(1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const extension = canvas.getContext('webgl2')!.getExtension('WEBGL_lose_context')!
    extension.loseContext()
    ;(window as unknown as { restoreGlobe: () => void }).restoreGlobe = () => extension.restoreContext()
  })
  await expect(globe(page)).toHaveAttribute('data-status', 'unavailable')
  await page.evaluate(() => (window as unknown as { restoreGlobe: () => void }).restoreGlobe())
  await expect(globe(page)).toHaveAttribute('data-status', 'ready')
  await expect(page.locator('canvas')).toHaveCount(1)
})

test('navigation disposes the globe and restores the app shell', async ({ page }) => {
  await page.goto(route)
  await expect(globe(page)).toHaveAttribute('data-status', 'ready')
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(globe(page)).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveCount(1) // the standard starfield
  const afterNavigation = await draws(page)
  await page.waitForTimeout(250)
  expect(await draws(page)).toBe(afterNavigation)
  await page.goBack()
  await expect(globe(page)).toHaveAttribute('data-status', 'ready')
  await expect(page.locator('canvas')).toHaveCount(1)
})

test('the introduction is readable before JavaScript loads', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:3100/demo/cosmic-globe')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('with you.')
  await expect(page.getByTestId('globe-fallback')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create my planet' })).toBeInViewport({ ratio: 1 })
  await context.close()
})
