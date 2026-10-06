import { test, expect } from '@playwright/test'
import zh from '../../messages/zh.json'

test('context picker submits consistent galaxy/activity fields and retains failed draft', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'better-auth.session_token', value: 'ui-fixture', url: baseURL! }, { name: 'locale', value: 'zh', url: baseURL! }])
  await page.route('**/api/auth/get-session*', route => route.fulfill({ json: { session: { id: 'session', userId: 'viewer', expiresAt: '2030-01-01T00:00:00Z' }, user: { id: 'viewer', name: 'Viewer', email: 'viewer@example.test' } } }))
  await page.route('**/api/posts/context?*', route => route.fulfill({ json: { options: route.request().url().includes('kind=events') ? [{ id: 'event-fixture', title: '测试活动', galaxyId: 'galaxy-fixture' }] : [{ id: 'galaxy-fixture', name: '测试星系' }], more: false, page: 1 } }))
  const submissions: string[] = []
  await page.route('**/api/posts*', route => {
    if (route.request().url().includes('/context?')) return route.fallback()
    if (route.request().method() === 'POST') { submissions.push(route.request().postData() ?? ''); return route.fulfill({ status: 404, json: { error: 'contextUnavailable' } }) }
    return route.fulfill({ json: { posts: [], nextCursor: null } })
  })
  await page.goto('/stream')
  await page.getByRole('button', { name: '发送信号', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('textarea').fill('关联测试草稿')
  await dialog.getByRole('combobox', { name: '星系', exact: true }).selectOption('galaxy-fixture')
  await dialog.getByRole('combobox', { name: '活动', exact: true }).selectOption('event-fixture')
  await dialog.getByRole('button', { name: '发送信号', exact: true }).click()
  await expect(dialog.locator('textarea')).toHaveValue('关联测试草稿')
  expect(submissions[0]).toContain('galaxy-fixture')
  expect(submissions[0]).toContain('event-fixture')
  await expect(dialog.getByRole('alert')).toHaveText(zh.stream.contextError)
})
