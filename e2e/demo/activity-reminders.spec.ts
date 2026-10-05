import { test, expect } from '@playwright/test'

test('calendar reminder is opt-in, retries a failed read and disappears after withdrawal', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'fixture', url: baseURL! }, { name: 'locale', value: 'en', url: baseURL! }])
  let attending = true, fail = true, calendarReads = 0, attendanceWrites = 0
  const event = () => ({ id: 'calendar-event', galaxyId: 'calendar-galaxy', title: 'Calendar fixture', description: 'Test', date: '2030-01-01T12:00:00Z', category: 'MEETUP', status: 'APPROVED', location: 'Test', onlineUrl: null, maxAttendees: null, coverImage: null, proposer: { id: 'organizer', name: 'Organizer', planetTexture: null }, isOrganizer: false, userInterested: false, requiresApproval: true, rsvpCount: attending ? 1 : 0, userHasRSVPed: attending, userAttendance: attending ? 'APPROVED' : 'CANCELLED', spotsRemaining: null, rsvps: [] })
  await page.route('**/api/galaxies/events?*', route => route.fulfill({ json: { events: [event()], total: 1, pageSize: 20 } }))
  await page.route('**/api/posts?*', route => route.fulfill({ json: { posts: [], nextCursor: null } }))
  await page.route('**/api/galaxies/calendar-galaxy/events/calendar-event**', route => {
    if (route.request().url().endsWith('/calendar')) {
      calendarReads++
      return fail ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ contentType: 'text/calendar', body: 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n' })
    }
    if (route.request().url().endsWith('/rsvp')) {
      attendanceWrites++; attending = false
      return route.fulfill({ json: { rsvpCount: 0, userHasRSVPed: false, userAttendance: 'CANCELLED' } })
    }
    return route.fulfill({ json: { event: event(), isAdmin: false } })
  })
  await page.goto('/activities')
  await page.getByRole('heading', { name: 'Calendar fixture' }).click()
  const dialog = page.getByRole('dialog'), add = dialog.getByRole('button', { name: 'Add to calendar · 15-minute reminder', exact: true })
  await expect(add).toBeVisible()
  expect(calendarReads).toBe(0)
  await add.click()
  await expect(dialog.locator('p[role="alert"]')).toContainText('Could not download')
  fail = false
  const download = page.waitForEvent('download')
  await add.click()
  expect((await download).suggestedFilename()).toBe('gravity-souls-activity.ics')
  await expect(dialog.getByRole('status')).toContainText('downloading alone does not enable a reminder')
  expect(attendanceWrites).toBe(0)
  await dialog.getByRole('button', { name: 'Cancel attendance', exact: true }).click()
  await expect(add).toHaveCount(0)
  await expect(dialog.getByRole('status')).toContainText('You withdrew')
  expect(calendarReads).toBe(2)
  expect(attendanceWrites).toBe(1)
})
