import { test, expect } from '@playwright/test'

const galaxies = Array.from({ length: 6 }, (_, index) => ({
  id: `masonry-galaxy-${index}`,
  slug: `masonry-galaxy-${index}`,
  name: `Masonry Galaxy ${index}`,
  symbol: '✦',
  tagline: index % 2 === 0 ? 'A longer tagline that makes this galaxy card taller.' : null,
  keywords: index % 2 === 0 ? ['art', 'culture', 'conversation'] : ['art'],
  mood: 'creative',
  memberCount: index * 3,
  maturity: 'forming',
  accentColor: '#a78bfa',
}))

test('galaxy directory uses responsive masonry while preserving the full result set', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'galaxy-masonry-fixture', url: baseURL! },
    { name: 'locale', value: 'en', url: baseURL! },
  ])
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth/get-session') {
      return route.fulfill({ json: { session: { id: 'session', userId: 'viewer', expiresAt: '2030-01-01T00:00:00Z' }, user: { id: 'viewer', name: 'Viewer', email: 'viewer@example.test' } } })
    }
    if (url.pathname === '/api/communities') return route.fulfill({ json: galaxies })
    return route.fulfill({ json: {} })
  })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/galaxies')
  const masonry = page.locator('.galaxy-masonry')
  await expect(masonry.locator('a[href^="/galaxy/"]')).toHaveCount(galaxies.length)
  await expect.poll(() => masonry.evaluate(element => getComputedStyle(element).columnCount)).toBe('3')

  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => masonry.evaluate(element => getComputedStyle(element).columnCount)).toBe('1')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
