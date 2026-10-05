import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { mkdtemp, rm, access } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { randomUUID } from 'node:crypto'
import { EmbeddedPool } from './helpers/pglite-pool.mjs'
const require = createRequire(import.meta.url)
const sharp = require('sharp')
const { PrismaClient } = require('@prisma/client'), { PrismaPg } = require('@prisma/adapter-pg')
const pool = new EmbeddedPool(), db = new PrismaClient({ adapter: new PrismaPg(pool), transactionOptions: { timeout: 30000, maxWait: 30000 } })
let actor = null, failDelete = false, failWrite = false
const previousLoad = Module._load
// Auth and external Blob provider only. Real codecs, filesystem, routes, SQL and notifications.
Module._load = function(id, parent, main) {
  if (id === '@/lib/prisma') return { prisma: db }
  if (id === '@/lib/session') return { requireUser: async () => { if (!actor) throw Response.json({}, { status: 401 }); return { user: actor } } }
  if (id === 'next/headers') return { headers: async () => new Headers() }
  if (id === '@/lib/auth') return { auth: { api: { getSession: async () => actor ? { user: actor } : null } } }
  if (id === '@vercel/blob') return { put: async (_key, _bytes, options) => { assert.equal(options.access, 'private'); assert.equal(options.allowOverwrite, false); if (failWrite) throw new Error('injected provider failure'); throw new Error('No live provider writes in tests') }, get: async () => { throw new Error('No live provider reads in tests') }, del: async () => { if (failDelete) throw new Error('injected deletion failure'); throw new Error('No live provider deletion in tests') } }
  return previousLoad.call(this, id, parent, main)
}
const uploads = require('../app/api/conversations/[id]/image-uploads/route.ts')
const send = require('../app/api/conversations/[id]/images/route.ts')
const bytes = require('../app/api/conversations/[id]/images/[imageId]/route.ts')
const account = require('../app/api/me/route.ts')
const accountExport = require('../app/api/me/export/route.ts')
const cleanup = require('../app/api/cron/chat-image-cleanup/route.ts')
const { normalizeChatImage } = require('../lib/chat-image-processing.ts')
const { cleanupChatImage } = require('../lib/chat-images.ts')
const { hydrateSharedMessages } = require('../lib/chat-shares.ts')
const storage = require('../lib/private-chat-storage.ts')
const context = (id='ab', imageId) => ({ params: Promise.resolve({ id, imageId }) })
const as = id => actor = id ? { id, name: id, email: `${id}@test.invalid` } : null
const json = data => new Request('https://example.test/api', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) })
const request = (data, uploadId=randomUUID(), mime='image/png', headers={}) => new Request('https://example.test/api', { method:'POST', headers:{'content-type':mime,'x-upload-id':uploadId,...headers}, body:data })
const read = () => new Request('https://example.test/api')
let png, directory
async function upload(id='ab', key=randomUUID()) { const response = await uploads.POST(request(png,key),context(id)); assert.equal(response.status,201); return { key, ...await response.json() } }
test('private image lifecycle with real migrations, codecs and local object store', async t => {
  directory = await mkdtemp(path.join(os.tmpdir(),'gs-chat-image-'))
  process.env.CHAT_IMAGE_LOCAL_DIR = directory; delete process.env.CHAT_PRIVATE_BLOB_TOKEN
  try {
    for (const folder of readdirSync('prisma/migrations').sort()) {
      if (folder === 'migration_lock.toml') continue
      if (folder === '20261005030000_add_private_chat_images') await pool.db.exec(`
        INSERT INTO "user" (id,name,email,"updatedAt") VALUES ('legacy-image-a','Legacy A','legacy-image-a@test.invalid',NOW()),('legacy-image-b','Legacy B','legacy-image-b@test.invalid',NOW());
        INSERT INTO conversation_thread (id,"userAId","userBId","updatedAt") VALUES ('legacy-images','legacy-image-a','legacy-image-b',NOW());
        INSERT INTO direct_message (id,"conversationId","senderId",content,type) VALUES ('legacy-text','legacy-images','legacy-image-a','你好 old text','text');
        INSERT INTO direct_message (id,"conversationId","senderId",content,type,"shareKind","shareTargetId") VALUES ('legacy-share','legacy-images','legacy-image-a','','share','galaxy','stable-target');`)
      await pool.db.exec(readFileSync(path.join('prisma/migrations',folder,'migration.sql'),'utf8'))
    }
    await t.test('additive migration preserves legacy text and share references',async()=>{
      const text=await db.directMessage.findUnique({where:{id:'legacy-text'}}), share=await db.directMessage.findUnique({where:{id:'legacy-share'}})
      assert.equal(text.content,'你好 old text');assert.equal(text.imageId,null);assert.equal(share.shareTargetId,'stable-target');assert.equal(share.imageId,null)
      await db.conversationThread.delete({where:{id:'legacy-images'}})
      await db.user.deleteMany({where:{id:{in:['legacy-image-a','legacy-image-b']}}})
    })
    for (const id of ['a','b','c','d']) await db.user.create({ data:{id,name:id,email:`${id}@test.invalid`,language:id==='b'?'zh':'en'} })
    await db.conversationThread.create({data:{id:'ab',userAId:'a',userBId:'b'}})
    await db.conversationThread.create({data:{id:'ac',userAId:'a',userBId:'c'}})
    png = await sharp({ create:{width:64,height:32,channels:3,background:'#c0ffee'} }).png().toBuffer()
    await t.test('missing session and outsiders cannot upload or read', async () => {
      as(null); assert.equal((await uploads.POST(request(png),context())).status,401)
      as('d'); assert.equal((await uploads.POST(request(png),context())).status,404)
      assert.equal((await bytes.GET(read(),context('ab',randomUUID()))).status,404)
    })
    await t.test('codec checks actual MIME, corrupt files, GIF/SVG and pixel limit', async () => {
      for (const [data,mime] of [[png,'image/jpeg'],[Buffer.from('bad'),'image/png'],[Buffer.from('<svg/>'),'image/svg+xml'],[Buffer.from('GIF89a'),'image/gif']]) await assert.rejects(normalizeChatImage(request(data,randomUUID(),mime)),error=>error instanceof Response && [400,415].includes(error.status))
      const huge = await sharp({create:{width:4001,height:4001,channels:3,background:'black'}}).png().toBuffer()
      await assert.rejects(normalizeChatImage(request(huge)),error=>error.status===400)
    })
    await t.test('stream bytes are bounded even with a misleading Content-Length', async () => {
      await assert.rejects(normalizeChatImage(request(Buffer.alloc(3*1024*1024+1),randomUUID(),'image/png',{'content-length':'1'})),error=>error.status===413)
      await assert.rejects(normalizeChatImage(request(png,randomUUID(),'image/png',{'content-length':'3145729'})),error=>error.status===413)
    })
    await t.test('real JPEG is rotated, resized and stripped of EXIF', async () => {
      const jpeg = await sharp({create:{width:3000,height:1000,channels:3,background:'red'}}).withExif({IFD0:{Artist:'PRIVATE ARTIST',ImageDescription:'PRIVATE DATA'}}).withMetadata({orientation:6}).jpeg().toBuffer()
      const result = await normalizeChatImage(request(jpeg,randomUUID(),'image/jpeg'))
      const metadata = await sharp(result.data).metadata()
      assert.equal(metadata.format,'webp'); assert.equal(metadata.width,683); assert.equal(metadata.height,2048); assert.equal(metadata.exif,undefined); assert.equal(metadata.orientation,undefined)
      assert.ok(!result.data.includes(Buffer.from('PRIVATE ARTIST')))
    })
    await t.test('animated WebP is rejected while static WebP is accepted', async () => {
      const raw = Buffer.alloc(8*16*3); raw.fill(255,0,8*8*3)
      const animation = await sharp(raw,{raw:{width:8,height:16,channels:3,pageHeight:8}}).webp({loop:0,delay:[100,100]}).toBuffer()
      assert.equal((await sharp(animation).metadata()).pages,2)
      await assert.rejects(normalizeChatImage(request(animation,randomUUID(),'image/webp')),error=>error.status===400)
      const still = await sharp(png).webp().toBuffer()
      assert.equal((await normalizeChatImage(request(still,randomUUID(),'image/webp'))).width,64)
    })
    let image, message
    await t.test('upload is owner-only and produces no message, unread or notification', async () => {
      as('a'); image = await upload()
      assert.deepEqual(Object.keys(image).sort(),['bytes','height','id','key','url','width'].sort())
      assert.equal(await db.directMessage.count(),0); assert.equal(await db.notification.count(),0)
      assert.equal((await db.conversationThread.findUnique({where:{id:'ab'}})).lastMessageAt,null)
      const response = await bytes.GET(read(),context('ab',image.id)); assert.equal(response.status,200); assert.equal(response.headers.get('cache-control'),'private, no-store'); assert.equal(response.headers.get('content-type'),'image/webp')
      assert.equal((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).format,'webp')
      as('b'); assert.equal((await bytes.GET(read(),context('ab',image.id))).status,404)
      as('a'); assert.equal((await bytes.GET(read(),context('ac',image.id))).status,404)
    })
    await t.test('upload retry reuses ready reservation and refuses payload/owner/thread changes', async () => {
      as('a'); const response = await uploads.POST(request(png,image.key),context()); assert.equal(response.status,200); assert.equal((await response.json()).id,image.id)
      const different = await sharp({create:{width:8,height:8,channels:3,background:'blue'}}).png().toBuffer()
      assert.equal((await uploads.POST(request(different,image.key),context())).status,409)
      assert.equal((await uploads.POST(request(png,image.key),context('ac'))).status,409)
      as('b'); assert.equal((await uploads.POST(request(png,image.key),context())).status,409)
    })
    await t.test('binding refuses another owner/conversation and client text fields', async () => {
      as('b'); assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'wrong-owner'}),context())).status,404)
      as('a'); assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'wrong-thread'}),context('ac'))).status,404)
      assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'text',content:'hidden text'}),context())).status,400)
    })
    await t.test('image send creates one message/notice and dropped-response retries stay idempotent', async () => {
      as('a'); const response = await send.POST(json({imageId:image.id,clientMessageId:'image-1'}),context()); assert.equal(response.status,201); message = await response.json()
      assert.equal(message.type,'image'); assert.equal(message.content,''); assert.equal(message.image.id,image.id)
      assert.ok(!JSON.stringify(message).includes('objectKey')); assert.ok(!JSON.stringify(message).includes('rawDigest'))
      assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'image-1'}),context())).status,200)
      assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'image-2'}),context())).status,409)
      assert.equal(await db.directMessage.count(),1); assert.equal(await db.notification.count({where:{userId:'b',type:'NEW_MESSAGE'}}),1)
      const notice = await db.notification.findFirst({where:{userId:'b'}}); assert.ok(/消息/.test(notice.title+notice.message))
      assert.equal((await db.conversationThread.findUnique({where:{id:'ab'}})).lastMessageAt.toISOString(),message.sentAt)
    })
    await t.test('sent images readable by recipient, not discarded or swept after upload expiry', async () => {
      as('b'); assert.equal((await bytes.GET(read(),context('ab',image.id))).status,200); assert.equal((await bytes.HEAD(read(),context('ab',image.id))).status,200)
      as('a'); assert.equal((await bytes.DELETE(read(),context('ab',image.id))).status,409)
      await db.chatImage.update({where:{id:image.id},data:{expiresAt:new Date(0)}})
      assert.equal(await cleanupChatImage(image.id),false)
      assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'image-1'}),context())).status,200)
      const [hydrated] = await hydrateSharedMessages([await db.directMessage.findUnique({where:{id:message.id}})],actor)
      assert.equal(hydrated.image.id,image.id)
    })
    await t.test('export includes safe image metadata, never private storage keys or raw digest', async () => {
      as('a'); const response = await accountExport.GET(); assert.equal(response.status,200)
      const payload = await response.json(), exported = payload.directMessages.flatMap(thread=>thread.messages).find(row=>row.id===message.id)
      assert.equal(exported.image.id,image.id); assert.equal(exported.image.width,64)
      assert.ok(!JSON.stringify(payload).includes('objectKey')); assert.ok(!JSON.stringify(payload).includes('rawDigest'))
    })
    await t.test('block in either direction denies read, HEAD, new upload and send', async () => {
      for (const [blockerId,blockedId] of [['a','b'],['b','a']]) {
        const block = await db.block.create({data:{blockerId,blockedId}})
        for (const viewer of ['a','b']) { as(viewer); assert.equal((await bytes.GET(read(),context('ab',image.id))).status,404); assert.equal((await bytes.HEAD(read(),context('ab',image.id))).status,404); assert.equal((await uploads.POST(request(png),context())).status,404); assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'image-1'}),context())).status,404) }
        await db.block.delete({where:{id:block.id}})
      }
    })
    await t.test('discard removes ready object and registry; cross-owner cannot discard', async () => {
      as('a'); const unused = await upload()
      as('b'); assert.equal((await bytes.DELETE(read(),context('ab',unused.id))).status,404)
      as('a'); assert.equal((await bytes.DELETE(read(),context('ab',unused.id))).status,200)
      assert.equal(await db.chatImage.findUnique({where:{id:unused.id}}),null)
      await assert.rejects(access(path.join(directory,`chat-images/${unused.id}.webp`)))
      assert.equal((await send.POST(json({imageId:unused.id,clientMessageId:'discarded'}),context())).status,404)
    })
    await t.test('expired unused image cannot bind/read and sweep deletes it', async () => {
      as('a'); const expired = await upload(); await db.chatImage.update({where:{id:expired.id},data:{expiresAt:new Date(0)}})
      assert.equal((await send.POST(json({imageId:expired.id,clientMessageId:'expired'}),context())).status,410)
      assert.equal((await bytes.GET(read(),context('ab',expired.id))).status,404)
      assert.equal(await cleanupChatImage(expired.id),true)
    })
    await t.test('pending attempts cannot take over an immutable key; cleanup waits beyond writer deadline', async () => {
      as('a'); const pending = await upload(); await db.chatImage.update({where:{id:pending.id},data:{ready:false}})
      assert.equal((await uploads.POST(request(png,pending.key),context())).status,409)
      await db.chatImage.update({where:{id:pending.id},data:{createdAt:new Date(Date.now()-180000)}})
      assert.equal((await uploads.POST(request(png,pending.key),context())).status,410)
      assert.equal(await cleanupChatImage(pending.id),false)
      await db.chatImage.update({where:{id:pending.id},data:{expiresAt:new Date(0)}}); assert.equal(await cleanupChatImage(pending.id),true)
    })
    await t.test('private provider failure retains fenced registry, with no public token fallback', async () => {
      as('a'); const key = randomUUID(); process.env.CHAT_PRIVATE_BLOB_TOKEN='fixture-private-token'; failWrite=true
      assert.equal((await uploads.POST(request(png,key),context())).status,503)
      const row = await db.chatImage.findUnique({where:{id:key}}); assert.equal(row.deleteRequested,true); assert.equal(row.ready,false)
      delete process.env.CHAT_PRIVATE_BLOB_TOKEN; failWrite=false
      assert.equal((await uploads.POST(request(png,key),context())).status,410)
      await db.chatImage.update({where:{id:key},data:{expiresAt:new Date(0)}}); assert.equal(await cleanupChatImage(key),true)
    })
    await t.test('failed physical deletion keeps fenced row for later retry', async () => {
      as('a'); const orphan=await upload(); await db.chatImage.update({where:{id:orphan.id},data:{deleteRequested:true}})
      process.env.CHAT_PRIVATE_BLOB_TOKEN='fixture-private-token'; failDelete=true
      await assert.rejects(cleanupChatImage(orphan.id)); assert.equal((await db.chatImage.findUnique({where:{id:orphan.id}})).deleteRequested,true)
      delete process.env.CHAT_PRIVATE_BLOB_TOKEN; failDelete=false
      assert.equal(await cleanupChatImage(orphan.id),true)
    })
    await t.test('cron fails closed without secret, rejects outsiders and sweeps unused only', async () => {
      delete process.env.CRON_SECRET; assert.equal((await cleanup.GET(read())).status,503)
      process.env.CRON_SECRET='fixture-secret'; assert.equal((await cleanup.GET(read())).status,401)
      as('a'); const orphan=await upload(); await db.chatImage.update({where:{id:orphan.id},data:{expiresAt:new Date(0)}})
      const response=await cleanup.GET(new Request('https://example.test/api',{headers:{authorization:'Bearer fixture-secret'}})); assert.equal(response.status,200); assert.equal((await response.json()).deleted,1)
      assert.ok(await db.chatImage.findUnique({where:{id:image.id}}))
    })
    await t.test('production cannot fall back to local or public storage; traversal refused', async () => {
      const previous=process.env.NODE_ENV; process.env.NODE_ENV='production'; process.env.BLOB_READ_WRITE_TOKEN='public-fixture-token'
      assert.throws(storage.requirePrivateChatStorage,error=>error.status===503)
      process.env.NODE_ENV=previous ?? 'test'; delete process.env.BLOB_READ_WRITE_TOKEN
      await assert.rejects(storage.readPrivateChatImage('../public/secret.webp'),error=>error.status===503)
    })
    await t.test('shared message quota blocks new binds but not confirmed retry', async () => {
      as('a'); const unused=await upload()
      await db.rateLimitBucket.updateMany({where:{bucketKey:'MESSAGE_SEND:a'},data:{count:60}})
      const before=await db.notification.count()
      assert.equal((await send.POST(json({imageId:unused.id,clientMessageId:'quota-image'}),context())).status,429)
      assert.equal(await db.notification.count(),before)
      assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'image-1'}),context())).status,200)
      assert.equal((await db.chatImage.findUnique({where:{id:unused.id},include:{message:true}})).message,null)
      await db.rateLimitBucket.deleteMany({where:{bucketKey:'MESSAGE_SEND:a'}})
      assert.equal((await bytes.DELETE(read(),context('ab',unused.id))).status,200)
    })
    await t.test('new reservation quota preserves ready upload retries', async () => {
      as('a'); const unused=await upload()
      await db.rateLimitBucket.updateMany({where:{bucketKey:'IMAGE_UPLOAD:a'},data:{count:20}})
      const before=await db.chatImage.count()
      assert.equal((await uploads.POST(request(png),context())).status,429)
      assert.equal(await db.chatImage.count(),before)
      assert.equal((await uploads.POST(request(png,unused.key),context())).status,200)
      await db.rateLimitBucket.deleteMany({where:{bucketKey:'IMAGE_UPLOAD:a'}})
      await bytes.DELETE(read(),context('ab',unused.id))
    })
    await t.test('decode attempts are rate-limited before parsing attacker-controlled bytes', async () => {
      as('a'); await db.rateLimitBucket.updateMany({where:{bucketKey:'IMAGE_UPLOAD_VALIDATE:a'},data:{count:60}})
      assert.equal((await uploads.POST(request(Buffer.from('invalid image')),context())).status,429)
      await db.rateLimitBucket.deleteMany({where:{bucketKey:'IMAGE_UPLOAD_VALIDATE:a'}})
    })
    await t.test('tombstone peer history stays readable, new actions and deleted viewer fail closed', async () => {
      as('b'); const unused=await upload(); const sent=await upload()
      assert.equal((await send.POST(json({imageId:sent.id,clientMessageId:'peer-image'}),context())).status,201)
      assert.equal((await account.DELETE(json({confirm:true}))).status,200)
      assert.equal((await db.chatImage.findUnique({where:{id:unused.id}})).deleteRequested,true)
      assert.equal((await db.chatImage.findUnique({where:{id:sent.id}})).deleteRequested,false)
      as('a'); assert.equal((await bytes.GET(read(),context('ab',sent.id))).status,200)
      as('a'); assert.equal((await bytes.GET(read(),context('ab',image.id))).status,200); assert.equal((await uploads.POST(request(png),context())).status,404); assert.equal((await send.POST(json({imageId:image.id,clientMessageId:'image-1'}),context())).status,404)
      as('b'); assert.equal((await bytes.GET(read(),context('ab',image.id))).status,404)
    })
    await t.test('database constraints reject malformed image and mixed-kind records', async () => {
      await assert.rejects(db.directMessage.create({data:{conversationId:'ac',senderId:'a',content:'text',type:'image'}}))
      await assert.rejects(db.directMessage.create({data:{conversationId:'ac',senderId:'a',content:'text',type:'text',imageId:image.id}}))
    })
  } finally { await db.$disconnect(); await pool.end(); await rm(directory,{recursive:true,force:true}); Module._load=previousLoad }
})
