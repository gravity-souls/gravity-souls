import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

const galaxy = { id: 'return-galaxy', slug: 'return-galaxy', name: 'Return galaxy', symbol: '✦', tagline: null, description: null, keywords: [], mood: 'calm', accentColor: '#a78bfa', maturity: 'forming', memberCount: 2, joined: true, isAdmin: false, creatorId: 'author', joinPolicy: 'OPEN' }
const event = { id: 'return-event', galaxyId: galaxy.id, title: 'Return activity', description: 'Activity fixture', date: '2030-01-01T12:00:00Z', category: 'ONLINE', status: 'APPROVED', rsvpCount: 0, rsvps: [], spotsRemaining: null, maxAttendees: null, userHasRSVPed: false, userAttendance: null, requiresApproval: false, proposer: { id: 'author', name: 'Author' } }
const post = { id: 'return-post', authorId: 'author', content: 'Original signal fixture', category: 'GENERAL', mediaUrls: [], mediaTypes: [], tags: [], likeCount: 0, commentCount: 0, comments: [], createdAt: '2026-10-01T12:00:00Z', updatedAt: '2026-10-01T12:00:00Z', userHasLiked: false, author: { id: 'author', name: 'Author', planetId: null, planetConfig: null, planetTexture: null, tintColor: '#a78bfa', userLevel: 1 }, contextRestricted: true, context: { galaxy: { id: galaxy.id, name: galaxy.name, slug: galaxy.slug, href: `/galaxy/${galaxy.slug}` }, event: { id: event.id, title: event.title, date: event.date, status: event.status, href: `/galaxy/${galaxy.slug}?event=${event.id}#events` } } }
async function setup(page: Page, context: BrowserContext, baseURL: string, locale: string) {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'return-ui-fixture', url: baseURL }, { name: 'locale', value: locale, url: baseURL }])
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth/get-session') return route.fulfill({ json: { session: { id: 'session', userId: 'viewer', expiresAt: '2030-01-01T00:00:00Z' }, user: { id: 'viewer', name: 'Viewer', email: 'viewer@example.test' } } })
    if (url.pathname === '/api/communities') return route.fulfill({ json: [galaxy] })
    if (url.pathname === '/api/posts') return route.fulfill({ json: { posts: [post], nextCursor: null } })
    if (url.pathname === '/api/posts/return-post') return route.fulfill({ json: { post } })
    if (url.pathname.endsWith('/events/return-event')) return route.fulfill({ json: { event, isAdmin: false } })
    if (url.pathname.endsWith('/events')) return route.fulfill({ json: { events: [event], total: 1, pageSize: 20 } })
    if (url.pathname.endsWith('/members')) return route.fulfill({ json: { members: [] } })
    if (url.pathname === '/api/saved-planets') return route.fulfill({ json: { savedPlanets: [] } })
    if (url.pathname === '/api/my-planet') return route.fulfill({ status: 404, json: {} })
    if (url.pathname.endsWith('/posts') || url.pathname.endsWith('/discussions')) return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
}
for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  test(`post/activity return keeps the original signal and activity in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    await page.goto('/stream/return-post')
    const detail = page.getByRole('dialog', { name: messages.stream.postDetail })
    await expect(detail).toContainText(post.content)
    await detail.getByRole('link', { name: event.title, exact: true }).click()
    await expect(page).toHaveURL(/\/galaxy\/return-galaxy\?event=return-event&returnPost=return-post#events/)
    const activity = page.getByRole('dialog', { name: messages.eventForms.eventDetail })
    await expect(activity).toContainText(event.title)
    await activity.getByRole('link', { name: messages.postContext.backPost }).click()
    await expect(page).toHaveURL(/\/stream\/return-post\?fromContext=/)
    await expect(detail).toContainText(post.content)
    await detail.getByRole('link', { name: messages.postContext.backEvent }).click()
    await expect(activity).toContainText(event.title)
  })
  test(`foreground failures clear old post data, permit retry and keep a safe exit in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    let status = 200
    await page.route('**/api/posts/return-post', route => route.fulfill({ status, json: status === 200 ? { post } : {} }))
    await page.goto(`/stream/return-post?${new URLSearchParams({ fromContext: post.context.event.href })}`)
    const detail = page.getByRole('dialog', { name: messages.stream.postDetail })
    await expect(detail).toContainText(post.content)
    status = 500
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(detail.getByRole('alert')).toContainText(messages.postContext.readFailed)
    await expect(detail).not.toContainText(post.content)
    await expect(detail.getByRole('link', { name: event.title, exact: true })).toHaveCount(0)
    status = 200
    await detail.getByRole('button', { name: messages.postContext.retry, exact: true }).click()
    await expect(detail).toContainText(post.content)
    status = 404
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(detail).toContainText(messages.postContext.unavailable)
    await expect(detail).not.toContainText(post.content)
    await detail.getByRole('button', { name: messages.postContext.close, exact: true }).click()
    await expect(page).toHaveURL(/\/galaxy\/return-galaxy\?event=return-event#events/)
  })
}
test('external return hints cannot redirect a closing post', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  await page.goto('/stream/return-post?fromContext=https%3A%2F%2Fevil.test')
  const detail = page.getByRole('dialog', { name: en.stream.postDetail })
  await expect(detail).toContainText(post.content)
  await expect(detail.getByRole('link', { name: en.postContext.backGalaxy })).toHaveCount(0)
  await detail.getByRole('button', { name: en.stream.close, exact: true }).click()
  await expect(page).toHaveURL(/\/stream$/)
})
for (const [locale, messages] of Object.entries({ en, fr, zh })) test(`same-galaxy activity changes follow the URL and expired details close in ${locale}`, async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, locale)
  let allowed = true
  const second = { ...event, id: 'second-event', title: 'Second activity' }
  await page.route('**/api/galaxies/return-galaxy/events/second-event', route => route.fulfill({ status: allowed ? 200 : 404, json: allowed ? { event: second, isAdmin: false } : {} }))
  await page.goto('/galaxy/return-galaxy?event=return-event&returnPost=return-post#events')
  const activity = page.getByRole('dialog', { name: messages.eventForms.eventDetail })
  await expect(activity).toContainText(event.title)
  await page.evaluate(() => window.history.pushState(null, '', '/galaxy/return-galaxy?event=second-event&returnPost=return-post#events'))
  await expect(activity).toContainText(second.title)
  await expect(activity).not.toContainText(event.title)
  const href = await activity.getByRole('link', { name: messages.postContext.backPost }).getAttribute('href')
  expect(new URL(href!, baseURL).searchParams.get('fromContext')).toBe('/galaxy/return-galaxy?event=second-event#events')
  allowed = false
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(activity).toHaveCount(0)
  await expect(page.getByRole('alert').first()).toBeVisible()
})
test('related signals discard a late page after refresh and clear failed reads', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  let latest = false, allowed = true, release: (() => void) | undefined
  await page.route('**/api/posts?*', async route => {
    const url = new URL(route.request().url())
    if (url.searchParams.has('cursor')) {
      await new Promise<void>(resolve => { release = resolve })
      return route.fulfill({ json: { posts: [{ ...post, id: 'late-post', content: 'Late private signal' }], nextCursor: null } })
    }
    return route.fulfill({ status: allowed ? 200 : 404, json: allowed ? { posts: latest ? [{ ...post, id: 'fresh-post', content: 'Fresh signal' }] : [post], nextCursor: latest ? null : post.id } : {} })
  })
  await page.goto('/galaxy/return-galaxy')
  const signals = page.locator('section').filter({ has: page.getByRole('heading', { name: en.postContext.related, exact: true }) })
  await expect(signals).toContainText(post.content)
  await signals.getByRole('button', { name: en.postContext.more, exact: true }).click()
  await expect.poll(() => !!release).toBe(true)
  latest = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(signals).toContainText('Fresh signal')
  release!()
  await expect(signals).not.toContainText('Late private signal')
  allowed = false
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(signals.getByRole('alert')).toContainText(en.postContext.readFailed)
  await expect(signals).not.toContainText('Fresh signal')
  allowed = true
  await signals.getByRole('button', { name: en.postContext.retry, exact: true }).click()
  await expect(signals).toContainText('Fresh signal')
})
