import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'

test('activity filters reach the server, preference order is explicit and clearing restores date order', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'preference-fixture', url: baseURL! }, { name: 'locale', value: 'en', url: baseURL! }])
  let query = new URLSearchParams()
  await page.route('**/api/galaxies/events?*', route => {
    query = new URL(route.request().url()).searchParams
    return route.fulfill({ json: { events: [], total: 0, page: 1, pageSize: 20 } })
  })
  await page.goto('/activities')
  const t = en.discoveryPreferences
  await page.getByLabel(t.region, { exact: true }).fill('Paris')
  await page.getByRole('combobox', { name: t.language, exact: true }).selectOption('fr')
  await page.getByRole('combobox', { name: t.interest, exact: true }).selectOption('art')
  await page.getByRole('combobox', { name: t.sort, exact: true }).selectOption('recommended')
  await expect.poll(() => Object.fromEntries(query)).toMatchObject({ region: 'Paris', language: 'fr', interest: 'art', sort: 'recommended', page: '1' })
  await expect(page.getByText(t.batchHint, { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.getByRole('button', { name: t.reset, exact: true }).click()
  await expect.poll(() => query.get('sort')).toBe('date')
  expect(query.has('region')).toBe(false)
  expect(query.has('interest')).toBe(false)
})
