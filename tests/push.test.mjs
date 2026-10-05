import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { randomBytes, randomUUID, createECDH } from 'node:crypto'
import path from 'node:path'
import { EmbeddedPool } from './helpers/pglite-pool.mjs'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client'), { PrismaPg } = require('@prisma/adapter-pg')
const pool = new EmbeddedPool(), db = new PrismaClient({ adapter: new PrismaPg(pool), transactionOptions: { timeout: 30000 } })
let actor = null
const previous = Module._load
Module._load = function(id, parent, main) {
  if (id === '@/lib/prisma') return { prisma: db }
  if (id === '@/lib/session') return { requireUser: async () => { if (!actor) throw Response.json({}, { status: 401 }); return actor } }
  if (id === 'next/server') return { ...previous.call(this, id, parent, main), after: () => {} }
  return previous.call(this, id, parent, main)
}
const subscription = require('../app/api/push/subscriptions/route.ts'), display = require('../app/api/push/display/route.ts'), cron = require('../app/api/cron/push-delivery/route.ts')
const message = require('../app/api/conversations/[id]/route.ts')
const { pushConfig, drainPushQueue, eligiblePush } = require('../lib/push-notifications.ts')
const { validPushEndpoint, subscriptionSchema } = require('../lib/push-validation.ts')
const { generateVAPIDKeys } = require('web-push')
const vapid = generateVAPIDKeys()
Object.assign(process.env, { WEB_PUSH_PUBLIC_KEY: vapid.publicKey, WEB_PUSH_PRIVATE_KEY: vapid.privateKey, WEB_PUSH_SUBJECT: 'mailto:qa@example.test', CRON_SECRET: 'qa-cron-secret' })
const keys = () => { const pair = createECDH('prime256v1'); pair.generateKeys(); return { p256dh: pair.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } }
const endpoint = number => `https://fcm.googleapis.com/fcm/send/qa-${number}`
const request = (data, method = 'POST', origin = 'https://test.invalid') => new Request('https://test.invalid/api/push/subscriptions', { method, headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(data) })
const as = async id => { actor = id ? { user: await db.user.findUniqueOrThrow({ where: { id } }), session: await db.session.findUniqueOrThrow({ where: { id: `session-${id}` } }) } : null }
const reg = (number = 1, preview = 'generic') => subscription.POST(request({ operation: 'subscribe', endpoint: endpoint(number), keys: keys(), preview }))
let sentCalls = []
const sender = async (sub, payload) => { sentCalls.push({ sub, payload: JSON.parse(payload) }) }
async function sendText(content = 'PRIVATE TEXT', key = randomUUID()) {
  await as('a')
  const response = await message.POST(request({ content, clientMessageId: key }), { params: Promise.resolve({ id: 'ab' }) })
  assert.equal(response.status, 201)
  return { key, body: await response.json() }
}

test('push lifecycle with real migrations, sessions, routes and durable queue; network transport replaced', async t => {
  try {
    for (const folder of readdirSync('prisma/migrations').sort()) if (folder !== 'migration_lock.toml') await pool.db.exec(readFileSync(path.join('prisma/migrations', folder, 'migration.sql'), 'utf8'))
    for (const id of ['a', 'b', 'c']) {
      await db.user.create({ data: { id, name: id === 'a' ? 'Private Sender Name' : id, email: `${id}@test.invalid`, language: id === 'b' ? 'zh' : 'en' } })
      await db.session.create({ data: { id: `session-${id}`, userId: id, token: randomUUID(), expiresAt: new Date(Date.now() + 86400000) } })
    }
    await db.conversationThread.create({ data: { id: 'ab', userAId: 'a', userBId: 'b' } })
    await t.test('provider allowlist refuses private hosts, credentials, non-HTTPS, lookalikes and invalid key material', () => {
      for (const value of ['http://fcm.googleapis.com/fcm/send/a', 'https://127.0.0.1/a', 'https://fcm.googleapis.com.evil.test/fcm/send/a', 'https://user@fcm.googleapis.com/fcm/send/a', 'https://fcm.googleapis.com:444/fcm/send/a', 'https://localhost/a', 'https://web.push.apple.com.evil.test/a', 'https://[::1]/a']) assert.equal(validPushEndpoint(value), false, value)
      for (const value of [endpoint(1), 'https://updates.push.services.mozilla.com/wpush/v2/abc_123', 'https://web.push.apple.com/abc_123', 'https://wns2-test.notify.windows.com/w/?token=abc']) assert.equal(validPushEndpoint(value), true, value)
      assert.equal(subscriptionSchema.safeParse({ endpoint: endpoint(1), keys: { p256dh: 'a', auth: 'b' } }).success, false)
      assert.equal(subscriptionSchema.safeParse({ endpoint: endpoint(1), keys: keys(), unexpected: true }).success, false)
    })
    await t.test('configuration exposes only a matching public key; unauthenticated users and cross-origin mutations are rejected', async () => {
      await as(null); assert.equal((await subscription.GET()).status, 401)
      await as('b'); const config = await (await subscription.GET()).json(); assert.equal(config.publicKey, vapid.publicKey); assert.ok(!JSON.stringify(config).includes(vapid.privateKey))
      assert.equal((await subscription.POST(request({ operation: 'status', endpoint: endpoint(1) }, 'POST', 'https://evil.test'))).status, 403)
      process.env.WEB_PUSH_PRIVATE_KEY = generateVAPIDKeys().privateKey; assert.equal(pushConfig(), null); process.env.WEB_PUSH_PRIVATE_KEY = vapid.privateKey
    })
    await t.test('subscription is bound to its owner and session, preference changes are scoped, secrets stay out of status', async () => {
      await as('b'); assert.equal((await reg()).status, 200)
      const status = await (await subscription.POST(request({ operation: 'status', endpoint: endpoint(1) }))).json()
      assert.deepEqual(status, { enabled: true, preview: 'generic' })
      await as('c'); assert.equal((await reg()).status, 409)
      assert.equal((await subscription.PUT(request({ endpoint: endpoint(1), preview: 'sender' }, 'PUT'))).status, 200)
      assert.equal((await db.pushSubscription.findFirst()).preview, 'generic')
      await as('b'); assert.equal((await subscription.PUT(request({ endpoint: endpoint(1), preview: 'sender' }, 'PUT'))).status, 200)
      assert.equal((await db.pushSubscription.findFirst()).preview, 'sender')
    })
    let original
    await t.test('new message queues one device delivery, text retry does not duplicate it and payload has no message or sender', async () => {
      original = await sendText()
      const repeated = await message.POST(request({ content: 'PRIVATE TEXT', clientMessageId: original.key }), { params: Promise.resolve({ id: 'ab' }) })
      assert.equal(repeated.status, 200); assert.equal(await db.pushDelivery.count(), 1)
      assert.equal((await drainPushQueue(sender)).sent, 1); assert.equal(sentCalls.length, 1)
      assert.deepEqual(Object.keys(sentCalls[0].payload).sort(), ['deliveryId', 'locale'])
      assert.ok(!JSON.stringify(sentCalls[0].payload).includes('PRIVATE')); assert.ok(!JSON.stringify(sentCalls[0].payload).includes('Private Sender Name'))
      assert.equal((await drainPushQueue(sender)).sent, 0)
    })
    await t.test('display rechecks actor/session, respects lock-screen choice and never includes message content', async () => {
      const id = sentCalls[0].payload.deliveryId, get = () => new Request(`https://test.invalid/api/push/display?id=${id}`)
      await as('c'); assert.equal((await display.GET(get())).status, 404)
      await as('b'); const response = await display.GET(get()), body = await response.json()
      assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.ok(body.body.includes('Private Sender Name')); assert.ok(!JSON.stringify(body).includes('PRIVATE TEXT')); assert.equal(body.url, '/messages/ab')
      await db.pushSubscription.updateMany({ data: { preview: 'generic' } })
      assert.equal((await (await display.GET(get())).json()).body, '你有一条新消息。')
      await db.directMessage.update({ where: { id: original.body.id }, data: { readAt: new Date() } })
      assert.equal((await display.GET(get())).status, 404)
    })
    await t.test('already-read messages, bidirectional blocks and deleted senders are suppressed before network delivery', async () => {
      for (const condition of ['read', 'forward-block', 'backward-block', 'deleted']) {
        const result = await sendText(condition)
        if (condition === 'read') await db.directMessage.update({ where: { id: result.body.id }, data: { readAt: new Date() } })
        if (condition.includes('block')) await db.block.create({ data: { blockerId: condition === 'forward-block' ? 'a' : 'b', blockedId: condition === 'forward-block' ? 'b' : 'a' } })
        if (condition === 'deleted') await db.user.update({ where: { id: 'a' }, data: { deletedAt: new Date() } })
        const before = sentCalls.length; assert.equal((await drainPushQueue(sender)).skipped, 1); assert.equal(sentCalls.length, before)
        await db.block.deleteMany(); await db.user.update({ where: { id: 'a' }, data: { deletedAt: null } })
      }
    })
    await t.test('transient failures retain queued work and stable ID; accepted retries and expired leases do not duplicate claims', async () => {
      await sendText('retry'); const row = await db.pushDelivery.findFirst({ where: { status: 'pending' } })
      assert.equal((await drainPushQueue(async () => { throw Error('network') })).failed, 1)
      assert.equal((await db.pushDelivery.findUnique({ where: { id: row.id } })).status, 'pending')
      assert.equal((await drainPushQueue(sender)).sent, 0)
      await db.pushDelivery.update({ where: { id: row.id }, data: { nextAttemptAt: new Date(0), leaseUntil: new Date(Date.now() + 60000) } })
      assert.equal((await drainPushQueue(sender)).sent, 0)
      await db.pushDelivery.update({ where: { id: row.id }, data: { leaseUntil: new Date(0) } })
      assert.equal((await drainPushQueue(sender)).sent, 1); assert.equal(sentCalls.at(-1).payload.deliveryId, row.id)
    })
    await t.test('404/410 retire expired endpoints; unsubscribing cascades pending jobs and prevents disclosure', async () => {
      await sendText('expired'); await drainPushQueue(async () => { throw { statusCode: 410 } })
      assert.equal(await db.pushSubscription.count(), 0); assert.equal(await db.pushDelivery.count(), 0)
      await as('b'); await reg(); await sendText('unsubscribe'); await as('b')
      const row = await db.pushDelivery.findFirst(); await subscription.DELETE(request({ endpoint: endpoint(1) }, 'DELETE'))
      assert.equal(await db.pushDelivery.count(), 0); assert.equal(await eligiblePush(row.id), null)
    })
    await t.test('session deletion cascades subscription and jobs; expired work is removed rather than replayed', async () => {
      await as('b'); await reg(); await sendText('expiration')
      await db.pushDelivery.updateMany({ data: { expiresAt: new Date(0) } })
      assert.equal((await drainPushQueue(sender)).sent, 0); assert.equal(await db.pushDelivery.count(), 0)
      await sendText('logout'); await db.session.delete({ where: { id: 'session-b' } })
      assert.equal(await db.pushSubscription.count(), 0); assert.equal(await db.pushDelivery.count(), 0)
    })
    await t.test('cron processing requires the configured bearer secret', async () => {
      assert.equal((await cron.GET(new Request('https://test.invalid/api/cron/push-delivery'))).status, 401)
      assert.equal((await cron.GET(new Request('https://test.invalid/api/cron/push-delivery', { headers: { authorization: 'Bearer qa-cron-secret' } }))).status, 200)
    })
  } finally { Module._load = previous; await db.$disconnect(); await pool.db.close() }
})
