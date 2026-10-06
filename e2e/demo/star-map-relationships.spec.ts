import { test, expect } from '@playwright/test'

test('map actions preserve selection, failures retain state, and chat returns to the map', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'map-ui-fixture', url: baseURL! },
    { name: 'locale', value: 'en', url: baseURL! },
  ])
  let saved = false, following = false, conversationId: string | null = null
  let failRemoval = true, sent = 0, starts = 0
  const requests: string[] = []
  const config = { baseTexture: 'mars.jpg', customTextureUrl: '/textures/earth_day.jpg', tintColor: '#b89afa', atmosphereColor: '#b89afa', atmosphereDensity: 0.1, hasRing: false, ringColor: '', rotationSpeed: 0, cloudOpacity: 0 }
  const planet = { id: 'map-planet', userId: 'map-target', groupId: 'calm', name: 'Browser relationship planet', href: '/planet/map-planet', planetConfig: config }
  await page.route('**/api/my-planet', route => route.fulfill({ json: { id: 'viewer-planet', userId: 'viewer', name: 'Viewer', visual: {}, planetConfig: config } }))
  await page.route('**/api/star-map?**', route => {
    requests.push(route.request().url())
    return route.fulfill({ json: { groups: [{ id: 'calm', count: 1, color: '#b89afa' }], nodes: [{ ...planet, relationship: { saved, following, followedBy: true, conversationId } }], total: 1, scope: 'allVisible', nextCursor: null } })
  })
  await page.route('**/api/saved-planets', route => { saved = true; return route.fulfill({ json: {} }) })
  await page.route('**/api/saved-planets/map-planet', route => {
    if (route.request().method() === 'DELETE') {
      if (failRemoval) return route.fulfill({ status: 500, json: {} })
      saved = false; return route.fulfill({ status: 204 })
    }
    return route.fulfill({ json: { saved } })
  })
  await page.route('**/api/follows', route => { following = true; return route.fulfill({ json: {} }) })
  await page.route('**/api/follows/map-target', route => {
    if (route.request().method() === 'DELETE') following = false
    return route.fulfill({ json: { following, followedBy: true, available: true } })
  })
  await page.route('**/api/conversations', route => {
    starts++; conversationId = 'map-thread'
    return route.fulfill({ json: { conversationId } })
  })
  await page.route('**/api/beam-invitations/status?**', route => route.fulfill({ json: { available: true, invitationId: null, status: null, conversationId, incomingPending: false } }))
  await page.route('**/api/conversations/map-thread', route => {
    if (route.request().method() === 'POST') sent++
    return route.fulfill({ json: { conversation: { id: 'map-thread' }, viewerId: 'viewer', otherUser: { id: 'map-target', name: planet.name }, otherPlanet: null, messages: [], olderCursor: null, canSend: true } })
  })
  await page.route('**/api/planets/map-planet', route => route.fulfill({ json: { ...planet, visual: {}, coreThemes: [], mood: 'calm', lifestyle: 'solitary' } }))
  await page.route('**/api/planets', route => route.fulfill({ json: [] }))

  await page.goto('/star-map?mode=discover')
  const toggle = page.getByRole('button', { name: 'Constellations & planets', exact: true })
  await expect(page.locator('canvas[aria-label]')).toBeVisible()
  if (await toggle.isVisible()) await toggle.click()
  await page.getByRole('textbox', { name: 'Search names' }).fill('Browser')
  await page.getByRole('button', { name: 'Search', exact: true }).click()
  await page.getByRole('button', { name: 'Calm 1 planets' }).click()
  await page.getByRole('button', { name: /^Browser relationship planet/ }).click()
  const card = page.locator('dialog [aria-live="polite"]')
  await card.getByRole('button', { name: 'Save to orbit', exact: true }).click()
  await expect(card.getByRole('group')).toContainText('In your orbit')
  await expect(page.locator('#star-map-sidebar button').filter({ hasText: 'Browser relationship planet' })).toContainText('In your orbit')
  await card.getByRole('button', { name: 'Saved · Remove from orbit', exact: true }).click()
  await expect(card.getByRole('alert')).toContainText('latest state could not be confirmed')
  await expect(card.getByRole('group')).toContainText('In your orbit')
  failRemoval = false
  await card.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(card.getByRole('button', { name: 'Saved · Remove from orbit', exact: true })).toBeVisible()
  await card.getByRole('button', { name: 'Saved · Remove from orbit', exact: true }).click()
  await expect(card.getByRole('group')).not.toContainText('In your orbit')
  await card.getByRole('button', { name: 'Follow back', exact: true }).click()
  await expect(card.getByRole('group')).toContainText('Mutual follows')

  await card.getByRole('link', { name: 'View planet →', exact: true }).click()
  await expect(page).toHaveURL(/\/planet\/map-planet\?from=star-map$/)
  await page.getByRole('link', { name: '← Return to star map', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Search names' })).toHaveValue('Browser')
  await expect(card.getByRole('heading', { name: planet.name })).toBeVisible()
  await expect(card.getByRole('group')).toContainText('Mutual follows')
  await card.getByRole('button', { name: 'Send beam · Open chat', exact: true }).click()
  await expect(page).toHaveURL(/\/messages\/map-thread\?from=star-map$/)
  expect(starts).toBe(1); expect(sent).toBe(0)
  await page.getByRole('link', { name: '← Return to star map', exact: true }).click()
  await expect(card.getByRole('heading', { name: planet.name })).toBeVisible()
  await expect(card.getByRole('group')).toContainText('Existing chat')
  await card.getByRole('button', { name: 'Continue chat', exact: true }).click()
  await expect(page).toHaveURL(/\/messages\/map-thread\?from=star-map$/)
  expect(starts).toBe(1); expect(sent).toBe(0)
  expect(requests.some(url => url.includes('search=Browser') && url.includes('group=calm'))).toBe(true)
})

test('returning to a map removes a now unavailable selection and its relationship metadata', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'map-ui-fixture', url: baseURL! },
    { name: 'locale', value: 'en', url: baseURL! },
  ])
  let visible = true
  const node = { id: 'private-later', name: 'Permission fixture', groupId: 'calm', href: '/planet/private-later', relationship: { saved: true, following: true, followedBy: true, conversationId: 'hidden-thread' } }
  await page.route('**/api/star-map?**', route => route.fulfill({ json: { groups: [{ id: 'calm', count: visible ? 1 : 0, color: '#b89afa' }], nodes: visible ? [node] : [], total: visible ? 1 : 0, nextCursor: null, scope: 'allVisible' } }))
  await page.goto('/star-map')
  const toggle = page.getByRole('button', { name: 'Constellations & planets', exact: true })
  await expect(page.locator('canvas[aria-label]')).toBeVisible()
  if (await toggle.isVisible()) await toggle.click()
  await page.getByRole('button', { name: 'Calm 1 planets' }).click()
  await page.getByRole('button', { name: /^Permission fixture/ }).click()
  await expect(page.getByRole('heading', { name: 'Permission fixture' })).toBeVisible()
  visible = false
  await page.reload()
  await expect(page.getByText('No visible objects match this search.', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Permission fixture' })).toHaveCount(0)
  await expect(page.getByText('Existing chat', { exact: true })).toHaveCount(0)
})
