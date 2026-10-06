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
    await page.route('**/api/regions?*', route => route.fulfill({ json: { suggestions: [{ value: 'Paris, FR', label: 'Paris, FR · Île-de-France' }] } }))
    await page.goto('/onboarding')
    const wizard = page.getByTestId('registration-basics'), t = copy.registrationBasics
    await expect(wizard.getByRole('heading', { name: t.titles.adult, exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: copy.createPlanet.introTitle, exact: true })).toHaveCount(0)
    await wizard.getByRole('combobox', { name: copy.onboardingRefinements.year, exact: true }).selectOption('2020')
    await wizard.getByRole('combobox', { name: copy.onboardingRefinements.month, exact: true }).selectOption('01')
    await wizard.getByRole('combobox', { name: copy.onboardingRefinements.day, exact: true }).selectOption('01')
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await expect(wizard.locator('[role="alert"]')).toContainText(t.adultError)
    await wizard.getByRole('checkbox', { name: t.adultDeclaration }).check()
    await expect(wizard.getByRole('combobox', { name: copy.onboardingRefinements.year, exact: true })).toHaveValue('')
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    for (let i = 1; i < 7; i++) await wizard.getByRole('button', { name: t.skip, exact: true }).click()
    await expect(wizard.getByRole('heading', { name: t.titles.gatheringPreferences, exact: true })).toBeVisible()
    await expect(wizard.getByRole('checkbox')).toHaveCount(0)
    await wizard.getByRole('button', { name: t.options.smallGroups, exact: true }).click()
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    await expect(wizard.getByRole('heading', { name: t.titles.publicTags, exact: true })).toBeVisible()
    await wizard.getByRole('button', { name: t.back, exact: true }).click()
    await expect(wizard.getByRole('button', { name: t.options.smallGroups, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    failSave = true
    await wizard.getByRole('button', { name: t.startCalibration, exact: true }).click()
    await expect(wizard.locator('[role="alert"]')).toContainText(t.saveError)
    await wizard.getByRole('button', { name: t.startCalibration, exact: true }).click()
    await expect(page.getByRole('heading', { name: copy.createPlanet.introTitle, exact: true })).toBeVisible()
    expect(writes.at(-1)?.adultConfirmed).toBe(true)
    expect(writes.at(-1)?.gender).toBe('undisclosed')
    expect(writes.at(-1)?.gatheringPreferences).toEqual(['smallGroups'])
    expect(writes.at(-1)?.birthDate).toBeUndefined()

    await page.goto('/settings/basics')
    const editor = page.getByTestId('basics-editor')
    await expect(editor.getByRole('heading', { name: t.editTitle, exact: true })).toBeVisible()
    await expect(editor.locator('progress')).toHaveCount(0)
    const edit = async (field: string) => editor.getByRole('button', { name: `${t.editTitle}: ${t.titles[field as keyof typeof t.titles]}`, exact: true }).click()
    await edit('gender')
    await editor.getByTestId('edit-gender').getByRole('button', { name: t.options.nonbinary, exact: true }).click()
    await edit('languages')
    await editor.getByTestId('edit-languages').getByRole('button', { name: t.options.fr, exact: true }).click()
    await edit('region')
    await editor.getByRole('combobox', { name: t.regionLabel, exact: true }).fill('Paris')
    await editor.getByRole('button', { name: 'Paris, FR · Île-de-France' }).click()
    await edit('interests')
    await editor.getByRole('searchbox').fill(t.options.art)
    await editor.getByTestId('edit-interests').getByRole('button', { name: t.options.art, exact: true }).click()
    await edit('connectionGoals')
    await editor.getByTestId('edit-connectionGoals').getByRole('button', { name: t.options.friendship, exact: true }).click()
    await edit('gatheringPreferences')
    await editor.getByTestId('edit-gatheringPreferences').getByRole('button', { name: t.options.smallGroups, exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await editor.getByRole('checkbox', { name: t.options.art, exact: true }).check()
    await expect(editor.getByRole('checkbox', { name: 'Paris, FR', exact: true })).not.toBeChecked()
    await editor.getByRole('button', { name: t.save, exact: true }).click()
    await expect(editor.getByRole('status')).toContainText(t.saved)
    expect(writes.at(-1)).toMatchObject({ gender: 'nonbinary', languages: ['fr'], region: 'Paris, FR', interests: ['art'], connectionGoals: ['friendship'], gatheringPreferences: ['smallGroups'], publicTags: ['interests:art'] })
    await page.reload()
    await edit('languages')
    await expect(editor.getByTestId('edit-languages').getByRole('button', { name: t.options.fr, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(editor.getByRole('checkbox', { name: t.options.art, exact: true })).toBeChecked()
  })
}
