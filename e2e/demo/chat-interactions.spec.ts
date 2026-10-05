import {test,expect} from '@playwright/test'
import en from '../../messages/en.json'
import zh from '../../messages/zh.json'
import fr from '../../messages/fr.json'
const copy={en,zh,fr}
for(const locale of ['en','zh','fr'] as const)test(`quoted reply retry and explicit reaction retry preserve intent in ${locale}`,async({page,context,baseURL})=>{
 const t=copy[locale]
 await context.addCookies([{name:'locale',value:locale,url:baseURL!},{name:'better-auth.session_token',value:'interaction-fixture',url:baseURL!}])
 const source={id:'source',fromId:'other',type:'text',content:'Original message',sentAt:'2026-10-05T10:00:00Z',readAt:'2026-10-05T10:00:00Z',reactionVersion:0,reactions:[] as {emoji:string;count:number;mine:boolean}[]}
 const rows:object[]=[source],sends:Record<string,unknown>[]=[],reactions:Record<string,unknown>[]=[]
 await page.route('**/api/conversations/interaction-fixture/messages/source/reaction',route=>{
  const payload=route.request().postDataJSON();reactions.push(payload)
  source.reactionVersion=1;source.reactions=[{emoji:'👍',count:1,mine:true}]
  return reactions.length===1?route.fulfill({status:500,json:{}}):route.fulfill({json:{id:'source',reactionVersion:1,reactions:source.reactions}})
 })
 await page.route('**/api/conversations/interaction-fixture',route=>{
  if(route.request().method()==='POST'){
   const payload=route.request().postDataJSON();sends.push(payload)
   if(sends.length===1)return route.fulfill({status:500,json:{}})
   const row={id:'reply',fromId:'viewer',content:payload.content,type:'text',sentAt:'2026-10-05T10:01:00Z',quote:{available:true,id:'source',fromId:'other',type:'text',excerpt:source.content},reactions:[],reactionVersion:0};rows.push(row);return route.fulfill({status:201,json:row})
  }
  return route.fulfill({json:{conversation:{id:'interaction-fixture'},viewerId:'viewer',otherUser:{id:'other',name:'Other'},canSend:true,messages:rows,olderCursor:null}})
 })
 await page.goto('/messages/interaction-fixture')
 await page.getByRole('button',{name:t.chatInteractions.reply,exact:true}).click();expect(sends).toHaveLength(0)
 await expect(page.getByText(t.chatInteractions.replying,{exact:true})).toBeVisible()
 await page.locator('textarea[aria-label]').fill('A quoted reply')
 await page.getByRole('button',{name:t.a11y.sendSignal,exact:true}).click()
 await expect(page.getByText(t.messagesPage.deliveryUnconfirmed,{exact:true})).toBeVisible()
 await page.getByRole('button',{name:t.a11y.sendSignal,exact:true}).click()
 await expect(page.getByText(t.chatInteractions.replying,{exact:true})).toHaveCount(0);expect(sends).toHaveLength(2);expect(sends[1]).toEqual(sends[0]);expect(sends[1].replyToId).toBe('source')
 await page.getByRole('button',{name:t.chatInteractions.viewOriginal,exact:true}).click()
 await expect(page.locator('#message-source')).toHaveClass(/ring-2/)
 await page.locator('#message-source').getByRole('button',{name:t.chatInteractions.react,exact:true}).click()
 await page.locator('#message-source').getByRole('button',{name:t.chatContent.emoji.thumbsUp,exact:true}).click()
 await expect(page.locator('#message-source [role="alert"]')).toBeVisible()
 await page.locator('#message-source').getByRole('button',{name:t.chatInteractions.retry,exact:true}).click()
 await expect(page.locator('#message-source').getByRole('button',{pressed:true})).toBeVisible();expect(reactions).toEqual([{emoji:'👍'},{emoji:'👍'}]);expect(sends).toHaveLength(2)
})
test('unloaded originals open an authorized dialog and revoke on refresh',async({page,context,baseURL})=>{
 await context.addCookies([{name:'locale',value:'en',url:baseURL!},{name:'better-auth.session_token',value:'interaction-fixture',url:baseURL!}])
 let revoked=false
 const reads:string[][]=[]
 const message={id:'latest',fromId:'viewer',type:'text',content:'About that older message',sentAt:'2026-10-05T10:01:00Z',quote:{available:true,id:'old-source',fromId:'other',type:'text',excerpt:'Old original'},reactionVersion:0,reactions:[]}
 await page.route('**/api/conversations/interaction-fixture/messages/old-source',route=>revoked?route.fulfill({status:404,json:{error:'unavailable'}}):route.fulfill({json:{id:'old-source',fromId:'other',type:'text',content:'Full original outside loaded history',sentAt:'2026-10-05T09:00:00Z',reactions:[],reactionVersion:0}}))
 await page.route('**/api/conversations/interaction-fixture',route=>{if(route.request().method()==='PATCH'){reads.push(route.request().postDataJSON().ids);return route.fulfill({json:{updated:1,unread:0}})}return route.fulfill({json:{conversation:{id:'interaction-fixture'},viewerId:'viewer',otherUser:{id:'other',name:'Other'},canSend:true,messages:[message],olderCursor:null}})})
 await page.goto('/messages/interaction-fixture');await page.getByRole('button',{name:en.chatInteractions.viewOriginal,exact:true}).click()
 await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText('Full original outside loaded history',{exact:true})).toBeVisible();await expect.poll(()=>reads).toEqual([['old-source']])
 revoked=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(page.getByRole('dialog').getByText(en.chatInteractions.quoteUnavailable,{exact:true})).toBeVisible();await expect(page.getByText('Full original outside loaded history',{exact:true})).toHaveCount(0)
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('conversation access failure hides cached history, header and selected quote',async({page,context,baseURL})=>{
 await context.addCookies([{name:'locale',value:'en',url:baseURL!},{name:'better-auth.session_token',value:'interaction-fixture',url:baseURL!}])
 let revoked=false
 await page.route('**/api/conversations/interaction-fixture',route=>revoked?route.fulfill({status:404,json:{error:'unavailable'}}):route.fulfill({json:{conversation:{id:'interaction-fixture'},viewerId:'viewer',otherUser:{id:'other',name:'Private partner'},canSend:true,messages:[{id:'source',fromId:'other',type:'text',content:'Private source excerpt',sentAt:'2026-10-05T10:00:00Z',readAt:'2026-10-05T10:00:00Z',reactions:[],reactionVersion:0}],olderCursor:null}}))
 await page.goto('/messages/interaction-fixture');await page.getByRole('button',{name:en.chatInteractions.reply,exact:true}).click()
 await expect(page.getByText(en.chatInteractions.replying,{exact:true})).toBeVisible()
 revoked=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
 await expect(page.getByText('Private source excerpt',{exact:true})).toHaveCount(0);await expect(page.getByText('Private partner',{exact:true})).toHaveCount(0)
 await expect(page.getByText(en.chatInteractions.quoteUnavailable,{exact:true})).toBeVisible()
})
