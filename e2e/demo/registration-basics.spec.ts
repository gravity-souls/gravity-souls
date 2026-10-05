import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

for (const [locale, copy] of Object.entries({ en, fr, zh })) {
  test(`new registration adult gate, optional steps and later edits in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'locale', value: locale, url: baseURL! }, { name: 'better-auth.session_token', value: 'basics-fixture', url: baseURL! }])
    await page.route('**/api/auth/get-session**', route => route.fulfill({ json: { user: { id: 'new-user', name: 'New user', email: 'new@test.invalid' }, session: { id: 's', userId: 'new-user', token: 'basics-fixture', expiresAt: '2099-01-01T00:00:00Z' } } }))
    let basics: Record<string, unknown> | null = null, failSave = false
    const writes: Record<string, unknown>[] = []
    await page.route('**/api/registration', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: { required: !basics, basics } })
      const data = route.request().postDataJSON(); writes.push(data)
      if (failSave) { failSave = false; return route.fulfill({ status: 500, json: {} }) }
      basics = { ...data, adultConfirmedAt: '2026-10-05T10:00:00Z', ageMethod: 'adult-self-declaration' }
      return route.fulfill({ json: { basics } })
    })
    await page.goto('/onboarding')
    const wizard = page.getByTestId('registration-basics'), t = copy.registrationBasics
    await expect(wizard.getByRole('heading', { name: t.titles.adult, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: copy.createPlanet.introTitle, exact: true })).toHaveCount(0)
    await wizard.locator('input[type="date"]').fill('2020-01-01')
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await expect(wizard.locator('[role="alert"]')).toContainText(t.adultError)
    await wizard.getByRole('checkbox', { name: t.adultDeclaration }).check()
    await expect(wizard.locator('input[type="date"]')).toHaveValue('')
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    for (let i = 1; i < 7; i++) await wizard.getByRole('button', { name: t.skip, exact: true }).click()
    failSave = true
    await wizard.getByRole('button', { name: t.startCalibration, exact: true }).click()
    await expect(wizard.locator('[role="alert"]')).toContainText(t.saveError)
    await wizard.getByRole('button', { name: t.startCalibration, exact: true }).click()
    await expect(page.getByRole('heading', { name: copy.createPlanet.introTitle, exact: true })).toBeVisible()
    expect(writes.at(-1)?.adultConfirmed).toBe(true)
    expect(writes.at(-1)?.gender).toBe('undisclosed')
    expect(writes.at(-1)?.birthDate).toBeUndefined()

    await page.goto('/settings/basics')
    await expect(wizard.getByRole('heading', { name: t.titles.gender })).toBeVisible()
    await wizard.getByRole('button', { name: t.options.nonbinary, exact: true }).click()
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await wizard.getByRole('button', { name: t.options.fr, exact: true }).click()
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await wizard.locator('input').fill('Paris, France')
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await wizard.getByRole('searchbox').fill(t.options.art)
    await wizard.getByRole('button', { name: t.options.art, exact: true }).click()
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await wizard.getByRole('button', { name: t.options.friendship, exact: true }).click()
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await wizard.getByRole('button', { name: t.skip, exact: true }).click()
    await wizard.getByRole('button', { name: t.options.smallGroups, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await wizard.getByRole('button', { name: t.save, exact: true }).click()
    await expect(page.locator('[role="status"]').filter({ hasText: t.saved })).toBeVisible()
    expect(writes.at(-1)).toMatchObject({ gender: 'nonbinary', languages: ['fr'], region: 'Paris, France', interests: ['art'], connectionGoals: ['friendship'], gatheringPreferences: ['smallGroups'] })
    await page.reload()
    await expect(wizard.getByRole('button', { name: t.options.nonbinary, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await wizard.getByRole('button', { name: t.skip, exact: true }).click()
    await expect(wizard.getByRole('button', { name: t.options.fr, exact: true })).toHaveAttribute('aria-pressed', 'true')
  })
}
