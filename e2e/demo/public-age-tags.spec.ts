import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'
import { EMPTY_BASICS, ageFromBirthDate, type BasicPreferences } from '../../lib/registration-basics'
import { publicPlanetTags } from '../../lib/public-planet-tags'

const config = { baseTexture: 'mars.jpg', tintColor: '#a78bfa', atmosphereColor: '#c4b5fd', atmosphereDensity: .12, rotationSpeed: 0, cloudOpacity: 0, hasRing: false, ringColor: '' }
const planet = { id: 'peer', userId: 'other', name: 'Age tag planet', mood: 'calm', lifestyle: 'solitary', coreThemes: [], contentFragments: [], abstractAxis: 50, introspectiveAxis: 50, visual: { coreColor: '#a78bfa', accentColor: '#c4b5fd' }, planetConfig: config }

for (const [locale, copy] of Object.entries({ en, fr, zh })) {
  test(`private DOB onboarding, save, independent opt-ins, public labels and clear in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: 'locale', value: locale, url: baseURL! }, { name: 'better-auth.session_token', value: 'age-fixture', url: baseURL! }])
    await page.emulateMedia({ reducedMotion: 'reduce' })
    let basics: BasicPreferences | null = null, failSave = false
    const writes: BasicPreferences[] = []
    // All API traffic stays in this no-database fixture, never a real account.
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/auth/get-session') return route.fulfill({ json: { user: { id: 'owner', name: 'Owner' }, session: { id: 'fixture' } } })
      if (path === '/api/registration') {
        if (route.request().method() === 'GET') return route.fulfill({ json: { required: !basics, basics: basics && { ...basics, adultConfirmedAt: '2026-10-06T00:00:00Z' } } })
        const input = route.request().postDataJSON()
        writes.push(input)
        if (failSave) { failSave = false; return route.fulfill({ status: 500, json: { error: 'SAVE_FAILED' } }) }
        basics = { ...EMPTY_BASICS, ...input }
        return route.fulfill({ json: { basics } })
      }
      if (path === '/api/planets/peer') return route.fulfill({ json: { ...planet, publicTags: publicPlanetTags(basics) } })
      if (path === '/api/my-planet') return route.fulfill({ status: 404, json: {} })
      if (path === '/api/me') return route.fulfill({ json: { user: { id: 'owner', name: 'Owner', userLevel: 1, xp: 0, planetConfig: config }, profile: { visibility: 'MEMBERS' }, planet: null } })
      if (path === '/api/notifications') return route.fulfill({ json: { notifications: [], unreadCount: 0, unreadMessagesCount: 0, nextCursor: null } })
      if (path === '/api/conversations') return route.fulfill({ json: { conversations: [], unreadMessagesCount: 0, nextCursor: null } })
      return route.fulfill({ json: { following: false, followedBy: false, saved: false, available: true, events: [], communities: [], planets: [], posts: [] } })
    })
    const t = copy.registrationBasics, dateCopy = copy.onboardingRefinements
    const chooseDate = async (scope: ReturnType<typeof page.getByTestId>, year: string) => {
      await scope.getByRole('combobox', { name: dateCopy.year, exact: true }).selectOption(year)
      await scope.getByRole('combobox', { name: dateCopy.month, exact: true }).selectOption('01')
      await scope.getByRole('combobox', { name: dateCopy.day, exact: true }).selectOption('01')
    }
    const ageLabel = t.exactAge.replace('{age}', String(ageFromBirthDate('2000-01-01')))
    await page.goto('/onboarding')
    const wizard = page.getByTestId('registration-basics')
    await expect(wizard.getByText(t.adultPrivacy, { exact: true })).toBeVisible()
    await chooseDate(wizard, '2000')
    await wizard.getByRole('button', { name: t.continue, exact: true }).click()
    for (let i = 1; i < 8; i++) await wizard.getByRole('button', { name: t.skip, exact: true }).click()
    await expect(wizard.getByRole('checkbox', { name: ageLabel, exact: true })).not.toBeChecked()
    await wizard.getByRole('button', { name: t.startCalibration, exact: true }).click()
    await expect(wizard).toHaveCount(0)
    expect(writes.at(-1)).toMatchObject({ birthDate: '2000-01-01', publicTags: [] })

    await page.goto('/settings/basics')
    const editor = page.getByTestId('basics-editor')
    const edit = async (field: 'birthDate' | 'gender') => editor.getByRole('button', { name: `${t.editTitle}: ${t.titles[field]}`, exact: true }).click()
    const save = async () => {
      await editor.getByRole('button', { name: t.save, exact: true }).click()
      await expect(editor.getByRole('status')).toContainText(t.saved)
    }
    const publicView = async (age: boolean, gender: boolean) => {
      await page.goto('/planet/peer')
      await expect(page.getByRole('heading', { name: planet.name, exact: true })).toBeVisible()
      await expect(page.getByText(ageLabel, { exact: true })).toHaveCount(age && !gender ? 1 : 0)
      const demographicLabel = age ? `${t.options.nonbinary}, ${ageLabel}` : t.options.nonbinary
      await expect(page.getByRole('img', { name: demographicLabel, exact: true })).toHaveCount(gender ? 1 : 0)
      if (gender) {
        const badge = page.getByRole('img', { name: demographicLabel, exact: true })
        await expect(badge.locator('svg')).toHaveClass(/lucide-non-binary/)
        await expect(badge).toHaveText(age ? String(ageFromBirthDate('2000-01-01')) : '')
      }
      await expect(page.getByText('2000-01-01', { exact: true })).toHaveCount(0)
      await page.goto('/settings/basics')
      await expect(editor).toBeVisible()
    }
    await edit('birthDate')
    await expect(editor.getByText(t.birthDatePrivacy, { exact: true })).toBeVisible()
    await expect(editor.getByRole('combobox', { name: dateCopy.year, exact: true })).toHaveValue('2000')
    await chooseDate(editor, '2020')
    await editor.getByRole('button', { name: t.save, exact: true }).click()
    await expect(editor.getByRole('alert')).toContainText(t.birthDateError)
    expect(writes).toHaveLength(1)
    await chooseDate(editor, '2000')
    await edit('gender')
    await editor.getByTestId('edit-gender').getByRole('button', { name: t.options.nonbinary, exact: true }).click()
    await editor.getByRole('checkbox', { name: ageLabel, exact: true }).check()
    await editor.getByRole('checkbox', { name: t.options.nonbinary, exact: true }).check()
    failSave = true
    await editor.getByRole('button', { name: t.save, exact: true }).click()
    await expect(editor.getByRole('alert')).toContainText(t.saveError)
    await expect(editor.getByRole('checkbox', { name: ageLabel, exact: true })).toBeChecked()
    await save()
    expect(writes.at(-1)).toMatchObject({ birthDate: '2000-01-01', publicTags: ['age', 'gender:nonbinary'] })
    await publicView(true, true)
    await editor.getByRole('checkbox', { name: ageLabel, exact: true }).uncheck()
    await save()
    expect(writes.at(-1)?.birthDate).toBe('2000-01-01')
    await publicView(false, true)
    await editor.getByRole('checkbox', { name: ageLabel, exact: true }).check()
    await editor.getByRole('checkbox', { name: t.options.nonbinary, exact: true }).uncheck()
    await save()
    await publicView(true, false)
    await editor.getByRole('checkbox', { name: t.options.nonbinary, exact: true }).check()
    await edit('birthDate')
    await editor.getByRole('button', { name: t.clearBirthDate, exact: true }).click()
    await expect(editor.getByRole('checkbox', { name: ageLabel, exact: true })).toHaveCount(0)
    await save()
    expect(writes.at(-1)).toMatchObject({ birthDate: null, publicTags: ['gender:nonbinary'] })
    await publicView(false, true)
    await edit('birthDate')
    await expect(editor.getByRole('combobox', { name: dateCopy.year, exact: true })).toHaveValue('')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
