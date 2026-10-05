import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

for (const [locale, m] of Object.entries({ en, fr, zh })) test(`personal galaxy/activity layers return to their view and refresh permissions in ${locale}`, async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'map-context-fixture', url: baseURL! }, { name: 'locale', value: locale, url: baseURL! }])
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let allowed = true, failed = false
  const galaxy = { id: 'map-galaxy', slug: 'map-galaxy', name: 'Personal galaxy fixture', symbol: '✦', tagline: null, description: null, keywords: [], mood: 'calm', accentColor: '#a78bfa', maturity: 'forming', memberCount: 2, joined: true, isAdmin: false, creatorId: 'organizer', joinPolicy: 'OPEN' }
  const activity = { id: 'map-activity', galaxyId: galaxy.id, title: 'Personal activity fixture', description: 'Activity fixture', date: '2030-01-01T12:00:00Z', category: 'ONLINE', status: 'APPROVED', rsvpCount: 1, rsvps: [], spotsRemaining: null, maxAttendees: null, userHasRSVPed: true, userAttendance: 'APPROVED', requiresApproval: false, proposer: { id: 'organizer', name: 'Organizer' } }
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth/get-session') return route.fulfill({ json: { session: { id: 'session', userId: 'viewer', expiresAt: '2030-01-01T00:00:00Z' }, user: { id: 'viewer', name: 'Viewer', email: 'viewer@example.test' } } })
    if (url.pathname === '/api/star-map') {
      if (failed) return route.fulfill({ status: 500, json: {} })
      const galaxies = url.searchParams.get('layer') === 'galaxies'
      const node = galaxies ? { id: galaxy.id, name: galaxy.name, kind: 'galaxy', groupId: 'joined', memberCount: 2, href: '/galaxy/map-galaxy' } : { id: activity.id, name: activity.title, kind: 'activity', groupId: 'going', date: activity.date, eventStatus: 'APPROVED', userAttendance: 'APPROVED', userInterested: true, href: '/galaxy/map-galaxy?event=map-activity#events' }
      return route.fulfill({ json: { groups: allowed ? [{ id: galaxies ? 'joined' : 'going', count: 1, color: '#68d8bd' }] : [], nodes: allowed ? [node] : [], total: allowed ? 1 : 0, nextCursor: null, scope: 'personal' } })
    }
    if (url.pathname === '/api/communities') return route.fulfill({ json: [galaxy] })
    if (url.pathname.endsWith('/events/map-activity')) return route.fulfill({ json: { event: activity, isAdmin: false } })
    if (url.pathname.endsWith('/events')) return route.fulfill({ json: { events: [activity], total: 1, pageSize: 20 } })
    if (url.pathname === '/api/posts') return route.fulfill({ json: { posts: [], nextCursor: null } })
    if (url.pathname.endsWith('/members')) return route.fulfill({ json: { members: [] } })
    if (url.pathname.endsWith('/posts') || url.pathname.endsWith('/discussions')) return route.fulfill({ json: [] })
    if (url.pathname === '/api/my-planet') return route.fulfill({ status: 404, json: {} })
    if (url.pathname === '/api/saved-planets') return route.fulfill({ json: { savedPlanets: [] } })
    return route.fulfill({ json: {} })
  })
  await page.goto('/star-map?mode=personal&layer=galaxies&view=list')
  await expect(page.locator('canvas[aria-label]')).toHaveCount(0)
  await page.getByRole('button', { name: /^Personal galaxy fixture/ }).click()
  let card = page.locator('aside [aria-live="polite"]')
  await card.getByRole('link', { name: m.starMap.openGalaxy }).click()
  await expect(page).toHaveURL(/from=personal-star-map-galaxies-list/)
  await page.getByRole('link', { name: m.starMap.returnPersonalMap }).click()
  await expect(page).toHaveURL(/mode=personal&layer=galaxies&view=list/)
  await expect(card).toContainText(galaxy.name)
  await page.getByRole('navigation', { name: m.starMap.personalLayers }).getByRole('link', { name: m.starMap.layer_activities, exact: true }).click()
  await page.getByRole('button', { name: /^Personal activity fixture/ }).click()
  card = page.locator('aside [aria-live="polite"]')
  await expect(card).toContainText(m.starMap.attendance_approved)
  await expect(card.getByRole('button')).toHaveCount(0)
  await card.getByRole('link', { name: m.starMap.openActivity }).click()
  await expect(page).toHaveURL(/event=map-activity&from=personal-star-map-activities-list#events/)
  const dialog = page.getByRole('dialog', { name: m.eventForms.eventDetail })
  await expect(dialog).toContainText(activity.title)
  await dialog.getByRole('link', { name: m.starMap.returnPersonalMap }).click()
  await expect(card).toContainText(activity.title)
  allowed = false
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(card).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText(m.starMap.empty_activities)
  allowed = true; failed = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('alert')).toContainText(m.starMap.loadError)
  failed = false
  await page.getByRole('button', { name: m.planetActions.retry, exact: true }).click()
  await expect(page.getByRole('button', { name: /^Personal activity fixture/ })).toBeVisible()
  await page.getByRole('group', { name: m.starMap.viewMode }).getByRole('link', { name: m.starMap.mapView, exact: true }).click()
  await expect(page).toHaveURL(/mode=personal&layer=activities$/)
  await expect(page.locator('canvas[aria-label]')).toHaveCount(1)
})
