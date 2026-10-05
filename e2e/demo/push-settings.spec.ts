import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

for (const [locale, copy] of Object.entries({ en, fr, zh })) {
  test(`push requires an explicit click, persists privacy choice and disables in ${locale}`, async ({ page, context, baseURL }) => {
    const t = copy.pushSettings
    await context.addCookies([{ name: 'locale', value: locale, url: baseURL! }, { name: 'better-auth.session_token', value: 'push-fixture', url: baseURL! }])
    await page.addInitScript(() => {
      let current: object | null = null
      let requests = 0
      const value = { endpoint: 'https://fcm.googleapis.com/fcm/send/ui-fixture', toJSON: () => ({ keys: { auth: 'fixture', p256dh: 'fixture' } }), unsubscribe: async () => { current = null; return true } }
      const registration = { active: { scriptURL: `${location.origin}/sw.js` }, getNotifications: async () => [], pushManager: { getSubscription: async () => current, subscribe: async () => { requests++; current = value; return value } } }
      Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration } })
      Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} })
      Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default' } })
      Object.defineProperty(window, '__pushRequests', { get: () => requests })
    })
    const writes: Record<string, unknown>[] = []
    await page.route('**/api/push/subscriptions', route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true, publicKey: 'BA' } })
      const body = route.request().postDataJSON(); writes.push(body)
      return route.fulfill({ json: { enabled: route.request().method() !== 'DELETE', preview: body.preview ?? 'generic' } })
    })
    await page.goto('/settings/account')
    const section = page.getByRole('region', { name: t.title, exact: true })
    await expect(section.getByRole('button', { name: t.enable, exact: true })).toBeEnabled()
    expect(await page.evaluate(() => (window as unknown as { __pushRequests: number }).__pushRequests)).toBe(0)
    expect(writes).toHaveLength(0)
    await section.getByRole('button', { name: t.enable, exact: true }).click()
    await expect(section.getByRole('button', { name: t.disable, exact: true })).toBeVisible()
    expect(writes[0].preview).toBe('generic')
    await section.getByRole('combobox').selectOption('sender')
    await expect(section.getByRole('combobox')).toHaveValue('sender')
    expect(writes[1].preview).toBe('sender')
    await page.reload()
    // This fixture intentionally starts with no local subscription after reload.
    await expect(section.getByRole('button', { name: t.enable, exact: true })).toBeEnabled()
    await section.getByRole('button', { name: t.enable, exact: true }).click()
    await section.getByRole('button', { name: t.disable, exact: true }).click()
    await expect(section.getByRole('button', { name: t.enable, exact: true })).toBeVisible()
    expect(writes.at(-1)).toEqual({ endpoint: 'https://fcm.googleapis.com/fcm/send/ui-fixture' })
  })
}
