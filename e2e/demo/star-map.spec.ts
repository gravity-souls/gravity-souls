import { test, expect } from '@playwright/test'

const fixture = {
  groups: [{ id: 'calm', count: 1, color: '#b89afa' }],
  nodes: [
    {
      id: 'fixture-planet',
      groupId: 'calm',
      name: 'Browser fixture planet',
      href: '/planet/fixture-planet',
      planetConfig: {
        baseTexture: 'mars.jpg',
        customTextureUrl: '/textures/earth_day.jpg',
        tintColor: '#b89afa',
        atmosphereColor: '#b89afa',
        atmosphereDensity: 0.1,
        hasRing: false,
        ringColor: '',
        rotationSpeed: 0,
        cloudOpacity: 0,
      },
    },
  ],
  total: 1,
  scope: 'allVisible',
  nextCursor: null,
}

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.addCookies([
    {
      name: 'better-auth.session_token',
      value: 'browser-test-fixture',
      url: baseURL!,
    },
    { name: 'locale', value: 'en', url: baseURL! },
  ])
  await page.route('**/api/star-map?**', (route) =>
    route.fulfill({ json: fixture }),
  )
})

test('real map flow has no playback or zoom buttons, and selects custom-avatar nodes', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/star-map')
  await expect(
    page.getByRole('heading', { name: 'Global star map', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Pause|Play|Reset|Zoom in|Zoom out/ }),
  ).toHaveCount(0)
  const panelToggle = page.getByRole('button', {
    name: 'Constellations & planets',
    exact: true,
  })
  await expect(page.locator('canvas[aria-label]')).toBeVisible()
  if (await panelToggle.isVisible()) await panelToggle.click()
  await page.getByRole('button', { name: 'Calm 1 planets' }).click()
  await page.getByRole('button', { name: 'Browser fixture planet' }).click()
  await expect(
    page.getByRole('heading', { name: 'Browser fixture planet' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'View planet →' }),
  ).toHaveAttribute('href', '/planet/fixture-planet?from=star-map')
  await expect(
    page.locator('aside [aria-live="polite"] img[src="/textures/earth_day.jpg"]'),
  ).toBeVisible()
  await expect(page.locator('canvas[aria-label]')).toHaveCSS('touch-action', 'none')
  await page.getByRole('button', { name: /Back to overview/ }).click()
  await expect(
    page.getByRole('heading', { name: 'Browser fixture planet' }),
  ).toHaveCount(0)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  expect(errors).toEqual([])
})

test('global wheel zoom keeps the full field, and reduced motion has no playback controls', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/star-map')
  const panelToggle = page.getByRole('button', {
    name: 'Constellations & planets',
    exact: true,
  })
  await expect(page.locator('canvas[aria-label]')).toBeVisible()
  if (await panelToggle.isVisible()) await panelToggle.click()
  await expect(
    page.getByRole('button', { name: 'Calm 1 planets' }),
  ).toBeVisible()
  const closePanel = page.getByRole('button', {
    name: 'Close panel',
    exact: true,
  })
  if (await closePanel.isVisible()) await closePanel.click()
  await page.locator('canvas[aria-label]').scrollIntoViewIfNeeded()
  const box = await page.locator('canvas[aria-label]').boundingBox()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * 0.44)
  if (testInfo.project.name === 'iphone-safari') {
    // Playwright cannot drive a mouse wheel in mobile WebKit. Exercise the
    // browser wheel listener directly; physical pinch remains a device check.
    await page.locator('canvas[aria-label]').dispatchEvent('wheel', {deltaY:-550,clientX:box!.x + box!.width / 2,clientY:box!.y + box!.height * 0.44})
  } else {
    // Device emulation changes wheel step size. Use a short continuous scroll
    // and verify the actual cluster transition instead of assuming one delta.
    for (let step = 0; step < 3; step++) await page.mouse.wheel(0, -550)
  }
  await expect(
    page.getByRole('button', { name: /Back to overview/ }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Pause|Play|Reset/ }),
  ).toHaveCount(0)
})

for (const [locale, title] of [
  ['zh', '全域星图'],
  ['fr', 'Carte stellaire globale'],
]) {
  test(`production star map renders ${locale}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'locale', value: locale, url: baseURL! }])
    await page.goto('/star-map')
    await expect(
      page.getByRole('heading', { name: title, exact: true }),
    ).toBeVisible()
    await expect(page.locator('main')).not.toContainText('starMap.')
  })
}

test('map data failure clears stale objects and explains failure', async ({
  page,
}) => {
  await page.goto('/star-map')
  const panelToggle = page.getByRole('button', {
    name: 'Constellations & planets',
    exact: true,
  })
  await expect(page.locator('canvas[aria-label]')).toBeVisible()
  if (await panelToggle.isVisible()) await panelToggle.click()
  await expect(
    page.getByRole('button', { name: 'Calm 1 planets' }),
  ).toBeVisible()
  await page.route('**/api/star-map?**', (route) =>
    route.fulfill({ status: 500, json: { error: 'failed' } }),
  )
  await page.getByRole('textbox', { name: 'Search names' }).fill('new search')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toContainText('The map could not load')
  await expect(
    page.getByRole('button', { name: 'Calm 1 planets' }),
  ).toHaveCount(0)
})

test('view switch stays above the map and objects occupy a side panel', async ({
  page,
}) => {
  await page.goto('/star-map')
  const switcher = page.getByRole('link', {
    name: 'Open list view',
    exact: true,
  })
  await expect(switcher).toHaveAttribute('href', '/discover')
  const canvas = await page.locator('canvas[aria-label]').boundingBox()
  const switchBox = await switcher.boundingBox()
  expect(switchBox!.y + switchBox!.height).toBeLessThan(canvas!.y)
  const toggle = page.getByRole('button', {
    name: 'Constellations & planets',
    exact: true,
  })
  await expect(page.locator('canvas[aria-label]')).toBeVisible()
  if (await toggle.isVisible()) {
    await expect(page.locator('#star-map-sidebar')).toBeHidden()
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('button', { name: 'Close panel', exact: true }).click()
    await expect(page.locator('#star-map-sidebar')).toBeHidden()
  } else {
    const panel = await page.locator('#star-map-sidebar').boundingBox()
    expect(panel!.x).toBeGreaterThan(canvas!.x + canvas!.width)
    expect(Math.abs(panel!.y - canvas!.y)).toBeLessThan(2)
  }
  await expect(page.getByText('Planet textures by')).toHaveCount(0)
})

test('phone exposes language and complete navigation from the account menu', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/auth/get-session**', (route) =>
    route.fulfill({
      json: {
        session: {
          id: 'fixture',
          userId: 'fixture-user',
          expiresAt: '2035-01-01T00:00:00Z',
        },
        user: {
          id: 'fixture-user',
          name: 'Fixture navigator',
          email: 'fixture@example.invalid',
        },
      },
    }),
  )
  await page.goto('/star-map')
  await expect(
    page.getByRole('button', { name: 'Language', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await expect(page.getByRole('button', { name: /Français/ })).toBeVisible()
  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page
    .getByRole('button', { name: 'Open user menu', exact: true })
    .click()
  const menu = page.getByRole('navigation', { name: 'All sections' })
  for (const href of ['/star-map', '/discover', '/activities', '/saved'])
    await expect(menu.locator(`a[href="${href}"]`)).toBeVisible()
  await expect(menu.getByRole('textbox')).toBeVisible()
  await menu.locator('a[href="/star-map"]').click()
  await expect(
    page.getByRole('button', { name: 'Open user menu', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})


test('global map appends visible batches and clears them after revoked access', async ({ page }) => {
  let denied = false
  await page.route('**/api/star-map?**', route => {
    if (denied) return route.fulfill({ status: 401, json: {} })
    const next = new URL(route.request().url()).searchParams.get('cursor')
    return route.fulfill({ json: { ...fixture, total: 2, scope: 'batch', nextCursor: next ? null : 'next', nodes: [{ ...fixture.nodes[0], id: next ? 'second' : 'first', name: next ? 'Second visible planet' : 'First visible planet' }] } })
  })
  await page.goto('/star-map')
  const toggle = page.getByRole('button', { name: 'Constellations & planets', exact: true })
  if (await toggle.isVisible()) await toggle.click()
  await page.getByRole('button', { name: 'Calm 1 planets', exact: true }).click()
  await expect(page.getByText('First visible planet', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Load more planets', exact: true }).click()
  await expect(page.getByText('Second visible planet', { exact: true })).toBeVisible()
  await expect(page.getByText('First visible planet', { exact: true })).toBeVisible()
  denied = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('First visible planet', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Second visible planet', { exact: true })).toHaveCount(0)
})
