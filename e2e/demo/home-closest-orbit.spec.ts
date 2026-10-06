import { test, expect } from '@playwright/test'

test('homepage closest orbit is the strongest resonance, not the newest planet name', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'home-closest-orbit-fixture', url: baseURL! },
    { name: 'locale', value: 'en', url: baseURL! },
  ])
  const ownPlanet = {
    id: 'own-planet',
    userId: 'viewer',
    name: 'Viewer World',
    displayName: 'Viewer',
    avatarSymbol: '✦',
    tagline: null,
    mood: 'calm',
    lifestyle: 'solitary',
    coreThemes: ['art'],
    visual: { coreColor: '#a78bfa', accentColor: '#c4b5fd', ringStyle: 'none', surfaceStyle: 'smooth', satelliteCount: 1, size: 'lg' },
    abstractAxis: 50,
    introspectiveAxis: 50,
  }
  const newestCandidate = {
    ...ownPlanet,
    id: 'newest-planet',
    userId: 'newest-user',
    name: 'Newest Planet Name',
    displayName: 'Newest Person',
    mood: 'intense',
    lifestyle: 'nomadic',
    coreThemes: ['music'],
    abstractAxis: 100,
  }
  const candidates = [
    newestCandidate,
    ...Array.from({ length: 49 }, (_, index) => ({
      ...newestCandidate,
      id: `recent-planet-${index}`,
      userId: `recent-user-${index}`,
      name: `Recent Planet ${index}`,
      displayName: `Recent Person ${index}`,
    })),
  ]
  const strongestCandidate = {
    ...ownPlanet,
    id: 'strongest-planet',
    userId: 'strongest-user',
    name: 'Planet Name Is Not Public Identity',
    displayName: 'Strong Resonance Person',
  }
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth/get-session') {
      return route.fulfill({ json: { session: { id: 'session', userId: 'viewer', expiresAt: '2030-01-01T00:00:00Z' }, user: { id: 'viewer', name: 'Viewer', email: 'viewer@example.test' } } })
    }
    if (url.pathname === '/api/my-planet') return route.fulfill({ json: ownPlanet })
    if (url.pathname === '/api/planets') {
      return route.fulfill({
        json: url.searchParams.has('cursor')
          ? { planets: [strongestCandidate], nextCursor: null }
          : { planets: candidates, nextCursor: 'older-page' },
      })
    }
    if (url.pathname === '/api/communities' || url.pathname === '/api/universe') return route.fulfill({ json: [] })
    if (url.pathname === '/api/posts') return route.fulfill({ json: { posts: [], nextCursor: null } })
    if (url.pathname === '/api/saved-planets') return route.fulfill({ json: { savedPlanets: [] } })
    if (url.pathname === '/api/user/upcoming-events') return route.fulfill({ json: { events: [] } })
    if (url.pathname === '/api/star-map') return route.fulfill({ json: { groups: [], nodes: [], total: 0, nextCursor: null, scope: 'batch' } })
    return route.fulfill({ json: {} })
  })

  await page.goto('/')
  const closestOrbit = page.getByTestId('closest-orbit')
  await expect(closestOrbit).toContainText('Strong Resonance Person')
  await expect(closestOrbit).not.toContainText('Newest Person')
  await expect(closestOrbit).not.toContainText('Planet Name Is Not Public Identity')
  await closestOrbit.click()
  await expect(page.getByRole('dialog', { name: /Strong Resonance Person/ })).toBeVisible()
})
