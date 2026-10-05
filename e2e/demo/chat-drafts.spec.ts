import { test, expect, type BrowserContext } from '@playwright/test'

async function fixture(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: 'locale', value: 'en', url: baseURL }, { name: 'better-auth.session_token', value: 'chat-draft-fixture', url: baseURL }])
  let viewerId = 'viewer', fail = true
  const posts: { content: string; clientMessageId: string; replyToId: string | null }[] = []
  await context.route('**/api/conversations/draft-*', route => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON(); posts.push(body)
      if (fail) { fail = false; return route.fulfill({ status: 500, json: {} }) }
      return route.fulfill({ status: 201, json: { id: 'sent', fromId: viewerId, content: body.content, type: 'text', sentAt: '2026-10-05T10:01:00Z', reactions: [] } })
    }
    if (route.request().method() === 'PATCH') return route.fulfill({ json: { updated: 0 } })
    return route.fulfill({ json: { viewerId, otherUser: { id: 'other', name: 'Other' }, otherPlanet: null, canSend: true, olderCursor: null, messages: [{ id: 'original', fromId: 'other', content: 'Original signal', type: 'text', sentAt: '2026-10-05T10:00:00Z', readAt: '2026-10-05T10:00:00Z', reactions: [] }] } })
  })
  return { posts, setViewer: (id: string) => { viewerId = id } }
}

test('draft and reply survive refresh; failed send preserves its key; success clears only this conversation', async ({ page, context, baseURL }) => {
  const { posts } = await fixture(context, baseURL!)
  await page.goto('/messages/draft-one')
  const input = page.locator('textarea')
  await page.getByRole('button', { name: 'Reply', exact: true }).click()
  await input.fill('你好 🪐\nUnsent draft')
  await page.reload()
  await expect(input).toHaveValue('你好 🪐\nUnsent draft')
  await expect(page.getByRole('button', { name: 'Cancel reply', exact: true })).toBeVisible()
  expect(posts).toHaveLength(0)
  await page.getByRole('button', { name: 'Send signal', exact: true }).click()
  await expect(page.getByText(/Delivery is unconfirmed|could not confirm|could not be confirmed/i)).toBeVisible()
  expect(posts).toHaveLength(1)
  await page.reload()
  await expect(input).toHaveValue('你好 🪐\nUnsent draft')
  await page.getByRole('button', { name: 'Send signal', exact: true }).click()
  await expect(input).toHaveValue('')
  expect(posts[1]).toEqual(posts[0])
  expect(posts[0].replyToId).toBe('original')
  await input.fill('Private draft in one')
  await page.goto('/messages/draft-two')
  await expect(input).toHaveValue('')
  await input.fill('Different thread')
  await page.goto('/messages/draft-one')
  await expect(input).toHaveValue('Private draft in one')
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click()
  await page.reload()
  await expect(input).toHaveValue('')
  await page.goto('/messages/draft-two')
  await expect(input).toHaveValue('Different thread')
})

test('two editors require an explicit choice; another account never restores the prior account’s draft', async ({ page, context, baseURL }) => {
  const { posts, setViewer } = await fixture(context, baseURL!)
  await page.goto('/messages/draft-one')
  const input = page.locator('textarea')
  await input.fill('First tab')
  const second = await context.newPage()
  await second.goto('/messages/draft-one')
  await expect(second.locator('textarea')).toHaveValue('First tab')
  await second.locator('textarea').fill('Second tab')
  await expect(page.getByRole('button', { name: 'Keep this draft', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send signal', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Use the other tab’s draft', exact: true }).click()
  await expect(input).toHaveValue('Second tab')
  expect(posts).toHaveLength(0)
  setViewer('another-account')
  await page.reload()
  await expect(input).toHaveValue('')
  await input.fill('Other account')
  setViewer('viewer')
  await page.reload()
  await expect(input).toHaveValue('Second tab')
  await second.close()
})
