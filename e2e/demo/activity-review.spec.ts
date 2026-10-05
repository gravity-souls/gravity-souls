import { test, expect } from '@playwright/test'
import en from '../../messages/en.json'
import fr from '../../messages/fr.json'
import zh from '../../messages/zh.json'

for (const [locale,m] of Object.entries({en,fr,zh})) {
  test(`manager reviews attendance and the hub clears processed work in ${locale}`, async ({page,context,baseURL}) => {
    await context.addCookies([{name:'better-auth.session_token',value:'review-ui-fixture',url:baseURL!},{name:'locale',value:locale,url:baseURL!}])
    let pending = true, approved = false, fail = true, allowed = true
    const event = {id:'review-event',galaxyId:'review-galaxy',title:'Review fixture event',description:'Review workflow',date:'2030-01-01T12:00:00Z',category:'ONLINE',status:'APPROVED',location:null,onlineUrl:null,coverImage:null,maxAttendees:1,requiresApproval:true,userHasRSVPed:false,userAttendance:null,proposer:{id:'organizer',name:'Organizer'},canManage:true,canReviewEvent:true,createdAt:'2026-10-01T00:00:00Z',updatedAt:'2026-10-01T00:00:00Z'}
    const detail = () => ({...event,rsvpCount:approved ? 1:0,pendingAttendanceCount:pending ? 1:0,rsvps:approved ? [{id:'applicant',name:'Applicant',userLevel:1,planetTexture:null}]:[],spotsRemaining:approved ? 0:1})
    await page.route('**/api/galaxies/events?*',route => route.fulfill({json:{events:pending && allowed ? [detail()]:[],total:pending && allowed ? 1:0,pageSize:20}}))
    await page.route('**/api/galaxies/review-galaxy/events/review-event',route => allowed ? route.fulfill({json:{event:detail(),isAdmin:true}}):route.fulfill({status:404,json:{}}))
    await page.route('**/api/galaxies/review-galaxy/events/review-event/attendees',route => {
      if (route.request().method() === 'PATCH') {
        if (fail) return route.fulfill({status:500,json:{error:'failed'}})
        pending = false; approved = true
        return route.fulfill({json:{ok:true}})
      }
      return route.fulfill({json:{attendees:pending ? [{userId:'applicant',name:'Applicant',status:'PENDING'}]:[{userId:'applicant',name:'Applicant',status:'APPROVED'}]}})
    })
    await page.route('**/api/posts?*',route=>route.fulfill({json:{posts:[],nextCursor:null}}))
    await page.goto('/activities?status=review')
    await expect(page.getByRole('button',{name:m.eventsPage.tabs.review,exact:true})).toHaveAttribute('aria-pressed','true')
    await page.getByRole('heading',{name:event.title,exact:true}).click()
    const dialog = page.getByRole('dialog',{name:m.eventForms.eventDetail})
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button',{name:m.galaxyWorkflow.approve,exact:true}).click()
    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog).toContainText(m.galaxyWorkflow.pending)
    fail = false
    await dialog.getByRole('button',{name:m.galaxyWorkflow.approve,exact:true}).click()
    await expect(dialog).toContainText(m.galaxyWorkflow.approved)
    await expect(page.getByText(m.eventsPage.emptyReview,{exact:true})).toBeVisible()
    allowed = false
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
    await expect(dialog).toHaveCount(0)
    await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible()
  })
}
