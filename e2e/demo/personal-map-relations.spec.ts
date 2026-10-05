import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

for (const [locale, messages] of Object.entries({ en, fr, zh })) {
  test(`personal relations remain independent after refresh in ${locale}`, async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name:'better-auth.session_token',value:'relations-fixture',url:baseURL! },
      { name:'locale',value:locale,url:baseURL! },
    ])
    await page.emulateMedia({ reducedMotion:'reduce' })
    let saved=true, approved=false, joined=true
    await page.route('**/api/star-map?**', route => {
      const layer=new URL(route.request().url()).searchParams.get('layer')
      const node=layer==='galaxies'
        ? { id:'galaxy',kind:'galaxy',groupId:'owned',name:'Relation galaxy',href:'/galaxy/fixture',galaxyRelationship:{created:true,joined} }
        : layer==='activities'
          ? { id:'activity',kind:'activity',groupId:approved?'going':'requested',name:'Relation activity',href:'/galaxy/fixture?event=activity#events',userInterested:true,userAttendance:approved?'APPROVED':'PENDING' }
          : { id:'planet',groupId:'calm',name:'Relation planet',href:'/planet/target',relationship:{saved,following:true,followedBy:true,conversationId:null} }
      return route.fulfill({json:{groups:[{id:node.groupId,count:1,color:'#68d8bd'}],nodes:[node],total:1,nextCursor:null,scope:'personal',selfPlanet:{id:'self',name:'My center',href:'/planet/self',level:1}}})
    })
    const refresh=()=>page.evaluate(()=>window.dispatchEvent(new Event('focus')))
    const t=messages.starMap
    await page.goto('/star-map?mode=personal&view=list')
    const planet=page.getByRole('button',{name:/Relation planet/})
    await expect(planet).toContainText(t.relation_saved)
    await expect(planet).toContainText(t.relation_mutual)
    saved=false;await refresh()
    await expect(planet).not.toContainText(t.relation_saved)
    await expect(planet).toContainText(t.relation_mutual)
    await page.goto('/star-map?mode=personal&layer=galaxies&view=list')
    const galaxy=page.getByRole('button',{name:/Relation galaxy/})
    await expect(galaxy).toContainText(t.relation_created)
    await expect(galaxy).toContainText(t.relation_joined)
    joined=false;await refresh()
    await expect(galaxy).toContainText(t.relation_created)
    await expect(galaxy).not.toContainText(t.relation_joined)
    await page.goto('/star-map?mode=personal&layer=activities&view=list')
    const activity=page.getByRole('button',{name:/Relation activity/})
    await expect(activity).toContainText(t.relation_interested)
    await expect(activity).toContainText(t.relation_requested)
    approved=true;await refresh()
    await expect(activity).toContainText(t.relation_going)
    await expect(activity).not.toContainText(t.relation_requested)
    await expect(activity).toContainText(t.relation_interested)
    await page.getByRole('group',{name:t.viewMode}).getByRole('link',{name:t.mapView,exact:true}).click()
    await expect(page.getByRole('group',{name:t.relationLegend})).toBeVisible()
    await expect(page.locator('canvas[aria-label]')).toHaveCount(1)
    await expect(page.getByRole('link',{name:t.openSelf.replace('{name}','My center'),exact:true})).toBeVisible()
  })
}
