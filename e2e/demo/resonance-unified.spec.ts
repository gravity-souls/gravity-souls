import { test, expect } from '@playwright/test'
const visual = {
  coreColor: '#a78bfa',
  accentColor: '#c4b5fd',
  ringStyle: 'none',
  surfaceStyle: 'smooth',
  satelliteCount: 0,
  size: 'lg',
}
const source = {
  id: 'own',
  name: 'Fixture source',
  userId: 'me',
  mood: 'calm',
  style: 'minimal',
  lifestyle: 'solitary',
  coreThemes: ['connection'],
  abstractAxis: 50,
  introspectiveAxis: 50,
  visual,
}
const candidates = [
  { ...source, id: 'target-a', userId: 'other-a', name: 'Fixture amber' },
  {
    ...source,
    id: 'target-b',
    userId: 'other-b',
    name: 'Fixture blue',
    mood: 'mixed',
  },
]
test.beforeEach(async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'fixture', url: baseURL! },
    { name: 'locale', value: 'en', url: baseURL! },
  ])
  await page.route('**/api/my-planet', (r) => r.fulfill({ json: source }))
  await page.route('**/api/planets', (r) =>
    r.fulfill({ json: { planets: candidates } }),
  )
})
test('canonical recommendation identity and score survive map/list switches', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const forbidden: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/api/star-map')) forbidden.push(r.url())
  })
  await page.goto('/resonance')
  const planet = page.getByRole('button', {
    name: /Fixture amber · Signal Score/,
  })
  await expect(planet).toBeVisible()
  const label = await planet.getAttribute('aria-label')
  const score = label!.match(/(\d+)$/)![1]
  await planet.focus()
  await planet.click()
  await expect(
    page.getByTestId('resonance-score').filter({ visible: true }),
  ).toContainText(score)
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await expect(
    page
      .getByRole('button', { name: /Fixture amber/ })
      .filter({ visible: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByTestId('resonance-score').filter({ visible: true }),
  ).toContainText(score)
  await page.getByRole('button', { name: 'Match orbits', exact: true }).click()
  await expect(planet).toHaveAttribute('aria-pressed', 'true')
  expect(forbidden).toEqual([])
})
test('legacy resonance map link opens the canonical resonance page', async ({
  page,
}) => {
  await page.goto('/star-map?mode=resonance')
  await expect(page).toHaveURL(/\/resonance$/)
  await expect(
    page.getByRole('button', { name: 'Match orbits', exact: true }),
  ).toBeVisible()
  await page.goto('/star-map')
  await expect(
    page.getByRole('navigation', { name: 'Map modes' }).getByRole('link'),
  ).toHaveCount(3)
})

test('mobile list opens the same detail and can dismiss the drawer', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/resonance')
  await page.getByRole('button', { name: 'List', exact: true }).click()
  await page
    .getByRole('button', { name: /Fixture amber/ })
    .filter({ visible: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Compatibility' })
  await expect(dialog).toBeVisible()
  await expect(
    dialog.getByRole('link', { name: /View Planet/ }),
  ).toHaveAttribute('href', '/planet/target-a')
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toBeHidden()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('recommended planets move with the field and stop for reduced motion and keyboard selection', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'no-preference' })
  await page.goto('/resonance')
  const planet = page.getByRole('button',{name:/Fixture amber · Signal Score/})
  await expect(planet).toBeVisible()
  await planet.locator('..').scrollIntoViewIfNeeded()
  await expect(planet).toBeInViewport()
  const initial = await planet.getAttribute('style')
  await expect.poll(() => planet.getAttribute('style')).not.toBe(initial)
  const label = await planet.getAttribute('aria-label')
  await planet.focus()
  const held = await planet.getAttribute('style')
  await page.waitForTimeout(350)
  await expect(planet).toHaveAttribute('style',held!)
  await expect(planet).toHaveAttribute('aria-label',label!)
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.reload()
  await expect(planet).toBeVisible()
  const staticStyle = await planet.getAttribute('style')
  await page.waitForTimeout(350)
  await expect(planet).toHaveAttribute('style',staticStyle!)
})
