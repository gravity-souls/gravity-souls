import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

const config = { baseTexture: 'jupiter.jpg', tintColor: '#7c4dbf', atmosphereColor: '#b39ddb', atmosphereDensity: .12, rotationSpeed: .018, cloudOpacity: 0, hasRing: false, ringColor: '' }
async function fixture(page: Page, context: BrowserContext, baseURL: string, locale = 'en') {
  await context.addCookies([{ name: 'locale', value: locale, url: baseURL }, { name: 'better-auth.session_token', value: 'refinements-fixture', url: baseURL }])
  await page.route('**/api/auth/get-session**', route => route.fulfill({ json: { user: { id: 'owner', name: 'Owner', email: 'owner@test.invalid', emailVerified: false }, session: { id: 'session', userId: 'owner', token: 'refinements-fixture', expiresAt: '2099-01-01T00:00:00Z' } } }))
  await page.route('**/api/me', route => route.fulfill({ json: { user: { name: 'Owner', userLevel: 5, planetConfig: config }, planet: { id: 'own', name: 'My planet' }, profile: { visibility: 'MEMBERS' } } }))
  await page.route('**/api/my-planet', route => route.fulfill({ json: { id: 'own', name: 'My planet', mood: 'calm', coreThemes: [], planetConfig: config } }))
  await page.route('**/api/push/subscriptions', route => route.fulfill({ json: { configured: false, subscriptions: [] } }))
}

test('settings have one basics entry and private email identity handles resend failure and verification refresh', async ({ page, context, baseURL }) => {
  await fixture(page,context,baseURL!)
  let verified = false, sends = 0
  await page.route('**/api/user/email-verification', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { name: 'Owner', email: 'owner@test.invalid', verified, available: true } })
    sends++
    expect(route.request().postDataJSON()).toEqual({})
    return sends === 1 ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { sent: true } })
  })
  await page.goto('/settings/planet')
  await expect(page.locator('a[href="/settings/basics"]')).toHaveCount(1)
  await page.locator('a[href="/settings/account"]').click()
  await expect(page.getByText(en.onboardingRefinements.emailUnverified,{ exact: true })).toBeVisible()
  await expect(page.getByText('Email: owner@test.invalid',{ exact: true })).toBeVisible()
  await expect(page.locator('a[href="/settings/basics"]')).toHaveCount(0)
  const resend = page.getByRole('button',{ name: en.onboardingRefinements.sendVerification, exact: true })
  await resend.click()
  await expect(page.getByRole('alert').filter({ hasText: en.onboardingRefinements.verificationError })).toBeVisible()
  await resend.click()
  await expect(page.getByRole('status').filter({ hasText: en.onboardingRefinements.verificationSent })).toBeVisible()
  await expect(resend).toBeDisabled()
  verified = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText(en.onboardingRefinements.emailVerified,{ exact: true })).toBeVisible()
  await expect(resend).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

for (const [locale, copy] of Object.entries({ en, fr, zh })) test(`first planet personalization and Planet Live use the chosen language in ${locale}`, async ({ page, context, baseURL }) => {
  await fixture(page,context,baseURL!,locale)
  await page.route('**/api/registration', route => route.fulfill({ json: { required: false, basics: {} } }))
  await page.route('**/api/user/email-verification', route => route.fulfill({ json: { name: 'Owner', email: 'owner@test.invalid', verified: true, available: true } }))
  await page.route('**/api/onboarding/complete', route => route.fulfill({ json: { planet: { id: 'own', name: 'My planet' }, firstPlanet: true } }))
  await page.route('**/api/user/planet-texture', route => route.fulfill({ json: { url: '/uploads/planet-textures/refinements-photo.png' } }))
  let saved: Record<string,unknown> | undefined
  await page.route('**/api/user/planet-config', route => { saved = route.request().postDataJSON(); return route.fulfill({ json: {} }) })
  await page.addInitScript(() => {
    sessionStorage.setItem('gs_onboarding_step','5')
    sessionStorage.setItem('gs_onboarding_draft',JSON.stringify({ climateKey: 'calm', selectedThemes: ['art'], lifestyle: 'solitary', communicationStyle: 'analytical', abstractAxis: 50, introspectiveAxis: 50 }))
  })
  await page.goto('/onboarding')
  await expect(page.getByTestId('preview-name')).toBeVisible()
  expect(await page.getByTestId('preview-name').evaluate(el => getComputedStyle(el).webkitTextFillColor)).not.toBe('transparent')
  await page.getByRole('button',{ name: copy.createPlanet.saveMyPlanet, exact: true }).click()
  const stage = page.getByTestId('planet-personalization')
  await expect(stage.getByRole('heading',{ name: copy.onboardingRefinements.personalizeTitle })).toBeVisible()
  await expect(page.getByRole('link',{ name: copy.planetAwakening.openPlanet, exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const stageWidth = await stage.evaluate(el => el.getBoundingClientRect().width)
  if (page.viewportSize()!.width >= 1000) expect(stageWidth).toBeGreaterThan(800)
  await stage.locator('input[type="file"]').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5koAAAAASUVORK5CYII=','base64') })
  await expect(stage.getByRole('button',{ name: new RegExp(`^${copy.planetCustomizer.savePlanet}`) })).toBeEnabled()
  await stage.getByRole('button',{ name: new RegExp(`^${copy.planetCustomizer.savePlanet}`) }).click()
  await expect(stage.getByRole('status')).toContainText(copy.onboardingRefinements.appearanceSaved)
  expect(saved?.customTextureUrl).toBe('/uploads/planet-textures/refinements-photo.png')
  await stage.getByRole('button',{ name: copy.onboardingRefinements.enterUniverse, exact: true }).click()
  await expect(page.getByRole('link',{ name: copy.planetAwakening.openPlanet, exact: true })).toBeVisible()
  await expect(page.getByText(copy.planetAwakening.live, { exact: true })).toBeVisible()
  await expect(page.locator('p:visible').filter({ hasText: copy.creationSteps.climateOptions.calm.description })).toBeVisible()
  await page.getByTestId('planet-meaning').locator('summary').click()
  await expect(page.getByText(copy.planetMeaning.nameExplanation, { exact: true })).toBeVisible()
})
