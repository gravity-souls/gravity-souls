import { test, expect } from '@playwright/test'

test('RSVP refreshes avatars and management without duplicating related signals', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'fixture', url: baseURL! }, { name: 'locale', value: 'en', url: baseURL! }])
  await page.route('**/api/auth/get-session*', route => route.fulfill({ json: { session: { id: 'session', userId: 'viewer', expiresAt: '2030-01-01T00:00:00Z' }, user: { id: 'viewer', name: 'Viewer', email: 'viewer@example.test' } } }))
  let attending = false
  const event = () => ({ id: 'event', galaxyId: 'galaxy', title: 'Refresh fixture', description: 'Test', date: '2030-01-01T19:00:00Z', category: 'MEETUP', status: 'APPROVED', location: 'Test', onlineUrl: null, maxAttendees: null, coverImage: null, proposer: { id: 'viewer', name: 'Viewer', planetTexture: null, userLevel: 2 }, canManage: true, requiresApproval: false, rsvpCount: attending ? 1 : 0, userHasRSVPed: attending, userAttendance: attending ? 'APPROVED' : null, spotsRemaining: null, rsvps: attending ? [{ id: 'viewer', name: 'Viewer', planetTexture: null, userLevel: 2 }] : [] })
  await page.route('**/api/galaxies/events?*', route => route.fulfill({ json: { events: [event()], total: 1, pageSize: 20 } }))
  await page.route('**/api/posts?*', route => route.fulfill({ json: { posts: [], nextCursor: null } }))
  await page.route('**/api/galaxies/galaxy/events/event**', route => {
    const url = route.request().url()
    if (url.endsWith('/rsvp')) { attending = route.request().method() === 'POST'; return route.fulfill({ json: { rsvpCount: attending ? 1 : 0, userHasRSVPed: attending, userAttendance: attending ? 'APPROVED' : null } }) }
    if (url.endsWith('/attendees')) return route.fulfill({ json: { attendees: attending ? [{ userId: 'viewer', name: 'Viewer', status: 'APPROVED' }] : [] } })
    return route.fulfill({ json: { event: event(), isAdmin: true } })
  })
  await page.goto('/activities')
  await page.getByRole('heading', { name: 'Refresh fixture' }).click()
  const dialog = page.getByRole('dialog')
  const related = dialog.getByRole('heading', { name: 'Related stream signals', exact: true })
  await expect(related).toHaveCount(1)
  await dialog.getByRole('button', { name: 'View details & RSVP', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Remove member', exact: true })).toBeVisible()
  await expect(dialog.getByText('No RSVPs yet.', { exact: true })).toHaveCount(0)
  await expect(related).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Cancel attendance', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Remove member', exact: true })).toHaveCount(0)
  await expect(dialog.getByText('No RSVPs yet.', { exact: true })).toBeVisible()
  await expect(related).toHaveCount(1)
})
