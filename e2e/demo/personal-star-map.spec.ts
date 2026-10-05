import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  test(`personal map collection, list/map return and removal in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: 'better-auth.session_token', value: 'personal-map-fixture', url: baseURL! },
      { name: 'locale', value: locale, url: baseURL! },
    ])
    let saved = true, failRemove = true, permitted = true
    const config = { baseTexture:'mars.jpg', customTextureUrl:'/textures/earth_day.jpg', tintColor:'#b89afa', atmosphereColor:'#b89afa', atmosphereDensity:0.1, hasRing:false, ringColor:'', rotationSpeed:0, cloudOpacity:0 }
    const requests: URL[] = []
    const node = { id:'personal-planet', userId:'personal-target', name:'Personal browser fixture', tagline:'A saved planet', groupId:'calm', href:'/planet/personal-planet', planetConfig:config }
    await page.route('**/api/star-map?**', route => {
      const url = new URL(route.request().url()); requests.push(url)
      const present = permitted && saved && !['following','mutual'].includes(url.searchParams.get('collection') ?? 'all')
      return route.fulfill({ json:{ groups:present ? [{id:'calm',count:1,color:'#b89afa'}] : [], nodes:present ? [{...node,relationship:{saved,following:false,followedBy:false,conversationId:null}}] : [], total:present ? 1 : 0, nextCursor:null, scope:'personal' } })
    })
    await page.route('**/api/my-planet', route => route.fulfill({json:{id:'viewer-planet', userId:'viewer', name:'Viewer', visual:{}, planetConfig:config}}))
    await page.route('**/api/planets/personal-planet', route => route.fulfill({json:{...node, visual:{}, coreThemes:[], mood:'calm', lifestyle:'solitary'}}))
    await page.route('**/api/follows/personal-target', route => route.fulfill({json:{following:false,followedBy:false,available:true}}))
    await page.route('**/api/saved-planets/personal-planet', route => {
      if (route.request().method() === 'DELETE') {
        if (failRemove) return route.fulfill({status:500,json:{}})
        saved = false; return route.fulfill({status:204})
      }
      return route.fulfill({json:{saved}})
    })
    await page.goto('/star-map?mode=personal&collection=saved&view=list')
    await expect(page.locator('canvas[aria-label]')).toHaveCount(0)
    await page.getByRole('button',{name:/^Personal browser fixture/}).click()
    let card = page.locator('aside [aria-live="polite"]')
    await expect(card).toContainText(messages.starMap.savedStatus)
    await card.getByRole('link',{name:messages.starMap.openPlanet}).click()
    await expect(page).toHaveURL(/from=personal-star-map-saved-list/)
    await page.getByRole('link',{name:messages.starMap.returnPersonalMap}).click()
    await expect(page).toHaveURL(/mode=personal&collection=saved&view=list/)
    card = page.locator('aside [aria-live="polite"]')
    await expect(card).toContainText(node.name)
    await card.getByRole('button',{name:messages.planetActions.removeSave, exact:true}).click()
    await expect(card.getByRole('alert')).toBeVisible()
    await expect(card).toContainText(messages.starMap.savedStatus)
    failRemove = false
    await card.getByRole('button',{name:messages.planetActions.retry, exact:true}).click()
    await expect(card.getByRole('button',{name:messages.planetActions.removeSave, exact:true})).toBeVisible()
    await card.getByRole('button',{name:messages.planetActions.removeSave, exact:true}).click()
    await expect(page.getByRole('button',{name:/^Personal browser fixture/})).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText(messages.starMap.personalEmpty)
    await page.getByRole('navigation',{name:messages.starMap.personalFilters}).getByRole('link',{name:messages.starMap.collection_following,exact:true}).click()
    await expect(page).toHaveURL(/collection=following&view=list/)
    await page.getByRole('group',{name:messages.starMap.viewMode}).getByRole('link',{name:messages.starMap.mapView,exact:true}).click()
    await expect(page.locator('canvas[aria-label]')).toHaveCount(1)
    await expect(page).toHaveURL(/mode=personal&collection=following$/)
    saved = true; permitted = true
    await page.getByRole('navigation',{name:messages.starMap.personalFilters}).getByRole('link',{name:messages.starMap.collection_saved,exact:true}).click()
    const toggle = page.getByRole('button',{name:messages.starMap.browseObjects,exact:true})
    if (await toggle.isVisible()) await toggle.click()
    await page.getByRole('button',{name:new RegExp(messages.starMap.group_calm)}).click()
    await page.getByRole('button',{name:/^Personal browser fixture/}).click()
    permitted = false
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    await expect(page.getByRole('button',{name:/^Personal browser fixture/})).toHaveCount(0)
    await expect(page.locator('aside [aria-live="polite"]')).toHaveCount(0)
    expect(requests.every(url => url.searchParams.get('mode') === 'personal')).toBe(true)
  })
}
