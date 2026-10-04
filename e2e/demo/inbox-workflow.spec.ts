import { test, expect } from '@playwright/test'

test('failed notification mutations preserve unread notice and show localized errors', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: 'better-auth.session_token', value: 'ui-fixture', url: baseURL! },
    { name: 'locale', value: 'zh', url: baseURL! },
  ])
  await page.route('**/api/notifications', (route) =>
    route.fulfill({
      json: {
        notifications: [
          {
            id: 'notice-fixture',
            type: 'NEW_MESSAGE',
            title: '测试通知',
            body: '消息已到达',
            read: false,
            actionUrl: null,
            createdAt: '2026-10-04T10:00:00Z',
          },
        ],
        unreadCount: 1,
        unreadMessagesCount: 1,
        nextCursor: null,
      },
    }),
  )
  await page.route('**/api/notifications/read', (route) =>
    route.fulfill({ status: 500, json: { error: 'failed' } }),
  )
  await page.route('**/api/notifications/notice-fixture', (route) =>
    route.fulfill({ status: 500, json: { error: 'failed' } }),
  )
  await page.goto('/notifications')
  await expect(page.getByText('测试通知', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '标为已读', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('已保留之前的状态')
  await expect(
    page.getByRole('button', { name: '标为已读', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: '删除通知' }).click()
  await expect(page.getByText('测试通知', { exact: true })).toBeVisible()
})

test('conversation acknowledges only received message IDs, then updates on focus', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: 'locale', value: 'en', url: baseURL! }])
  let arrivals = 1
  const acknowledgements: string[][] = []
  await page.route(
    '**/api/conversations/conversation-fixture',
    async (route) => {
      if (route.request().method() === 'PATCH') {
        acknowledgements.push(route.request().postDataJSON().ids)
        await route.fulfill({ json: { updated: arrivals, unread: 0 } })
        return
      }
      await route.fulfill({
        json: {
          conversation: { id: 'conversation-fixture' },
          viewerId: 'viewer-fixture',
          canSend: true,
          myPlanet: null,
          otherPlanet: null,
          otherUser: { id: 'sender-fixture', name: 'Sender' },
          messages: Array.from({ length: arrivals }, (_, i) => ({
            id: 'received-' + i,
            fromId: 'sender-fixture',
            content: 'Received ' + i,
            type: 'text',
            sentAt: '2026-10-04T10:00:0' + i + 'Z',
          })),
          olderCursor: null,
        },
      })
    },
  )
  await page.goto('/messages/conversation-fixture')
  await expect(page.getByText('Received 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Your first beam is sent', { exact: true })).toHaveCount(0)
  await expect.poll(() => acknowledgements.length).toBeGreaterThan(0)
  expect(acknowledgements[0]).toEqual(['received-0'])
  arrivals = 2
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('Received 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Received 0', { exact: true })).toHaveCount(1)
})
