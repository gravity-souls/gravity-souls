import { test, expect } from '@playwright/test'
const translations = {
  en: { share: 'Share a planet, galaxy or activity', send: 'Send card', selected: 'Selected:', unavailable: 'Shared content unavailable', back: 'Back to chat', galaxy: 'Galaxy', event: 'Activity' },
  zh: { share: '分享星球、星系或活动', send: '发送卡片', selected: '已选择：', unavailable: '分享内容暂不可用', back: '返回聊天', galaxy: '星系', event: '活动' },
  fr: { share: 'Partager une planète, une galaxie ou une activité', send: 'Envoyer la carte', selected: 'Sélection :', unavailable: 'Contenu partagé indisponible', back: 'Retour à la conversation', galaxy: 'Galaxie', event: 'Activité' },
}
for (const locale of ['en', 'zh', 'fr'] as const) test(`share selection is explicit, failed sends retain selection and target pages return to chat in ${locale}`, async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'locale', value: locale, url: baseURL! }, { name: 'better-auth.session_token', value: 'share-fixture', url: baseURL! }])
  const posts: unknown[] = [], rows: object[] = []
  const card = { available: true, kind: 'planet', id: 'shared-planet', title: 'DIY planet fixture', href: '/planet/shared-planet' }
  await page.route('**/api/conversations/share-fixture/share-options?**', route => {
    const kind = new URL(route.request().url()).searchParams.get('kind')
    return route.fulfill({ json: { options: kind === 'planet' ? [card] : [], nextCursor: null } })
  })
  await page.route('**/api/conversations/share-fixture/shares', route => {
    posts.push(route.request().postDataJSON())
    if (posts.length === 1) return route.fulfill({ status: 500, json: {} })
    const message = { id: 'shared-message', fromId: 'viewer', content: '', type: 'share', share: card, sentAt: '2026-10-05T10:00:00Z' }
    rows.push(message)
    return route.fulfill({ status: 201, json: message })
  })
  await page.route('**/api/conversations/share-fixture', route => route.fulfill({ json: { conversation: { id: 'share-fixture' }, viewerId: 'viewer', otherUser: { id: 'other', name: 'Other' }, otherPlanet: null, canSend: true, messages: rows, olderCursor: null } }))
  await page.route('**/api/planets/shared-planet', route => route.fulfill({ status: 404, json: {} }))
  await page.goto('/messages/share-fixture')
  await page.getByRole('button', { name: translations[locale].share, exact: true }).click()
  await page.getByRole('button', { name: translations[locale].galaxy, exact: true }).click()
  await expect(page.getByRole('button', { name: 'DIY planet fixture', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: translations[locale].event, exact: true }).click()
  await expect(page.getByRole('button', { name: translations[locale].send, exact: true })).toHaveCount(0)
  const planetLabel = locale === 'en' ? 'Planet' : locale === 'zh' ? '星球' : 'Planète'
  await page.getByRole('button', { name: planetLabel, exact: true }).click()
  await page.getByRole('button', { name: 'DIY planet fixture', exact: true }).click()
  expect(posts).toHaveLength(0)
  await page.getByRole('button', { name: translations[locale].send, exact: true }).click()
  await expect(page.getByText(translations[locale].selected + (locale === 'zh' ? '' : ' ') + 'DIY planet fixture', { exact: true })).toBeVisible()
  expect(posts).toHaveLength(1)
  await page.getByRole('button', { name: translations[locale].send, exact: true }).click()
  const link = page.getByRole('link', { name: /DIY planet fixture/ })
  await expect(link).toHaveAttribute('href', '/planet/shared-planet?chat=share-fixture')
  expect(posts).toHaveLength(2); expect(posts[1]).toEqual(posts[0])
  await link.click()
  await page.getByRole('link', { name: '← ' + translations[locale].back, exact: true }).click()
  await expect(page).toHaveURL(/\/messages\/share-fixture$/)
})

test('previously loaded share cards are revalidated and become unavailable when access is revoked', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'locale', value: 'en', url: baseURL! }, { name: 'better-auth.session_token', value: 'share-fixture', url: baseURL! }])
  let revoked = false, refreshes = 0
  const old = { id: 'old-share', fromId: 'other', content: '', type: 'share', share: { available: true, kind: 'event', id: 'event', title: 'Old private activity', href: '/galaxy/fixture?event=event#events' }, sentAt: '2026-10-05T10:00:00Z' }
  await page.route('**/api/conversations/share-fixture?before=**', route => route.fulfill({ json: { messages: [old], olderCursor: null } }))
  await page.route('**/api/conversations/share-fixture/message-state', route => {
    refreshes++
    return route.fulfill({ json: { messages: [{ ...old, share: revoked ? { available: false } : old.share }] } })
  })
  await page.route('**/api/conversations/share-fixture', route => route.fulfill({ json: route.request().method() === 'PATCH' ? { updated: 1, unread: 0 } : { conversation: { id: 'share-fixture' }, viewerId: 'viewer', otherUser: { id: 'other', name: 'Other' }, otherPlanet: null, canSend: true, messages: [{ id: 'newest', fromId: 'viewer', content: 'Newest text', type: 'text', sentAt: '2026-10-05T10:01:00Z' }], olderCursor: 'newest' } }))
  await page.goto('/messages/share-fixture')
  await page.getByRole('button', { name: 'Earlier messages', exact: true }).click()
  await expect(page.getByRole('link', { name: /Old private activity/ })).toBeVisible()
  revoked = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('link', { name: /Old private activity/ })).toHaveCount(0)
  await expect(page.getByText('Shared content unavailable', { exact: true })).toBeVisible()
  expect(refreshes).toBeGreaterThan(0)
})
