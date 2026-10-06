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
    if (url.pathname === '/api/posts/context') return route.fulfill({ json: { options: [], more: false } })
    if (url.pathname === '/api/posts/return-post') return route.fulfill({ json: { post } })
    if (url.pathname.endsWith('/events/return-event')) return route.fulfill({ json: { event, isAdmin: false } })
    if (url.pathname.endsWith('/events')) return route.fulfill({ json: { events: [event], total: 1, pageSize: 20 } })
    if (url.pathname.endsWith('/members')) return route.fulfill({ json: { members: [] } })
    if (url.pathname === '/api/saved-planets') return route.fulfill({ json: { savedPlanets: [] } })
    if (url.pathname === '/api/my-planet') return route.fulfill({ status: 404, json: {} })
    if (url.pathname === '/api/universe') return route.fulfill({ json: [] })
    if (url.pathname === '/api/star-map') return route.fulfill({ json: { groups: [], nodes: [], total: 0, scope: 'allVisible', nextCursor: null, selfPlanet: null } })
    if (url.pathname.endsWith('/posts') || url.pathname.endsWith('/discussions')) return route.fulfill({ json: [] })
    return route.fulfill({ json: {} })
  })
}
for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  for (const entry of ['direct', 'overlay'] as const) {
    test(`slow ${entry} post reads show the shared planet loader in ${locale}`, async ({ page, context, baseURL }) => {
      await setup(page, context, baseURL!, locale)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      let release!: () => void
      const pending = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/posts/return-post', async route => {
        await pending
        await route.fulfill({ json: { post } })
      })
      try {
        await page.goto(entry === 'direct' ? '/stream/return-post' : '/stream')
        if (entry === 'overlay') await page.getByRole('button').filter({ hasText: post.content }).click()
        const skeleton = page.getByRole('status').and(page.locator('[aria-busy="true"]'))
        await expect(skeleton).toBeVisible()
        await expect(skeleton).toContainText(messages.postContext.loading)
        await expect(skeleton).not.toContainText(post.content)
        const decoration = skeleton.locator('[aria-hidden="true"]')
        await expect(decoration).toBeVisible()
        await expect(decoration).toHaveAttribute('viewBox', '0 0 240 240')
        for (const group of await decoration.locator('g').all()) {
          expect(await group.evaluate(element => getComputedStyle(element).animationName)).toBe('none')
        }
        const box = await skeleton.boundingBox()
        expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
        if (entry === 'overlay') {
          const detail = page.getByRole('dialog', { name: messages.stream.postDetail })
          await expect(detail.getByRole('button', { name: messages.stream.close, exact: true })).toBeVisible()
        }
        release()
        const detail = page.getByRole('dialog', { name: messages.stream.postDetail })
        await expect(detail).toContainText(post.content)
        await expect(skeleton).toHaveCount(0)
      } finally {
        release()
      }
    })
  }
}
for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  test(`slow stream feed uses the shared planet loader in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    let release!: () => void
    const pending = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/posts?**', async route => {
      await pending
      await route.fulfill({ json: { posts: [post], nextCursor: null } })
    })
    try {
      await page.goto('/stream')
      const loader = page.getByRole('status', { name: messages.postContext.loading, exact: true })
      await expect(loader).toBeVisible()
      await expect(loader.locator('svg')).toHaveAttribute('viewBox', '0 0 240 240')
      await expect(loader).toHaveAttribute('aria-busy', 'true')
      release()
      await expect(page.getByRole('button').filter({ hasText: post.content })).toBeVisible()
      await expect(loader).toHaveCount(0)
    } finally {
      release()
    }
  })
}
for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  test(`post typography and galaxy association stay light and responsive in ${locale}`, async ({ page, context, baseURL }, testInfo) => {
    await setup(page, context, baseURL!, locale)
    const content = 'A quiet signal\nA second line beneath the stars.\n' + 'LongUnbrokenSignal'.repeat(15)
    const visualPost = { ...post, content, context: { ...post.context, galaxy: { ...post.context.galaxy, name: 'A very long galaxy name beneath the stars '.repeat(3) } } }
    await page.route('**/api/posts/return-post', route => route.fulfill({ json: { post: visualPost } }))
    await page.route('**/api/posts?**', route => route.fulfill({ json: { posts: [visualPost], nextCursor: null } }))
    await page.route('**/api/posts/context?**', route => route.fulfill({ json: { options: [{ id: galaxy.id, name: galaxy.name }], more: false } }))
    await page.goto('/stream')
    await page.getByRole('button').filter({ hasText: content }).click()
    const detail = page.getByRole('dialog', { name: messages.stream.postDetail })
    await expect(detail.getByText(content, { exact: true })).toHaveCount(1)
    await expect(detail.getByRole('link', { name: event.title, exact: true })).toBeVisible()
    expect(await detail.locator('article').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await detail.screenshot({ path: testInfo.outputPath('post-typography.png') })
    await detail.getByRole('button', { name: messages.stream.close, exact: true }).click()
    await page.getByRole('button', { name: messages.stream.createPost, exact: true }).filter({ visible: true }).first().click()
    const composer = page.getByRole('dialog', { name: messages.stream.createPost })
    await composer.getByRole('textbox', { name: messages.postContext.content, exact: true }).fill('A new signal beneath the stars')
    await composer.getByRole('combobox', { name: messages.postContext.galaxies, exact: true }).selectOption(galaxy.id)
    await expect(composer).toContainText(messages.postContext.memberAudience)
    expect(await composer.locator('article').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await composer.screenshot({ path: testInfo.outputPath('composer-typography.png') })
  })
}
test('a pending post overlay can close without waiting for its read', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  let release!: () => void
  const pending = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/posts/return-post', async route => {
    await pending
    await route.fulfill({ json: { post } })
  })
  try {
    await page.goto('/stream')
    await page.getByRole('button').filter({ hasText: post.content }).click()
    const detail = page.getByRole('dialog', { name: en.stream.postDetail })
    await expect(detail.locator('[aria-busy="true"]')).toBeVisible()
    await detail.getByRole('button', { name: en.stream.close, exact: true }).click()
    await expect(detail).toHaveCount(0)
    release()
    await expect(page).toHaveURL(/\/stream$/)
    await expect(detail).toHaveCount(0)
  } finally {
    release()
  }
})
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
  await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)').first()).toBeVisible()
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

const ownPost = { ...post, authorId: 'viewer', author: { ...post.author, id: 'viewer' }, contextRestricted: false, context: null }
async function ownerPlanet(page: Page) {
  const config = { baseTexture: 'mars.jpg', tintColor: '#a78bfa', atmosphereColor: '#c4b5fd', atmosphereDensity: .12, rotationSpeed: 0, cloudOpacity: 0, hasRing: false, ringColor: '' }
  const planet = { id: 'mine', userId: 'viewer', name: 'Owner planet', mood: 'calm', lifestyle: 'solitary', coreThemes: [], contentFragments: [], visual: {}, planetConfig: config }
  await page.route('**/api/my-planet', route => route.fulfill({ json: planet }))
  await page.route('**/api/me', route => route.fulfill({ json: { user: { id: 'viewer', name: 'Viewer', userLevel: 1, planetConfig: config }, planet } }))
  await page.route('**/api/planets', route => route.fulfill({ json: { planets: [] } }))
  await page.route(/\/api\/posts(?:\?.*)?$/, route => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({ json: { posts: [{ ...post, authorId: 'viewer' }], nextCursor: null } })
  })
  await page.route('**/api/posts/return-post', route => {
    if (route.request().method() !== 'GET') return route.fallback()
    return route.fulfill({ json: { post: { ...post, authorId: 'viewer', author: { ...post.author, id: 'viewer' } } } })
  })
}
for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  for (const origin of ['/stream', '/my-planet']) {
    test(`publishing locks controls, retains failed drafts and reports persistent success from ${origin} in ${locale}`, async ({ page, context, baseURL }) => {
      await setup(page, context, baseURL!, locale)
      if (origin === '/my-planet') await ownerPlanet(page)
      let release!: () => void, writes = 0, fail = true, submittedCategory = ''
      const pending = new Promise<void>(resolve => { release = resolve })
      await page.route('**/api/posts', async route => {
        if (route.request().method() !== 'POST') return route.fulfill({ json: { posts: [], nextCursor: null } })
        writes++
        submittedCategory = route.request().postData() ?? ''
        await pending
        await route.fulfill({ status: fail ? 429 : 201, json: fail ? { error: 'rateLimited' } : { post: { ...ownPost, id: 'created-post', content: 'Publish draft fixture', category: 'NATURE' } } })
      })
      await page.goto(origin)
      await page.getByRole('button', { name: messages.stream.createPost, exact: true }).filter({ visible: true }).first().click()
      const modal = page.getByRole('dialog', { name: messages.stream.createPost })
      await modal.getByPlaceholder(messages.stream.postPlaceholder).fill('Publish draft fixture')
      await modal.getByRole('button', { name: messages.stream.categories.nature, exact: true }).click()
      await modal.getByRole('button', { name: messages.stream.sendSignal, exact: true }).click()
      await expect(modal.getByRole('status')).toContainText(messages.stream.publishing)
      await expect(modal.getByPlaceholder(messages.stream.postPlaceholder)).toBeDisabled()
      await expect(modal.getByRole('button', { name: messages.stream.close, exact: true })).toBeDisabled()
      await expect(modal.getByRole('button', { name: messages.stream.closeCreatePost, exact: true })).toBeDisabled()
      await expect(modal.getByRole('button', { name: messages.stream.publishingShort, exact: true })).toBeDisabled()
      await page.keyboard.press('Escape')
      await expect(modal).toBeVisible()
      expect(writes).toBe(1)
      release()
      await expect(modal.getByRole('alert')).toContainText(messages.stream.rateError)
      await expect(modal.getByPlaceholder(messages.stream.postPlaceholder)).toHaveValue('Publish draft fixture')
      fail = false
      await modal.getByRole('button', { name: messages.stream.sendSignal, exact: true }).click()
      await expect(modal).toHaveCount(0)
      await expect(page.getByRole('status').filter({ hasText: messages.stream.signalSent })).toBeVisible()
      expect(submittedCategory).toContain('NATURE')
      await page.getByRole('button', { name: messages.stream.createPost, exact: true }).filter({ visible: true }).first().click()
      await expect(modal.getByPlaceholder(messages.stream.postPlaceholder)).toHaveValue('')
      await modal.getByPlaceholder(messages.stream.postPlaceholder).fill('Second signal')
      await modal.getByRole('button', { name: messages.stream.sendSignal, exact: true }).click()
      await expect(modal).toHaveCount(0)
      expect(submittedCategory).toContain('GENERAL')
      expect(writes).toBe(3)
    })
  }
  for (const origin of ['/stream', '/my-planet', '/']) test(`editing validates responses, preserves edits, locks close and updates comments/list from ${origin} in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    if (origin === '/my-planet') await ownerPlanet(page)
    const comment = { id: 'kept-comment', postId: post.id, parentId: null, content: 'Preserved comment', likeCount: 0, createdAt: post.createdAt, author: post.author, userHasLiked: false, replies: [] }
    const detailPost = { ...ownPost, comments: [comment], commentCount: 1 }
    await page.route('**/api/posts', route => route.fulfill({ json: { posts: [detailPost], nextCursor: null } }))
    let mode: 'invalid' | 'success' = 'invalid', release!: () => void, writes = 0
    const gate = new Promise<void>(resolve => { release = resolve })
    await page.route('**/api/posts/return-post', async route => {
      if (route.request().method() !== 'PATCH') return route.fulfill({ json: { post: detailPost } })
      writes++
      if (mode === 'success') await gate
      await route.fulfill({ json: { post: mode === 'invalid' ? { id: 'wrong' } : { ...ownPost, content: 'Authoritative edited signal', updatedAt: '2026-10-06T17:00:00Z' } } })
    })
    await page.goto(origin)
    await page.getByRole('button').filter({ hasText: post.content }).getByText(post.content, { exact: true }).click()
    const detail = page.getByRole('dialog', { name: messages.stream.postDetail })
    await detail.getByRole('button', { name: messages.postContext.edit, exact: true }).click()
    const editor = detail.getByRole('textbox', { name: messages.postContext.content, exact: true })
    await editor.fill('Edited draft')
    await detail.getByRole('button', { name: messages.postContext.save, exact: true }).click()
    await expect(detail.getByRole('alert')).toContainText(messages.postContext.failed)
    await expect(editor).toHaveValue('Edited draft')
    mode = 'success'
    await detail.getByRole('button', { name: messages.postContext.save, exact: true }).click()
    await expect(editor).toBeDisabled()
    await expect(detail.getByRole('button', { name: messages.stream.close, exact: true }).first()).toBeDisabled()
    await expect(detail.getByRole('status').filter({ hasText: messages.stream.savingLocked })).toBeVisible()
    release()
    await expect(detail).toContainText('Authoritative edited signal')
    await expect(detail).toContainText('Preserved comment')
    await expect(detail.getByRole('status').filter({ hasText: messages.stream.postSaved })).toBeVisible()
    await expect(editor).toHaveCount(0)
    await detail.getByRole('button', { name: messages.stream.close, exact: true }).click()
    await expect(page.getByRole('button').filter({ hasText: 'Authoritative edited signal' })).toHaveCount(1)
    expect(writes).toBe(2)
  })
}
test('grid does not refetch for inline callbacks, retries real errors, deduplicates and ignores late pages after filtering', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  let reads = 0, fail = true, release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/posts?*', async route => {
    reads++
    const url = new URL(route.request().url())
    if (url.searchParams.has('cursor')) {
      await gate
      return route.fulfill({ json: { posts: [post, { ...post, id: 'late-page', content: 'Late page signal' }], nextCursor: null } })
    }
    return route.fulfill({ status: fail ? 500 : 200, json: fail ? {} : { posts: url.searchParams.has('category') ? [{ ...post, id: 'nature-post', category: 'NATURE', content: 'Nature filtered signal' }] : [post, post], nextCursor: url.searchParams.has('category') ? null : post.id } })
  })
  await page.goto('/stream')
  await expect(page.getByRole('alert').filter({ hasText: en.stream.listError })).toBeVisible()
  await expect(page.getByText(en.stream.noResults, { exact: true })).toHaveCount(0)
  fail = false
  await page.getByRole('button', { name: en.postContext.retry, exact: true }).click()
  await expect(page.getByRole('button').filter({ hasText: post.content })).toHaveCount(1)
  await expect.poll(() => reads).toBeGreaterThanOrEqual(3)
  const stable = reads
  await page.getByRole('button', { name: en.stream.createPost, exact: true }).filter({ visible: true }).first().click()
  await page.getByRole('dialog').getByRole('button', { name: en.stream.close, exact: true }).click()
  expect(reads).toBe(stable)
  await page.getByRole('button', { name: en.stream.categories.nature, exact: true }).click()
  await expect(page.getByRole('button').filter({ hasText: 'Nature filtered signal' })).toHaveCount(1)
  release()
  await expect(page.getByRole('button').filter({ hasText: 'Late page signal' })).toHaveCount(0)
})
test('created signals respect active category/search filters and deleted signals do not reappear', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  let created = false, deleted = false
  const createdPost = { ...ownPost, id: 'new-signal', content: 'Created signal', category: 'GENERAL' }
  await page.route(/\/api\/posts(?:\/.*|\?.*)?$/, route => {
    const url = new URL(route.request().url()), method = route.request().method()
    if (url.pathname === '/api/posts/context') return route.fallback()
    if (method === 'POST') { created = true; return route.fulfill({ status: 201, json: { post: createdPost } }) }
    if (method === 'DELETE') { deleted = true; return route.fulfill({ json: { success: true } }) }
    if (url.pathname === '/api/posts/new-signal') return route.fulfill({ json: { post: createdPost } })
    return route.fulfill({ json: { posts: created && !deleted && !url.searchParams.has('category') && !url.searchParams.has('search') ? [createdPost] : [], nextCursor: null } })
  })
  await page.goto('/stream')
  await page.getByRole('button', { name: en.stream.categories.nature, exact: true }).click()
  await page.getByRole('button', { name: en.stream.createPost, exact: true }).filter({ visible: true }).first().click()
  const modal = page.getByRole('dialog')
  await modal.getByPlaceholder(en.stream.postPlaceholder).fill('Created signal')
  await modal.getByRole('button', { name: en.stream.sendSignal, exact: true }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByRole('button').filter({ hasText: 'Created signal' })).toHaveCount(0)
  await page.getByRole('button', { name: en.stream.categories.all, exact: true }).click()
  await expect(page.getByRole('button').filter({ hasText: 'Created signal' })).toHaveCount(1)
  await page.getByPlaceholder(en.stream.searchPlaceholder).fill('unmatched')
  await page.getByPlaceholder(en.stream.searchPlaceholder).press('Enter')
  await expect(page.getByRole('button').filter({ hasText: 'Created signal' })).toHaveCount(0)
  await page.getByRole('button', { name: en.common.clearSearch, exact: true }).click()
  await page.getByRole('button').filter({ hasText: 'Created signal' }).click()
  const detail = page.getByRole('dialog')
  await detail.getByRole('button', { name: en.common.delete, exact: true }).click()
  await expect(detail).toHaveCount(0)
  await page.getByRole('button', { name: en.stream.categories.nature, exact: true }).click()
  await page.getByRole('button', { name: en.stream.categories.all, exact: true }).click()
  await expect(page.getByRole('button').filter({ hasText: 'Created signal' })).toHaveCount(0)
})
for (const origin of ['/stream', '/my-planet', '/']) {
  test(`context round trip keeps originating ${origin} identity and safe close`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, 'en')
    if (origin === '/my-planet') await ownerPlanet(page)
    if (origin === '/stream') {
      await page.route('**/api/posts?*', route => route.fulfill({ json: { posts: [{ ...post, category: 'NATURE' }], nextCursor: null } }))
      await page.route('**/api/posts/return-post', route => route.fulfill({ json: { post: { ...post, category: 'NATURE' } } }))
    }
    await page.goto(origin)
    if (origin === '/stream') {
      await page.getByRole('button', { name: en.stream.categories.nature, exact: true }).click()
      await page.getByPlaceholder(en.stream.searchPlaceholder).fill('Original')
      const searched = page.waitForResponse(response => {
        const url = new URL(response.url())
        return url.pathname === '/api/posts' && url.searchParams.get('search') === 'Original'
      })
      await page.getByPlaceholder(en.stream.searchPlaceholder).press('Enter')
      await searched
    }
    const card = page.getByRole('button').filter({ hasText: post.content })
    await expect(card).toBeVisible()
    if (origin !== '/stream') await card.scrollIntoViewIfNeeded()
    const scroll = await page.evaluate(() => window.scrollY)
    await card.getByText(post.content, { exact: true }).click()
    const detail = page.getByRole('dialog', { name: en.stream.postDetail })
    await expect(detail).toContainText(post.content)
    await detail.getByRole('button', { name: en.stream.close, exact: true }).click()
    await expect(detail).toHaveCount(0)
    await expect(page).toHaveURL(`${baseURL}${origin}`)
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, -1)
    await card.getByText(post.content, { exact: true }).click()
    await detail.getByRole('link', { name: event.title, exact: true }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('fromStream')).toBe(origin)
    await expect(page.getByRole('dialog', { name: en.eventForms.eventDetail }).getByRole('link').filter({ hasText: post.content })).toHaveAttribute('href', /fromStream=/)
    await page.getByRole('dialog', { name: en.eventForms.eventDetail }).getByRole('link', { name: en.postContext.backPost }).click()
    await expect(detail).toContainText(post.content)
    expect(new URL(page.url()).searchParams.get('fromStream')).toBe(origin)
    await detail.getByRole('button', { name: en.stream.close, exact: true }).click()
    await expect(page).toHaveURL(`${baseURL}${origin}`)
    if (origin === '/stream') await expect(page.getByPlaceholder(en.stream.searchPlaceholder)).toHaveValue('Original')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, -1)
  })
}
for (const [locale, messages] of Object.entries({ en, fr, zh })) test(`known publish errors are localized and media previews are released in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    await page.addInitScript(() => {
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL)
      let created = 0, revoked = 0
      URL.createObjectURL = object => { document.documentElement.dataset.previewCreated = String(++created); return create(object) }
      URL.revokeObjectURL = url => { document.documentElement.dataset.previewRevoked = String(++revoked); revoke(url) }
    })
    let status = 401, error = 'Unauthorized'
    await page.route('**/api/posts', route => route.fulfill({ status, json: { error } }))
    await page.goto('/stream')
    await page.getByRole('button', { name: messages.stream.createPost, exact: true }).filter({ visible: true }).first().click()
    const modal = page.getByRole('dialog')
    await modal.getByPlaceholder(messages.stream.postPlaceholder).fill('Retained draft')
    await modal.locator('input[type=file]').setInputFiles({ name: 'preview.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') })
    await expect(page.locator('html')).toHaveAttribute('data-preview-created', '1')
    const cases = [
      [401, 'Unauthorized', messages.stream.authError],
      [400, 'Invalid request fields', messages.stream.validationError],
      [404, 'contextUnavailable', messages.stream.contextError],
      [400, 'Images must be 5MB or smaller', messages.stream.imageSizeError],
      [403, 'authorOnly', messages.stream.permissionError],
      [500, 'Media upload failed', messages.stream.sendError],
    ] as const
    for (const [nextStatus, nextError, expected] of cases) {
      status = nextStatus; error = nextError
      await modal.getByRole('button', { name: messages.stream.sendSignal, exact: true }).click()
      await expect(modal.getByRole('alert')).toContainText(expected)
      await expect(modal.getByPlaceholder(messages.stream.postPlaceholder)).toHaveValue('Retained draft')
      await expect(modal.locator('img')).toHaveCount(1)
    }
    await modal.getByRole('button', { name: messages.stream.removeMedia, exact: true }).click()
    await expect(page.locator('html')).toHaveAttribute('data-preview-revoked', '1')
    await modal.getByRole('button', { name: messages.stream.close, exact: true }).click()
})
test('arbitrary stream origins cannot redirect a direct post close', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  await page.goto('/stream/return-post?fromStream=https%3A%2F%2Fevil.example')
  await page.getByRole('dialog').getByRole('button', { name: en.stream.close, exact: true }).click()
  await expect(page).toHaveURL(`${baseURL}/stream`)
})
test('paging failures retain loaded cards and retry deduplicates successful pages', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  let fail = true
  await page.route('**/api/posts?*', route => {
    const paging = new URL(route.request().url()).searchParams.has('cursor')
    return route.fulfill({ status: paging && fail ? 500 : 200, json: paging && fail ? {} : { posts: paging ? [post, { ...post, id: 'second', content: 'Second page signal' }] : [post], nextCursor: paging ? null : post.id } })
  })
  await page.goto('/stream')
  const cards = page.locator('.stream-masonry')
  await expect(page.getByRole('alert').filter({ hasText: en.stream.listError })).toBeVisible()
  await expect(cards.getByRole('button').filter({ hasText: post.content })).toHaveCount(1)
  fail = false
  await page.getByRole('button', { name: en.postContext.retry, exact: true }).click()
  await expect(cards.getByRole('button').filter({ hasText: 'Second page signal' })).toHaveCount(1)
  await expect(cards.getByRole('button').filter({ hasText: post.content })).toHaveCount(1)
})
test('publish refresh keeps loaded cards and scroll while the first page is pending', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  const posts = Array.from({ length: 20 }, (_, index) => ({ ...post, id: `existing-${index}`, content: `Existing signal ${index}`, context: null }))
  let refresh = false, release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/posts?*', async route => {
    if (refresh) await gate
    await route.fulfill({ json: { posts, nextCursor: null } })
  })
  await page.route('**/api/posts', route => { refresh = true; return route.fulfill({ status: 201, json: { post: { ...ownPost, id: 'new-published', content: 'New published signal' } } }) })
  await page.goto('/stream')
  await expect(page.getByRole('button').filter({ hasText: 'Existing signal 19' })).toHaveCount(1)
  await page.evaluate(() => window.scrollTo(0, 400))
  await page.getByRole('button', { name: en.stream.createPost, exact: true }).filter({ visible: true }).first().click()
  const modal = page.getByRole('dialog')
  await modal.getByPlaceholder(en.stream.postPlaceholder).fill('New published signal')
  await modal.getByRole('button', { name: en.stream.sendSignal, exact: true }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByRole('button').filter({ hasText: 'Existing signal 19' })).toHaveCount(1)
  await expect(page.getByRole('button').filter({ hasText: 'New published signal' })).toHaveCount(1)
  const scroll = await page.evaluate(() => window.scrollY)
  release()
  await expect(page.getByRole('status').filter({ hasText: en.postContext.loading })).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, -1)
})
test('editing removes a signal immediately from active search/tag filters without rereading the list', async ({ page, context, baseURL }) => {
  await setup(page, context, baseURL!, 'en')
  const original = { ...ownPost, content: 'Searchable original', tags: ['selected'] }
  let reads = 0
  await page.route('**/api/posts?*', route => { reads++; return route.fulfill({ json: { posts: [original], nextCursor: null } }) })
  await page.route('**/api/posts/return-post', route => route.fulfill({ json: { post: route.request().method() === 'PATCH' ? { ...original, content: 'Edited away', updatedAt: '2026-10-06T17:00:00Z' } : original } }))
  await page.goto('/stream')
  await page.getByPlaceholder(en.stream.searchPlaceholder).fill('Searchable')
  await page.getByPlaceholder(en.stream.searchPlaceholder).press('Enter')
  await page.getByRole('button').filter({ hasText: original.content }).click()
  const detail = page.getByRole('dialog')
  await detail.getByRole('button', { name: en.postContext.edit, exact: true }).click()
  await detail.getByRole('textbox', { name: en.postContext.content, exact: true }).fill('Edited away')
  const before = reads
  await detail.getByRole('button', { name: en.postContext.save, exact: true }).click()
  await expect(detail.getByRole('status').filter({ hasText: en.stream.postSaved })).toBeVisible()
  await expect(page.locator('.stream-masonry').getByRole('button')).toHaveCount(0)
  expect(reads).toBe(before)
  await detail.getByRole('button', { name: '#selected', exact: true }).click()
  await expect(detail).toHaveCount(0)
  await expect(page.getByPlaceholder(en.stream.searchPlaceholder)).toHaveValue('#selected')
  await expect(page.locator('.stream-masonry').getByRole('button').filter({ hasText: 'Edited away' })).toHaveCount(1)
})
