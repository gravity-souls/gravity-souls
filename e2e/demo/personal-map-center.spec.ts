import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  test(`personal center refresh, absence and return in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: 'better-auth.session_token', value: 'personal-center-fixture', url: baseURL! },
      { name: 'locale', value: locale, url: baseURL! },
    ])
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const config = { baseTexture:'mars.jpg', customTextureUrl:'/textures/earth_day.jpg', tintColor:'#b89afa', atmosphereColor:'#b89afa', atmosphereDensity:0.1, hasRing:false, ringColor:'', rotationSpeed:0, cloudOpacity:0 }
    let name = 'My browser center', present = true, fail = false
    const planet = () => ({id:'owner-planet',userId:'viewer',name,href:'/planet/owner-planet',level:2,avatarUrl:config.customTextureUrl,planetConfig:config,visual:{},coreThemes:[],mood:'calm',lifestyle:'solitary'})
    await page.route('**/api/star-map?**', route => route.fulfill({status:fail ? 500 : 200,json:fail ? {} : {groups:[],nodes:[],total:0,nextCursor:null,scope:'personal',selfPlanet:present ? planet() : null}}))
    await page.route('**/api/my-planet', route => route.fulfill({json:planet()}))
    await page.route('**/api/planets/owner-planet', route => route.fulfill({json:planet()}))
    await page.route('**/api/follows/viewer', route => route.fulfill({json:{following:false,followedBy:false,available:true}}))
    await page.route('**/api/saved-planets/owner-planet', route => route.fulfill({json:{saved:false}}))
    const center = () => page.getByRole('link',{name:messages.starMap.openSelf.replace('{name}',name),exact:true})
    await page.goto('/star-map?mode=personal')
    await expect(center()).toHaveCount(1)
    await expect(center().locator('img')).toHaveAttribute('src',config.customTextureUrl)
    await expect(page.locator('canvas[aria-label]')).toHaveCount(1)
    await expect(center()).toHaveAttribute("href", "/my-planet?from=personal-star-map-all")
    await center().click()
    await expect(page).toHaveURL(/\/my-planet\?from=personal-star-map-all$/)
    await page.getByRole('link',{name:messages.starMap.returnPersonalMap}).click()
    await expect(page).toHaveURL(/mode=personal&collection=all/)
    await expect(center()).toHaveCount(1)
    await page.getByRole('group',{name:messages.starMap.viewMode}).getByRole('link',{name:messages.starMap.listView,exact:true}).click()
    await expect(center()).toHaveCount(0)
    await page.getByRole('group',{name:messages.starMap.viewMode}).getByRole('link',{name:messages.starMap.mapView,exact:true}).click()
    await expect(center()).toHaveCount(1)
    await expect(page.locator('canvas[aria-label]')).toHaveCount(1)
    await expect(center().locator('.planet-avatar-rotating')).toHaveCount(0)
    name = 'Updated browser center'
    config.customTextureUrl = '/textures/mars.jpg'
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(center()).toBeVisible()
    await expect(center().locator('img')).toHaveAttribute('src',config.customTextureUrl)
    present = false
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(center()).toHaveCount(0)
    await expect(page.getByRole('link',{name:messages.starMap.createSelf,exact:true})).toHaveAttribute('href','/onboarding')
    present = true
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(center()).toBeVisible()
    fail = true
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(center()).toHaveCount(0)
    await expect(page.getByRole('link',{name:messages.starMap.createSelf,exact:true})).toHaveCount(0)
  })
}
