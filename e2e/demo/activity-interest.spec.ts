import { test, expect } from '@playwright/test'

test('interest remains independent of RSVP and failed removal preserves the save', async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'ui-fixture', url: baseURL! },
    { name: 'locale', value: 'zh', url: baseURL! },
  ])
  let interested = false
  let failRemoval = true
  let attendanceWrites = 0
  const event = {
    id: 'activity-fixture', galaxyId: 'galaxy-fixture', title: '测试活动', description: '活动链路',
    date: '2030-01-01T12:00:00Z', status: 'APPROVED', category: 'ONLINE', location: null,
    onlineUrl: null, coverImage: null, maxAttendees: 10, rsvpCount: 0, userHasRSVPed: false,
    proposer: { id: 'organizer', name: 'Organizer' },
  }
  await page.route('**/api/galaxies/events?*', route => route.fulfill({ json: {
    events: route.request().url().includes('status=interested') && !interested ? [] : [{ ...event, userInterested: interested }],
    total: interested || !route.request().url().includes('status=interested') ? 1 : 0, page: 1, pageSize: 20,
  } }))
  await page.route('**/api/galaxies/galaxy-fixture/events/activity-fixture/interest', route => {
    if (route.request().method() === 'DELETE' && failRemoval) return route.fulfill({ status: 500, json: { error: 'failed' } })
    if (route.request().method() === 'POST') interested = true
    if (route.request().method() === 'DELETE') { interested = false; return route.fulfill({ status: 204 }) }
    return route.fulfill({ json: { interested } })
  })
  await page.route('**/api/galaxies/galaxy-fixture/events/activity-fixture/rsvp', route => {
    attendanceWrites++
    return route.fulfill({ status: 500, json: {} })
  })
  await page.goto('/activities')
  await page.getByRole('button', { name: '感兴趣', exact: true }).last().click()
  await expect(page.getByRole('button', { name: '已收藏 · 感兴趣', exact: true })).toHaveAttribute('aria-pressed', 'true')
  expect(attendanceWrites).toBe(0)
  await page.getByRole('button', { name: '感兴趣', exact: true }).first().click()
  await page.getByRole('button', { name: '已收藏 · 感兴趣', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('无法更新活动收藏')
  await expect(page.getByText('测试活动', { exact: true })).toBeVisible()
  failRemoval = false
  await page.getByRole('button', { name: '已收藏 · 感兴趣', exact: true }).click()
  await expect(page.getByText('还没有收藏活动。点击“感兴趣”后，可以在这里找到。', { exact: true })).toBeVisible()
  expect(attendanceWrites).toBe(0)
})

test('legacy activity links retain the selected tab', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'ui-fixture', url: baseURL! }])
  await page.route('**/api/galaxies/events?*', route => route.fulfill({ json: { events: [], total: 0, pageSize: 20 } }))
  await page.goto('/galaxies/events?status=interested')
  await expect(page).toHaveURL(/\/activities\?status=interested$/)
})
