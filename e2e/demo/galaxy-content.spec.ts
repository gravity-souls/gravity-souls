import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

const galaxy = { id: 'content-galaxy', slug: 'content-galaxy', name: 'Content galaxy', symbol: '✦', keywords: [], mood: 'calm', accentColor: '#a78bfa', maturity: 'forming', memberCount: 2, joined: true, creatorId: 'author', joinPolicy: 'OPEN' }
const author = { id: 'author', name: 'Public pseudonym', planet: { id: 'planet', name: 'Distinct planet name' } }
const date = '2026-10-01T12:00:00Z'
const reply = { id: 'reply', content: 'Original reply', author, createdAt: date, canDelete: true, likes: 0, likedByMe: false }
const post = { id: 'community-post', content: 'Community signal\n' + 'LongUnbrokenContent'.repeat(30), author, createdAt: date, likes: 0, replies: 1, replyItems: [reply], canDelete: true }
const topic = { id: 'discussion', title: 'A real discussion', heat: 0.5, replies: 1, replyItems: [reply], canDelete: true }
const root = `/api/communities/${galaxy.id}`
function gate() {
  let release!: () => void
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}
async function setup(page: Page, context: BrowserContext, baseURL: string, locale: string) {
  await context.addCookies([{ name: 'locale', value: locale, url: baseURL }, { name: 'better-auth.session_token', value: 'content-fixture', url: baseURL }])
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth/get-session') return route.fulfill({ json: { session: { id: 'session', userId: 'author', expiresAt: '2030-01-01T00:00:00Z' }, user: { id: 'author', name: author.name, email: 'author@example.test' } } })
    if (url.pathname === '/api/communities') return route.fulfill({ json: [galaxy] })
    if (url.pathname === `${root}/posts`) return route.fulfill({ json: { joined: true, posts: [post] } })
    if (url.pathname === `${root}/discussions`) return route.fulfill({ json: { discussions: [topic] } })
    if (url.pathname.endsWith('/members')) return route.fulfill({ json: { members: [] } })
    if (url.pathname.endsWith('/events')) return route.fulfill({ json: { events: [], total: 0, pageSize: 20 } })
    if (url.pathname === '/api/posts') return route.fulfill({ json: { posts: [], nextCursor: null } })
    if (url.pathname === '/api/saved-planets') return route.fulfill({ json: { savedPlanets: [] } })
    if (url.pathname === '/api/my-planet') return route.fulfill({ json: {} })
    return route.fulfill({ json: {} })
  })
}

for (const [locale, m] of Object.entries({ en, fr, zh })) {
  for (const kind of ['posts', 'discussions'] as const) {
    test(`${kind} reply likes acknowledge state, retain failures/drafts and refresh counts in ${locale}`, async ({ page, context, baseURL }) => {
      await setup(page, context, baseURL!, locale)
      const pending = gate()
      let likedByMe = false, likes = 3, writes = 0
      const targetId = kind === 'posts' ? post.id : topic.id
      const state = () => ({ ...reply, likes, likedByMe })
      await page.route(`**${root}/posts`, route => route.fulfill({ json: { joined: true, posts: [{ ...post, replyItems: [state()] }] } }))
      await page.route(`**${root}/discussions`, route => route.fulfill({ json: { discussions: [{ ...topic, replyItems: [state()] }] } }))
      await page.route(`**${root}/${kind}/${targetId}/replies/${reply.id}/like`, async route => {
        writes++
        const desired = route.request().postDataJSON().liked
        expect(typeof desired).toBe('boolean')
        if (writes === 1 || writes === 6) return route.fulfill({ status: 500, json: {} })
        if (writes === 2) return route.abort('failed')
        if (writes === 3) return route.fulfill({ json: { liked: desired, likes: -1 } })
        if (writes === 4) return route.fulfill({ json: { liked: !desired, likes: 100 } })
        if (writes === 5) await pending.promise
        if (desired !== likedByMe) likes += desired ? 1 : -1
        likedByMe = desired
        return route.fulfill({ json: { liked: likedByMe, likes } })
      })
      const open = async () => {
        if (kind === 'discussions') await page.getByRole('button').filter({ hasText: topic.title }).click()
        return kind === 'posts'
          ? page.locator('article').filter({ hasText: post.content })
          : page.getByRole('dialog', { name: topic.title })
      }
      const label = (liked: boolean, count: number) => m.galaxyPage[liked ? 'unlikeReply' : 'likeReply'].replace('{count}', String(count))
      try {
        await page.goto(`/galaxy/${galaxy.slug}`)
        let surface = await open()
        const draft = surface.getByRole('textbox')
        await draft.fill('Independent retained reply draft')
        for (let attempt = 1; attempt <= 4; attempt++) {
          const heart = surface.getByRole('button', { name: label(false, 3), exact: true })
          await heart.click()
          await expect(surface.getByRole('alert').filter({ hasText: m.galaxyPage.likeFailed })).toBeVisible()
          await expect(heart).toHaveAttribute('aria-pressed', 'false')
          await expect(heart).toHaveText('3')
          await expect(heart).toBeEnabled()
          await expect(draft).toHaveValue('Independent retained reply draft')
          expect(writes).toBe(attempt)
        }
        const heart = surface.getByRole('button', { name: label(false, 3), exact: true })
        await heart.click()
        await expect(heart).toBeDisabled()
        await expect(heart).toHaveAttribute('aria-busy', 'true')
        await expect(heart).toHaveAttribute('aria-pressed', 'false')
        await expect(heart).toHaveText('3')
        await heart.dispatchEvent('click')
        expect(writes).toBe(5)
        await expect(draft).toBeEnabled()
        await draft.fill('Draft remains editable during liking')
        if (kind === 'discussions') await expect(surface.getByRole('button', { name: m.galaxyPage.closeThread, exact: true })).toBeDisabled()
        pending.release()
        const likedHeart = surface.getByRole('button', { name: label(true, 4), exact: true })
        await expect(likedHeart).toHaveAttribute('aria-pressed', 'true')
        await expect(likedHeart).toHaveText('4')
        await expect(likedHeart).toBeEnabled()
        await expect(draft).toHaveValue('Draft remains editable during liking')
        if (kind === 'discussions') {
          await surface.getByRole('button', { name: m.galaxyPage.closeThread, exact: true }).click()
          surface = await open()
          await expect(surface.getByRole('textbox')).toHaveValue('Draft remains editable during liking')
          await expect(surface.getByRole('button', { name: label(true, 4), exact: true })).toHaveAttribute('aria-pressed', 'true')
        }
        await page.reload()
        surface = await open()
        const refreshed = surface.getByRole('button', { name: label(true, 4), exact: true })
        await expect(refreshed).toHaveText('4')
        await expect(refreshed).toHaveAttribute('aria-pressed', 'true')
        await refreshed.click()
        await expect(surface.getByRole('alert').filter({ hasText: m.galaxyPage.likeFailed })).toBeVisible()
        await expect(refreshed).toHaveAttribute('aria-pressed', 'true')
        await expect(refreshed).toHaveText('4')
        await refreshed.click()
        await expect(surface.getByRole('button', { name: label(false, 3), exact: true })).toHaveAttribute('aria-pressed', 'false')
        expect(writes).toBe(7)
        await page.reload()
        surface = await open()
        await expect(surface.getByRole('button', { name: label(false, 3), exact: true })).toHaveText('3')
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      } finally { pending.release() }
    })
  }

  test(`galaxy loaders, pseudonyms and responsive content in ${locale}`, async ({ page, context, baseURL }, testInfo) => {
    await setup(page, context, baseURL!, locale)
    const pending = gate()
    await page.route(`**${root}/posts`, async route => { await pending.promise; await route.fulfill({ json: { posts: [post], joined: true } }) })
    await page.route(`**${root}/discussions`, async route => { await pending.promise; await route.fulfill({ json: { discussions: [topic] } }) })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    try {
      await page.goto(`/galaxy/${galaxy.slug}`)
      for (const label of [m.galaxyPage.loadingPosts, m.galaxyPage.loadingDiscussions]) {
        const loader = page.getByRole('status', { name: label, exact: true })
        await expect(loader).toBeVisible()
        await expect(loader.locator('svg')).toHaveAttribute('viewBox', '0 0 240 240')
        for (const group of await loader.locator('svg g').all()) expect(await group.evaluate(el => getComputedStyle(el).animationName)).toBe('none')
      }
      pending.release()
      const card = page.locator('article').filter({ hasText: post.content })
      await expect(card.getByRole('link', { name: author.name, exact: true })).toHaveCount(2)
      await expect(card.getByRole('link', { name: author.name, exact: true }).first()).toBeVisible()
      await expect(card).not.toContainText(author.planet.name)
      expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      await expect(card.getByText(post.content, { exact: true })).toHaveCSS('white-space', 'pre-wrap')
      await page.getByRole('button').filter({ hasText: topic.title }).click()
      const dialog = page.getByRole('dialog', { name: topic.title })
      await expect(dialog.getByText(author.name, { exact: true })).toBeVisible()
      await expect(dialog).not.toContainText(author.planet.name)
      expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
      await dialog.screenshot({ path: testInfo.outputPath('discussion-layout.png') })
      await dialog.getByRole('button', { name: m.galaxyPage.closeThread, exact: true }).click()
      await card.screenshot({ path: testInfo.outputPath('community-layout.png') })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    } finally { pending.release() }
  })

  test(`community publish, reply and delete retain drafts and lock pending actions in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    const pendingPost = gate(), pendingReply = gate(), pendingDelete = gate()
    let posts = 0, replies = 0, deletes = 0
    await page.route(`**${root}/posts`, async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { posts: [post], joined: true } })
      posts++
      if (posts === 1) return route.fulfill({ status: 500, json: { error: 'Failure' } })
      await pendingPost.promise
      return route.fulfill({ status: 201, json: { post: { ...post, id: 'created-post', content: 'My retained draft', replies: 0, replyItems: [] } } })
    })
    await page.route(`**${root}/posts/created-post/replies`, async route => {
      replies++
      if (replies === 1) return route.fulfill({ status: 500, json: { error: 'Failure' } })
      await pendingReply.promise
      return route.fulfill({ status: 201, json: { reply: { ...reply, content: 'My retained reply' }, replies: 1 } })
    })
    await page.route(`**${root}/posts/created-post`, async route => {
      deletes++
      if (deletes === 1) return route.fulfill({ status: 500, json: { error: 'Failure' } })
      await pendingDelete.promise
      return route.fulfill({ json: { success: true } })
    })
    try {
      await page.goto(`/galaxy/${galaxy.slug}`)
      const section = page.getByRole('region', { name: m.galaxyPage.communityPosts })
      const draft = section.getByRole('textbox', { name: m.galaxyPage.postPlaceholder.replace('{name}', galaxy.name) })
      await draft.fill('My retained draft')
      await section.getByRole('button', { name: m.galaxyWorkflow.post, exact: true }).click()
      await expect(page.getByRole('alert').filter({ hasText: m.galaxyPage.publishFailed })).toBeVisible()
      await expect(draft).toHaveValue('My retained draft')
      await section.getByRole('button', { name: m.galaxyWorkflow.post, exact: true }).click()
      await expect(draft).toBeDisabled()
      await expect(section.getByRole('button', { name: m.galaxyWorkflow.saving, exact: true })).toBeDisabled()
      expect(posts).toBe(2)
      pendingPost.release()
      const card = section.locator('article').filter({ hasText: 'My retained draft' })
      await expect(card).toBeVisible()
      await expect(draft).toHaveValue('')
      await expect(page.getByRole('status').filter({ hasText: m.galaxyPage.postPublished })).toBeVisible()
      await expect(card.getByRole('link', { name: author.name, exact: true })).toBeVisible()
      await card.getByRole('button', { name: `${m.galaxyWorkflow.reply} · 0`, exact: true }).click()
      const replyDraft = card.getByRole('textbox')
      await replyDraft.fill('My retained reply')
      await card.getByRole('button', { name: m.galaxyWorkflow.sendReply, exact: true }).click()
      await expect(page.getByRole('alert').filter({ hasText: m.galaxyPage.replyFailed })).toBeVisible()
      await expect(replyDraft).toHaveValue('My retained reply')
      await card.getByRole('button', { name: m.galaxyWorkflow.sendReply, exact: true }).click()
      await expect(replyDraft).toBeDisabled()
      expect(replies).toBe(2)
      pendingReply.release()
      await expect(card.getByText('My retained reply', { exact: true })).toBeVisible()
      await expect(replyDraft).toHaveValue('')
      page.once('dialog', dialog => dialog.dismiss())
      await card.getByRole('button', { name: m.galaxyWorkflow.deleteContent, exact: true }).first().click()
      expect(deletes).toBe(0)
      page.once('dialog', dialog => dialog.accept())
      await card.getByRole('button', { name: m.galaxyWorkflow.deleteContent, exact: true }).first().click()
      await expect(page.getByRole('alert').filter({ hasText: m.galaxyWorkflow.failed })).toBeVisible()
      await expect(card).toBeVisible()
      page.once('dialog', dialog => dialog.accept())
      await card.getByRole('button', { name: m.galaxyWorkflow.deleteContent, exact: true }).first().click()
      await expect(card.getByRole('button', { name: m.galaxyWorkflow.saving, exact: true })).toBeDisabled()
      expect(deletes).toBe(2)
      pendingDelete.release()
      await expect(card).toHaveCount(0)
      await expect(page.getByRole('status').filter({ hasText: m.galaxyPage.contentDeleted })).toBeVisible()
    } finally { pendingPost.release(); pendingReply.release(); pendingDelete.release() }
  })

  test(`discussion creation, reply, draft reopening and author deletion in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    const pending = gate(), pendingReply = gate()
    let creates = 0, replies = 0, replyDeletes = 0
    let topics = [topic]
    await page.route(`**${root}/discussions`, async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { discussions: topics } })
      creates++
      if (creates === 1) return route.fulfill({ status: 409, json: { error: 'duplicateDiscussion' } })
      await pending.promise
      topics = [{ ...topic, id: 'new-discussion', title: 'My new discussion' }, topic]
      return route.fulfill({ status: 201, json: { discussion: topics[0] } })
    })
    await page.route(`**${root}/discussions/new-discussion/replies`, async route => {
      replies++
      if (replies === 1) return route.fulfill({ status: 500, json: {} })
      await pendingReply.promise
      return route.fulfill({ status: 201, json: { reply: { ...reply, id: 'new-reply', content: 'New discussion reply' }, replies: 2 } })
    })
    await page.route(`**${root}/discussions/new-discussion/replies/new-reply`, route => {
      replyDeletes++
      return route.fulfill({ json: { success: true } })
    })
    await page.route(`**${root}/discussions/new-discussion`, route => route.fulfill({ json: { success: true } }))
    try {
      await page.goto(`/galaxy/${galaxy.slug}`)
      const postDraft = page.getByRole('textbox', { name: m.galaxyPage.postPlaceholder.replace('{name}', galaxy.name) })
      await postDraft.fill('Unpublished community draft')
      await page.getByRole('button', { name: m.galaxyWorkflow.startDiscussion, exact: true }).click()
      const title = page.getByRole('textbox', { name: m.galaxyWorkflow.discussionTitle, exact: true })
      const content = page.getByRole('textbox', { name: m.galaxyWorkflow.discussionContent, exact: true })
      const composer = title.locator('xpath=ancestor::section')
      await title.fill('My new discussion')
      await content.fill('Opening discussion signal')
      await composer.getByRole('button', { name: m.galaxyWorkflow.post, exact: true }).click()
      await expect(composer.getByRole('alert')).toHaveText(m.galaxyWorkflow.duplicateDiscussion)
      await expect(title).toHaveValue('My new discussion')
      await expect(content).toHaveValue('Opening discussion signal')
      await composer.getByRole('button', { name: m.galaxyWorkflow.post, exact: true }).click()
      await expect(title).toBeDisabled()
      await expect(content).toBeDisabled()
      await expect(composer.getByRole('button', { name: m.galaxyWorkflow.close, exact: true })).toBeDisabled()
      expect(creates).toBe(2)
      pending.release()
      const topicButton = page.getByRole('button').filter({ hasText: 'My new discussion' })
      await expect(topicButton).toBeVisible()
      await expect(postDraft).toHaveValue('Unpublished community draft')
      await topicButton.click()
      const dialog = page.getByRole('dialog', { name: 'My new discussion' })
      const draft = dialog.getByRole('textbox')
      await draft.fill('Retained across close')
      await dialog.getByRole('button', { name: m.galaxyPage.closeThread, exact: true }).click()
      await topicButton.click()
      await expect(draft).toHaveValue('Retained across close')
      await draft.fill('New discussion reply')
      await dialog.getByRole('button', { name: m.galaxyPage.sendReply, exact: true }).click()
      await expect(dialog.getByRole('alert')).toHaveText(m.galaxyPage.replyFailed)
      await expect(draft).toHaveValue('New discussion reply')
      await dialog.getByRole('button', { name: m.galaxyPage.sendReply, exact: true }).click()
      await expect(draft).toBeDisabled()
      await expect(dialog.getByRole('button', { name: m.galaxyPage.closeThread, exact: true })).toBeDisabled()
      expect(replies).toBe(2)
      pendingReply.release()
      await expect(dialog.getByText('New discussion reply', { exact: true })).toBeVisible()
      await expect(draft).toHaveValue('')
      const newReply = dialog.getByText('New discussion reply', { exact: true }).locator('..')
      page.once('dialog', d => d.accept())
      await newReply.getByRole('button', { name: m.galaxyWorkflow.deleteContent, exact: true }).click()
      await expect(newReply).toHaveCount(0)
      expect(replyDeletes).toBe(1)
      page.once('dialog', d => d.accept())
      await dialog.getByRole('button', { name: m.galaxyWorkflow.deleteContent, exact: true }).first().click()
      await expect(dialog).toHaveCount(0)
      await expect(topicButton).toHaveCount(0)
      await expect(postDraft).toHaveValue('Unpublished community draft')
    } finally { pending.release(); pendingReply.release() }
  })

  test(`reply loading failure is retryable without falsifying totals in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    await page.route(`**${root}/posts`, route => route.fulfill({ json: { posts: [{ ...post, replies: 3 }], joined: true } }))
    let reads = 0
    await page.route(`**${root}/posts/${post.id}/replies`, route => {
      reads++
      return reads === 1 ? route.fulfill({ status: 500, json: {} }) : route.fulfill({ json: { replies: [reply, { ...reply, id: 'second', content: 'Second reply' }, { ...reply, id: 'third', content: 'Third reply' }] } })
    })
    await page.goto(`/galaxy/${galaxy.slug}`)
    const card = page.locator('article').filter({ hasText: post.content })
    await card.getByRole('button', { name: m.galaxyPage.loadAllReplies, exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: m.galaxyPage.repliesUnavailable })).toHaveText(m.galaxyPage.repliesUnavailable)
    await expect(card.getByText(reply.content, { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: `${m.galaxyWorkflow.reply} · 3`, exact: true })).toBeVisible()
    await card.getByRole('button', { name: m.galaxyPage.loadAllReplies, exact: true }).click()
    await expect(card.getByText('Third reply', { exact: true })).toBeVisible()
    await expect(card.getByRole('button', { name: m.galaxyPage.loadAllReplies, exact: true })).toHaveCount(0)
    expect(reads).toBe(2)
  })

  test(`malformed acknowledgements never erase community drafts or content in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    await page.route(`**${root}/posts`, route => route.fulfill({ json: route.request().method() === 'GET' ? { posts: [post], joined: true } : { post: {} } }))
    await page.route(`**${root}/posts/${post.id}/replies`, route => route.fulfill({ json: { reply: {}, replies: 0 } }))
    await page.route(`**${root}/posts/${post.id}`, route => route.fulfill({ json: { success: false } }))
    await page.route(`**${root}/discussions`, route => route.fulfill({ json: route.request().method() === 'GET' ? { discussions: [topic] } : { discussion: null } }))
    await page.goto(`/galaxy/${galaxy.slug}`)
    const section = page.getByRole('region', { name: m.galaxyPage.communityPosts })
    const draft = section.getByRole('textbox', { name: m.galaxyPage.postPlaceholder.replace('{name}', galaxy.name) })
    await draft.fill('Unacknowledged post')
    await section.getByRole('button', { name: m.galaxyWorkflow.post, exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: m.galaxyPage.publishFailed })).toBeVisible()
    await expect(draft).toHaveValue('Unacknowledged post')
    const card = section.locator('article').filter({ hasText: post.content })
    const replyDraft = card.getByRole('textbox')
    await replyDraft.fill('Unacknowledged reply')
    await card.getByRole('button', { name: m.galaxyWorkflow.sendReply, exact: true }).click()
    await expect(page.getByRole('alert').filter({ hasText: m.galaxyPage.replyFailed })).toBeVisible()
    await expect(replyDraft).toHaveValue('Unacknowledged reply')
    page.once('dialog', d => d.accept())
    await card.getByRole('button', { name: m.galaxyWorkflow.deleteContent, exact: true }).first().click()
    await expect(page.getByRole('alert').filter({ hasText: m.galaxyWorkflow.failed })).toBeVisible()
    await expect(card).toBeVisible()
    await page.getByRole('button', { name: m.galaxyWorkflow.startDiscussion, exact: true }).click()
    const title = page.getByRole('textbox', { name: m.galaxyWorkflow.discussionTitle, exact: true })
    await title.fill('Unacknowledged topic')
    await page.getByRole('textbox', { name: m.galaxyWorkflow.discussionContent, exact: true }).fill('Retained opening message')
    const composer = title.locator('xpath=ancestor::section')
    await composer.getByRole('button', { name: m.galaxyWorkflow.post, exact: true }).click()
    await expect(composer.getByRole('alert')).toHaveText(m.galaxyWorkflow.failed)
    await expect(title).toHaveValue('Unacknowledged topic')
  })

  test(`a stale initial read cannot erase or duplicate a confirmed community post in ${locale}`, async ({ page, context, baseURL }) => {
    await setup(page, context, baseURL!, locale)
    const pending = gate()
    const created = { ...post, id: 'race-post', content: 'Confirmed during loading' }
    let reads = 0
    await page.route(`**${root}/posts`, async route => {
      if (route.request().method() !== 'GET') return route.fulfill({ status: 201, json: { post: created } })
      reads++
      if (reads === 1) { await pending.promise; return route.fulfill({ json: { posts: [post], joined: true } }) }
      return route.fulfill({ json: { posts: [created, post], joined: true } })
    })
    try {
      await page.goto(`/galaxy/${galaxy.slug}`)
      const section = page.getByRole('region', { name: m.galaxyPage.communityPosts })
      await expect(section.getByRole('status', { name: m.galaxyPage.loadingPosts, exact: true })).toBeVisible()
      await section.getByRole('textbox', { name: m.galaxyPage.postPlaceholder.replace('{name}', galaxy.name) }).fill(created.content)
      await section.getByRole('button', { name: m.galaxyWorkflow.post, exact: true }).click()
      await expect(section.locator('article').filter({ hasText: created.content })).toHaveCount(1)
      pending.release()
      await expect(section.getByRole('status', { name: m.galaxyPage.loadingPosts, exact: true })).toHaveCount(0)
      await expect(section.locator('article').filter({ hasText: post.content })).toHaveCount(1)
      await expect(section.locator('article').filter({ hasText: created.content })).toHaveCount(1)
      expect(reads).toBe(2)
    } finally { pending.release() }
  })
}
