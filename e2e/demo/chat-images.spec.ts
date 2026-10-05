import { test, expect } from '@playwright/test'
import sharp from 'sharp'
import en from '../../messages/en.json'
import zh from '../../messages/zh.json'
import fr from '../../messages/fr.json'
const labels = { en: en.chatImages, zh: zh.chatImages, fr: fr.chatImages }
const imageId = '11111111-1111-4111-8111-111111111111'
for (const locale of ['en','zh','fr'] as const) test(`photo selection previews without sending and retry reuses attachment/key in ${locale}`, async ({page,context,baseURL}) => {
  await context.addCookies([{name:'locale',value:locale,url:baseURL!},{name:'better-auth.session_token',value:'image-fixture',url:baseURL!}])
  const rows: object[] = [], sends: unknown[] = []; let uploads=0
  const png=await sharp({create:{width:8,height:8,channels:3,background:'red'}}).png().toBuffer(), webp=await sharp(png).webp().toBuffer()
  const image={id:imageId,width:8,height:8,bytes:webp.length,url:`/api/conversations/image-fixture/images/${imageId}`}
  await page.route('**/api/conversations/image-fixture/image-uploads',route=>{uploads++; return route.fulfill({status:201,json:image})})
  await page.route('**/api/conversations/image-fixture/images',route=>{
    sends.push(route.request().postDataJSON())
    if(sends.length===1) return route.fulfill({status:500,json:{}})
    const message={id:'image-message',fromId:'viewer',type:'image',content:'',image,sentAt:'2026-10-05T10:00:00Z'};rows.push(message)
    return route.fulfill({status:201,json:message})
  })
  await page.route(`**${image.url}`,route=>route.fulfill({status:200,contentType:'image/webp',body:route.request().method()==='HEAD'?Buffer.alloc(0):webp}))
  await page.route('**/api/conversations/image-fixture',route=>route.fulfill({json:{conversation:{id:'image-fixture'},viewerId:'viewer',otherUser:{id:'other',name:'Other'},canSend:true,messages:rows,olderCursor:null}}))
  await page.goto('/messages/image-fixture')
  await page.getByLabel(labels[locale].choose,{exact:true}).setInputFiles({name:'private-original.png',mimeType:'image/png',buffer:png})
  await expect(page.getByAltText(labels[locale].preview)).toBeVisible();expect(uploads).toBe(0);expect(sends).toHaveLength(0)
  await page.getByRole('button',{name:labels[locale].send,exact:true}).click()
  await expect(page.getByText(labels[locale].sendFailed,{exact:true})).toBeVisible()
  await page.getByRole('button',{name:labels[locale].retry,exact:true}).click()
  await expect(page.getByRole('button',{name:labels[locale].open,exact:true})).toBeVisible();expect(uploads).toBe(1);expect(sends).toHaveLength(2);expect(sends[1]).toEqual(sends[0])
  await page.getByRole('button',{name:labels[locale].open,exact:true}).click()
  await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible()
})
test('revoked image read hides preview and closes the photo dialog',async({page,context,baseURL})=>{
  await context.addCookies([{name:'locale',value:'en',url:baseURL!},{name:'better-auth.session_token',value:'image-fixture',url:baseURL!}])
  let revoked=false
  const webp=await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).webp().toBuffer()
  const image={id:imageId,width:8,height:8,bytes:webp.length,url:`/api/conversations/image-fixture/images/${imageId}`}
  await page.route(`**${image.url}`,route=>revoked?route.fulfill({status:404,json:{error:'unavailable'}}):route.fulfill({status:200,contentType:'image/webp',body:route.request().method()==='HEAD'?Buffer.alloc(0):webp}))
  await page.route('**/api/conversations/image-fixture',route=>route.fulfill({json:{conversation:{id:'image-fixture'},viewerId:'viewer',otherUser:{id:'other',name:'Other'},canSend:true,messages:[{id:'image',fromId:'viewer',type:'image',content:'',image,sentAt:'2026-10-05T10:00:00Z'}],olderCursor:null}}))
  await page.goto('/messages/image-fixture');await page.getByRole('button',{name:en.chatImages.open,exact:true}).click();revoked=true
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('status').filter({hasText:en.chatImages.unavailable})).toBeVisible();await expect(page.getByRole('dialog')).toHaveCount(0)
})
