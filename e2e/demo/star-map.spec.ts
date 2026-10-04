import { test, expect } from '@playwright/test'

test('star map selection, pause, zoom and reset work without account APIs', async ({ page, baseURL }) => {
  const errors: string[] = []
  const apiCalls: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('request', (request) => { if (new URL(request.url()).pathname.startsWith('/api/')) apiCalls.push(request.url()) })
  await page.context().addCookies([{ name: 'locale', value: 'en', url: baseURL! }])
  await page.goto('/demo/star-map')
  await expect(page.getByRole('heading', { name: 'A universe of connections' })).toBeVisible()
  await page.getByRole('button', { name: 'Blue hour Music' }).click()
  await expect(page.getByRole('heading', { name: 'Blue hour' })).toBeVisible()
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  for (let i = 0; i < 9; i++) { const zoom = page.getByRole('button', { name: 'Zoom in', exact: true }); if (await zoom.isEnabled()) await zoom.click() }
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Reset view' }).click()
  await expect(page.getByRole('heading', { name: 'Quiet orbit' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
  expect(apiCalls).toEqual([])
})

test('reduced motion pauses by default and allows explicit playback', async ({ page, baseURL }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.context().addCookies([{ name: 'locale', value: 'en', url: baseURL! }])
  await page.goto('/demo/star-map')
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
})

for (const [locale, heading] of [['zh', '连接成一个宇宙'], ['fr', 'Un univers de connexions']]) {
  test(`star map renders in ${locale}`, async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'locale', value: locale, url: baseURL! }])
    await page.goto('/demo/star-map')
    await expect(page.getByRole('heading', { name: heading })).toBeVisible()
    await expect(page.locator('main')).not.toContainText('starMapPreview.')
  })
}
