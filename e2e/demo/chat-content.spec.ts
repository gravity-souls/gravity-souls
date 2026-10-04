import { test, expect } from '@playwright/test'

const copy = {
  en: { add: 'Add an emoji', picker: 'Common emoji', planet: 'Planet', smile: 'Smile', limit: 'This emoji does not fit', close: 'Close emoji picker' },
  fr: { add: 'Ajouter un emoji', picker: 'Emojis courants', planet: 'Planète', smile: 'Sourire', limit: 'Cet emoji dépasse', close: 'Fermer le sélecteur d’emojis' },
  zh: { add: '添加表情', picker: '常用表情', planet: '行星', smile: '微笑', limit: '添加这个表情会超过', close: '关闭表情选择器' },
}

for (const locale of ['en', 'fr', 'zh'] as const) {
  test(`chat emoji, multiline links and failed delivery retry in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: 'locale', value: locale, url: baseURL! },
      { name: 'better-auth.session_token', value: 'chat-content-fixture', url: baseURL! },
    ])
    const posts: { content: string; clientMessageId: string }[] = []
    let fail = true
    const initial = { id: 'received', fromId: 'other', content: 'Bonjour 😊\nhttps://example.test/hello?q=1&x=2\njavascript:alert(1) <img src=x onerror=alert(1)>', type: 'text', sentAt: '2026-10-05T10:00:00Z' }
    const rows = [initial]
    await page.route('**/api/conversations/chat-content-fixture', route => {
      if (route.request().method() === 'PATCH') return route.fulfill({ json: { updated: 1, unread: 0 } })
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        posts.push(body)
        if (fail) { fail = false; return route.fulfill({ status: 500, json: {} }) }
        const sent = { id: 'sent', fromId: 'viewer', content: body.content, type: 'text', sentAt: '2026-10-05T10:01:00Z' }
        rows.push(sent)
        return route.fulfill({ status: 201, json: sent })
      }
      return route.fulfill({ json: { conversation: { id: 'chat-content-fixture' }, viewerId: 'viewer', otherUser: { id: 'other', name: 'Other' }, otherPlanet: null, canSend: true, messages: rows, olderCursor: null } })
    })
    await page.goto('/messages/chat-content-fixture')
    const url = page.getByRole('link', { name: /^https:\/\/example.test\/hello/ })
    await expect(url).toHaveAttribute('href', 'https://example.test/hello?q=1&x=2')
    await expect(url).toHaveAttribute('rel', 'noopener noreferrer')
    await expect(url).toHaveAttribute('target', '_blank')
    await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0)
    await expect(page.locator('img[src="x"]')).toHaveCount(0)
    await expect(url.locator('..')).toHaveCSS('white-space', 'pre-wrap')
    const input = page.getByRole('textbox')
    await input.fill('ab')
    await input.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(0, 1))
    await page.getByRole('button', { name: copy[locale].add, exact: true }).click()
    await page.getByRole('button', { name: copy[locale].planet, exact: true }).click()
    await expect(input).toHaveValue('🪐b')
    await expect(input).toBeFocused()
    const draft = '你好 😊\nBonjour 🪐\nhttps://example.test/new'
    await input.fill(draft)
    // IME Enter must not submit, on either desktop or touch devices.
    await input.dispatchEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true })
    expect(posts).toHaveLength(0)
    const send = page.getByRole('button', { name: /^(Send signal|Envoyer un signal|发送信号)$/ })
    await send.click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(input).toHaveValue(draft)
    expect(posts).toHaveLength(1)
    await send.click()
    await expect(input).toHaveValue('')
    expect(posts).toHaveLength(2)
    expect(posts[1]).toEqual(posts[0])
    expect(posts[1].content).toBe(draft)
    await expect(page.getByRole('link', { name: /^https:\/\/example.test\/new/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('link', { name: /^https:\/\/example.test\/new/ })).toBeVisible()
    // Desktop supports Enter-send; touch supports Enter-newline and button-send.
    await input.fill('Keyboard')
    const desktop = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)
    await input.press(desktop ? 'Shift+Enter' : 'Enter')
    await expect(input).toHaveValue('Keyboard\n')
    expect(posts).toHaveLength(2)
    if (desktop) await input.press('Enter')
    else await send.click()
    await expect(input).toHaveValue('')
    expect(posts).toHaveLength(3)
  })
}

test('emoji length boundary, keyboard dismissal and read-only composer', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'locale', value: 'en', url: baseURL! }, { name: 'better-auth.session_token', value: 'chat-content-fixture', url: baseURL! }])
  let canSend = true
  await page.route('**/api/conversations/chat-content-fixture', route => route.fulfill({ json: { conversation: { id: 'chat-content-fixture' }, viewerId: 'viewer', otherUser: { id: 'other', name: 'Other' }, otherPlanet: null, canSend, messages: [], olderCursor: null } }))
  await page.goto('/messages/chat-content-fixture')
  const input = page.getByRole('textbox'), toggle = page.getByRole('button', { name: copy.en.add, exact: true })
  await toggle.click()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await input.fill('x'.repeat(2000))
  await input.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(2000, 2000))
  await toggle.click()
  await page.getByRole('button', { name: 'Planet', exact: true }).click()
  await expect(page.getByRole('status')).toContainText(copy.en.limit)
  await expect(input).toHaveValue('x'.repeat(2000))
  await input.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(1998, 2000))
  await page.getByRole('button', { name: 'Planet', exact: true }).click()
  await expect(input).toHaveValue('x'.repeat(1998) + '🪐')
  await input.fill('🪐'.repeat(2000))
  await expect(input).toHaveValue('🪐'.repeat(2000))
  await expect(page.getByText('2000 / 2000', { exact: true })).toBeVisible()
  await input.fill('x'.repeat(2001))
  await expect(input).toHaveValue('x'.repeat(2000))
  canSend = false
  await page.reload()
  await expect(input).toBeDisabled()
  await expect(toggle).toBeDisabled()
})
