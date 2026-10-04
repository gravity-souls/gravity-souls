import { EmbeddedPool } from './helpers/pglite-pool.mjs'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
const require = createRequire(import.meta.url)

const { PrismaPg } = require('@prisma/adapter-pg')
const { PrismaClient } = require('@prisma/client')
const pool = new EmbeddedPool()
const db = new PrismaClient({
  adapter: new PrismaPg(pool),
  transactionOptions: { timeout: 30000, maxWait: 30000 },
})
let actor = null
// Only authentication is replaced. Handlers, validation, permissions, SQL,
// transactions, notifications and XP all execute their real implementations.
const previousLoad = Module._load
Module._load = function (id, parent, main) {
  if (id === '@/lib/prisma') return { prisma: db }
  if (id === '@/lib/session')
    return {
      requireUser: async () => {
        if (!actor) throw Response.json({}, { status: 401 })
        return { user: actor }
      },
      getOptionalUserSession: async () => (actor ? { user: actor } : null),
    }
  if (id === 'next/headers') return { headers: async () => new Headers() }
  if (id === '@/lib/auth')
    return {
      auth: {
        api: { getSession: async () => (actor ? { user: actor } : null) },
      },
    }
  return previousLoad.call(this, id, parent, main)
}
const community = require('../app/api/communities/route.ts')
const join = require('../app/api/communities/join/route.ts')
const settings = require('../app/api/communities/[id]/route.ts')
const members = require('../app/api/communities/[id]/members/route.ts')
const leave = require('../app/api/communities/[id]/leave/route.ts')
const events = require('../app/api/galaxies/[id]/events/route.ts')
const event = require('../app/api/galaxies/[id]/events/[eventId]/route.ts')
const status = require('../app/api/galaxies/[id]/events/[eventId]/status/route.ts')
const rsvp = require('../app/api/galaxies/[id]/events/[eventId]/rsvp/route.ts')
const attendees = require('../app/api/galaxies/[id]/events/[eventId]/attendees/route.ts')
const discussion = require('../app/api/communities/[id]/discussions/route.ts')
const discussionDelete = require('../app/api/communities/[id]/discussions/[discussionId]/route.ts')
const postDelete = require('../app/api/communities/[id]/posts/[postId]/route.ts')
const account = require('../app/api/me/route.ts')
const summary = require('../app/api/galaxies/events/route.ts')
const starMap = require('../app/api/star-map/route.ts')
const inbox = require('../app/api/conversations/route.ts')
const messages = require('../app/api/conversations/[id]/route.ts')
const notifications = require('../app/api/notifications/route.ts')
const notificationRead = require('../app/api/notifications/read/route.ts')
const notificationDelete = require('../app/api/notifications/[id]/route.ts')
const follows = require('../app/api/follows/route.ts')
const followStatus = require('../app/api/follows/[userId]/route.ts')
const saved = require('../app/api/saved-planets/route.ts')
const removeSaved = require('../app/api/saved-planets/[planetId]/route.ts')
const request = (data = {}, url = 'https://example.com/api') =>
  new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
const context = (id, eventId) => ({ params: Promise.resolve({ id, eventId }) })
const as = (id) =>
  (actor = id ? { id, email: `${id}@example.test`, name: id } : null)
const galaxyData = {
  name: 'Workflow Galaxy',
  symbol: '🌌',
  tagline: 'Test',
  description: 'Isolated workflow',
  keywords: ['testing'],
  mood: 'creative',
  accentColor: '#6366f1',
  joinPolicy: 'APPROVAL',
}
const eventData = {
  title: 'Workflow event',
  description: 'Isolated lifecycle',
  date: '2030-01-01T12:00:00Z',
  category: 'MEETUP',
  location: 'Test location',
  maxAttendees: 2,
  requiresApproval: true,
}

test('complete galaxy workflow on isolated PostgreSQL, including real migrations', async (t) => {
  try {
    for (const dir of readdirSync('prisma/migrations').sort()) {
      const file = path.join('prisma/migrations', dir, 'migration.sql')
      if (dir === 'migration_lock.toml') continue
      if (dir === '20261004140000_complete_galaxy_workflows') {
        await pool.db
          .exec(`INSERT INTO "user" (id,name,email,"updatedAt") VALUES ('legacy-user','Legacy','legacy@example.test',NOW());
          INSERT INTO community (id,slug,name,"updatedAt") VALUES ('legacy-community','legacy-existing','Existing',NOW());
          INSERT INTO event (id,"galaxyId","proposerId",title,description,date,category,status,"updatedAt") VALUES ('legacy-event','legacy-community','legacy-user','Existing event','Existing','2030-01-01','MEETUP','APPROVED',NOW());
          INSERT INTO event_rsvp (id,"eventId","userId") VALUES ('legacy-rsvp','legacy-event','legacy-user');`)
      }
      await pool.db.exec(readFileSync(file, 'utf8'))
    }
    for (const id of [
      'owner',
      'member',
      'applicant',
      'outsider',
      'operator',
      'noPlanet',
    ]) {
      await db.user.create({
        data: {
          id,
          name: id,
          email: `${id}@example.test`,
          language: id === 'member' ? 'zh' : id === 'applicant' ? 'fr' : 'en',
        },
      })
      if (id !== 'noPlanet')
        await db.planet.create({ data: { userId: id, name: `${id} planet` } })
    }
    let threadId, firstMessageId, secondMessageId
    const threadContext = () => ({ params: Promise.resolve({ id: threadId }) })
    const getRequest = (query = '') =>
      new Request('https://example.test/api' + query)
    await t.test(
      'mutual-follow contact opens a thread without silently sending a message',
      async () => {
        as(null)
        assert.equal((await inbox.GET(getRequest())).status, 401)
        as('owner')
        assert.equal(
          (await inbox.POST(request({ recipientId: 'member' }))).status,
          403,
        )
        assert.equal(
          (await follows.POST(request({ userId: 'member' }))).status,
          201,
        )
        assert.equal(
          (await follows.POST(request({ userId: 'member' }))).status,
          200,
        )
        assert.equal(
          await db.notification.count({
            where: { userId: 'member', type: 'NEW_FOLLOWER' },
          }),
          1,
        )
        assert.ok(
          (
            await db.notification.findFirst({
              where: { userId: 'member', type: 'NEW_FOLLOWER' },
            })
          ).body.includes('关注'),
        )
        as('member')
        assert.equal(
          (await follows.POST(request({ userId: 'owner' }))).status,
          201,
        )
        as('owner')
        const response = await inbox.POST(request({ recipientId: 'member' }))
        assert.equal(response.status, 201)
        threadId = (await response.json()).conversationId
        assert.equal(
          await db.directMessage.count({ where: { conversationId: threadId } }),
          0,
        )
        assert.equal(
          (await inbox.POST(request({ recipientId: 'member' }))).status,
          200,
        )
      },
    )
    await t.test(
      'message retries are idempotent and notify in the recipient language',
      async () => {
        as('owner')
        const clientMessageId = crypto.randomUUID()
        const first = await messages.POST(
          request({ content: 'Hello from owner', clientMessageId }),
          threadContext(),
        )
        assert.equal(first.status, 201)
        firstMessageId = (await first.json()).id
        const retry = await messages.POST(
          request({ content: 'Hello from owner', clientMessageId }),
          threadContext(),
        )
        assert.equal(retry.status, 200)
        assert.equal((await retry.json()).id, firstMessageId)
        assert.equal(
          (
            await messages.POST(
              request({ content: 'Different draft', clientMessageId }),
              threadContext(),
            )
          ).status,
          409,
        )
        assert.equal(
          await db.directMessage.count({ where: { conversationId: threadId } }),
          1,
        )
        const notices = await db.notification.findMany({
          where: { userId: 'member', type: 'NEW_MESSAGE' },
        })
        assert.equal(notices.length, 1)
        assert.equal(notices[0].actionUrl, '/messages/' + threadId)
        assert.ok(notices[0].body.includes('owner'))
      },
    )
    await t.test(
      'fetch does not mark unseen messages read and acknowledgement preserves a concurrent arrival',
      async () => {
        as('member')
        const response = await messages.GET(getRequest(), threadContext())
        assert.equal(response.status, 200)
        const data = await response.json()
        assert.equal(data.viewerId, 'member')
        assert.equal(data.messages.length, 1)
        assert.equal(
          (await db.directMessage.findUnique({ where: { id: firstMessageId } }))
            .readAt,
          null,
        )
        assert.equal(
          (await (await notifications.GET(getRequest())).json())
            .unreadMessagesCount,
          1,
        )
        as('owner')
        const second = await messages.POST(
          request({
            content: 'Concurrent arrival',
            clientMessageId: crypto.randomUUID(),
          }),
          threadContext(),
        )
        secondMessageId = (await second.json()).id
        as('member')
        const partial = await (
          await messages.PATCH(
            request({ ids: [firstMessageId] }),
            threadContext(),
          )
        ).json()
        assert.equal(partial.updated, 1)
        assert.equal(partial.unread, 1)
        assert.equal(
          await db.notification.count({
            where: { userId: 'member', type: 'NEW_MESSAGE', read: false },
          }),
          2,
        )
        const complete = await (
          await messages.PATCH(
            request({ ids: [secondMessageId] }),
            threadContext(),
          )
        ).json()
        assert.equal(complete.unread, 0)
        assert.equal(
          await db.notification.count({
            where: { userId: 'member', type: 'NEW_MESSAGE', read: false },
          }),
          0,
        )
        assert.equal(
          (await (await notifications.GET(getRequest())).json())
            .unreadMessagesCount,
          0,
        )
        assert.equal(
          (
            await (
              await messages.PATCH(
                request({ ids: [firstMessageId] }),
                threadContext(),
              )
            ).json()
          ).updated,
          0,
        )
      },
    )
    await t.test(
      'message read/send and inbox prevent outsider and blocked access',
      async () => {
        as('outsider')
        assert.equal(
          (await messages.GET(getRequest(), threadContext())).status,
          404,
        )
        assert.equal(
          (
            await messages.PATCH(
              request({ ids: [firstMessageId] }),
              threadContext(),
            )
          ).status,
          404,
        )
        assert.equal(
          (await messages.POST(request({ content: 'forged' }), threadContext()))
            .status,
          403,
        )
        await db.block.create({
          data: { blockerId: 'owner', blockedId: 'member' },
        })
        as('member')
        assert.equal((await (await inbox.GET(getRequest())).json()).length, 0)
        assert.equal(
          (await messages.GET(getRequest(), threadContext())).status,
          404,
        )
        assert.equal(
          (
            await messages.PATCH(
              request({ ids: [firstMessageId] }),
              threadContext(),
            )
          ).status,
          404,
        )
        assert.equal(
          (
            await messages.POST(
              request({ content: 'blocked send' }),
              threadContext(),
            )
          ).status,
          403,
        )
        assert.equal(
          (await (await notifications.GET(getRequest())).json())
            .unreadMessagesCount,
          0,
        )
        assert.deepEqual(
          await (
            await followStatus.GET(getRequest(), {
              params: Promise.resolve({ userId: 'owner' }),
            })
          ).json(),
          { following: false, followedBy: false },
        )
        await db.block.deleteMany({
          where: { blockerId: 'owner', blockedId: 'member' },
        })
      },
    )
    await t.test(
      'private planet appearance stays hidden and deleted accounts become read-only history',
      async () => {
        await db.follow.deleteMany({
          where: {
            OR: [
              { followerId: 'owner', followingId: 'member' },
              { followerId: 'member', followingId: 'owner' },
            ],
          },
        })
        await db.profile.create({
          data: { userId: 'owner', visibility: 'PRIVATE' },
        })
        as('member')
        assert.equal(
          (await (await messages.GET(getRequest(), threadContext())).json())
            .otherPlanet,
          null,
        )
        assert.equal(
          (await (await inbox.GET(getRequest())).json())[0].otherPlanet,
          null,
        )
        assert.equal(
          (await inbox.POST(request({ recipientId: 'owner' }))).status,
          200,
        )
        await db.user.update({
          where: { id: 'owner' },
          data: { deletedAt: new Date() },
        })
        assert.equal(
          (
            await messages.POST(
              request({ content: 'deleted target' }),
              threadContext(),
            )
          ).status,
          404,
        )
        assert.equal(
          (await (await messages.GET(getRequest(), threadContext())).json())
            .canSend,
          false,
        )
        await db.user.update({
          where: { id: 'owner' },
          data: { deletedAt: null },
        })
        await db.profile.delete({ where: { userId: 'owner' } })
      },
    )
    await t.test(
      'message history pages have no skipped lookahead row or duplicate messages',
      async () => {
        await db.directMessage.deleteMany({
          where: { conversationId: threadId },
        })
        for (let i = 0; i < 45; i++)
          await db.directMessage.create({
            data: {
              conversationId: threadId,
              senderId: 'owner',
              content: 'History ' + i,
              createdAt: new Date(1900000000000 + i),
            },
          })
        as('member')
        const first = await (
          await messages.GET(getRequest(), threadContext())
        ).json()
        assert.equal(first.messages.length, 40)
        assert.ok(first.olderCursor)
        const second = await (
          await messages.GET(
            getRequest('?before=' + first.olderCursor),
            threadContext(),
          )
        ).json()
        assert.equal(second.messages.length, 5)
        assert.equal(second.olderCursor, null)
        assert.equal(
          new Set([...first.messages, ...second.messages].map((m) => m.id))
            .size,
          45,
        )
        assert.equal(
          (await messages.GET(getRequest('?before=foreign'), threadContext()))
            .status,
          400,
        )
      },
    )
    await t.test(
      'notification pages, owner-only mutations and safe internal targets work',
      async () => {
        await db.notification.deleteMany({
          where: { userId: { in: ['owner', 'member'] } },
        })
        for (let i = 0; i < 35; i++)
          await db.notification.create({
            data: {
              userId: 'owner',
              type: 'NEW_MESSAGE',
              title: 'Page ' + i,
              body: 'Test',
              actionUrl:
                i === 34 ? '//external.example' : '/messages/' + threadId,
              createdAt: new Date(1900000000000 + i),
            },
          })
        as('owner')
        const first = await (await notifications.GET(getRequest())).json()
        assert.equal(first.notifications.length, 30)
        assert.equal(first.notifications[0].actionUrl, null)
        assert.ok(first.nextCursor)
        const second = await (
          await notifications.GET(getRequest('?cursor=' + first.nextCursor))
        ).json()
        assert.equal(second.notifications.length, 5)
        assert.equal(
          new Set(
            [...first.notifications, ...second.notifications].map((n) => n.id),
          ).size,
          35,
        )
        const ids = first.notifications.map((n) => n.id)
        as('member')
        assert.equal(
          (await (await notificationRead.PATCH(request({ ids }))).json())
            .updated,
          0,
        )
        assert.equal(
          (
            await notificationDelete.DELETE(getRequest(), {
              params: Promise.resolve({ id: ids[0] }),
            })
          ).status,
          403,
        )
        assert.equal(
          (await notifications.GET(getRequest('?cursor=' + first.nextCursor)))
            .status,
          400,
        )
        as('owner')
        assert.equal(
          (await notificationRead.PATCH(request({ ids, all: true }))).status,
          400,
        )
        const marked = await (
          await notificationRead.PATCH(request({ ids }))
        ).json()
        assert.equal(marked.updated, 30)
        assert.equal(marked.unreadCount, 5)
        assert.equal(
          (await (await notificationRead.PATCH(request({ all: true }))).json())
            .updated,
          5,
        )
        assert.equal(
          (await (await notificationRead.PATCH(request({ all: true }))).json())
            .updated,
          0,
        )
        await db.conversationThread.delete({ where: { id: threadId } })
        await db.notification.deleteMany({
          where: { userId: { in: ['owner', 'member'] } },
        })
        await db.rateLimitBucket.deleteMany()
        await db.xPEvent.deleteMany({ where: { type: 'RESONANCE_SENT' } })
      },
    )
    await t.test(
      'orbit saves validate bodies, persist once and enforce owner/privacy/inactive boundaries',
      async () => {
        as('owner')
        const mine = await db.planet.findFirst({ where: { userId: 'owner' } })
        const target = await db.planet.findFirst({
          where: { userId: 'member' },
        })
        assert.equal(
          (
            await saved.POST(
              new Request('https://example.test/api', {
                method: 'POST',
                body: 'bad JSON',
              }),
            )
          ).status,
          400,
        )
        assert.equal(
          (await saved.POST(request({ planetId: mine.id }))).status,
          400,
        )
        assert.equal(
          (await saved.POST(request({ planetId: target.id }))).status,
          200,
        )
        assert.equal(
          (await saved.POST(request({ planetId: target.id }))).status,
          200,
        )
        assert.equal(
          await db.savedPlanet.count({
            where: { userId: 'owner', planetId: target.id },
          }),
          1,
        )
        as('member')
        assert.equal(
          (
            await removeSaved.DELETE(getRequest(), {
              params: Promise.resolve({ planetId: target.id }),
            })
          ).status,
          204,
        )
        assert.equal(
          await db.savedPlanet.count({
            where: { userId: 'owner', planetId: target.id },
          }),
          1,
        )
        await db.planet.update({
          where: { id: target.id },
          data: { active: false },
        })
        as('owner')
        assert.equal(
          (await saved.POST(request({ planetId: target.id }))).status,
          404,
        )
        assert.equal((await (await saved.GET()).json()).savedPlanets.length, 0)
        await db.planet.update({
          where: { id: target.id },
          data: { active: true },
        })
        await db.block.create({
          data: { blockerId: 'member', blockedId: 'owner' },
        })
        assert.equal(
          (await saved.POST(request({ planetId: target.id }))).status,
          404,
        )
        assert.equal((await (await saved.GET()).json()).savedPlanets.length, 0)
        await db.block.deleteMany({
          where: { blockerId: 'member', blockedId: 'owner' },
        })
        assert.equal(
          (
            await removeSaved.DELETE(getRequest(), {
              params: Promise.resolve({ planetId: target.id }),
            })
          ).status,
          204,
        )
        assert.equal(
          (
            await removeSaved.DELETE(getRequest(), {
              params: Promise.resolve({ planetId: target.id }),
            })
          ).status,
          204,
        )
      },
    )
    await t.test(
      'star map rejects anonymous viewers and invalid queries',
      async () => {
        as(null)
        assert.equal(
          (
            await starMap.GET(
              new Request('https://example.com/api?mode=discover'),
            )
          ).status,
          401,
        )
        as('owner')
        assert.equal(
          (await starMap.GET(new Request('https://example.com/api?mode=wrong')))
            .status,
          400,
        )
        assert.equal(
          (
            await starMap.GET(
              new Request('https://example.com/api?search=' + 'a'.repeat(81)),
            )
          ).status,
          400,
        )
      },
    )
    await t.test(
      'star map counts and nodes share privacy/block boundaries and custom avatars',
      async () => {
        as('owner')
        await db.user.update({
          where: { id: 'member' },
          data: { planetCustomTexture: 'https://example.test/custom-map.png' },
        })
        await db.profile.create({
          data: { userId: 'outsider', visibility: 'PRIVATE' },
        })
        await db.block.create({
          data: { blockerId: 'applicant', blockedId: 'owner' },
        })
        const data = await (
          await starMap.GET(
            new Request('https://example.com/api?mode=discover'),
          )
        ).json()
        assert.equal(data.total, 2)
        assert.equal(
          data.groups.reduce((sum, g) => sum + g.count, 0),
          data.total,
        )
        assert.equal(data.nodes.length, 2)
        assert.ok(
          data.nodes.every(
            (n) =>
              !['owner planet', 'outsider planet', 'applicant planet'].includes(
                n.name,
              ),
          ),
        )
        assert.equal(
          data.nodes.find((n) => n.name === 'member planet').planetConfig
            .customTextureUrl,
          'https://example.test/custom-map.png',
        )
        const search = await (
          await starMap.GET(
            new Request('https://example.com/api?mode=discover&search=member'),
          )
        ).json()
        assert.equal(search.total, 1)
        assert.equal(search.nodes.length, 1)
        assert.equal(
          (
            await starMap.GET(
              new Request('https://example.com/api?mode=resonance'),
            )
          ).status,
          400,
        )
        await db.block.deleteMany({
          where: { blockerId: 'applicant', blockedId: 'owner' },
        })
        await db.profile.delete({ where: { userId: 'outsider' } })
        await db.user.update({
          where: { id: 'member' },
          data: { planetCustomTexture: null },
        })
      },
    )
    await t.test(
      'star map bounded pages have no missing or duplicate planet nodes',
      async () => {
        as('owner')
        for (let i = 0; i < 40; i++) {
          await db.user.create({
            data: {
              id: 'map-' + i,
              name: 'Map ' + i,
              email: 'map-' + i + '@example.test',
            },
          })
          await db.planet.create({
            data: {
              userId: 'map-' + i,
              name: 'Map fixture ' + i,
              mood: 'calm',
            },
          })
        }
        const first = await (
          await starMap.GET(
            new Request(
              'https://example.com/api?mode=discover&search=Map%20fixture&group=calm',
            ),
          )
        ).json()
        assert.equal(first.total, 40)
        assert.equal(first.nodes.length, 36)
        assert.ok(first.nextCursor)
        const second = await (
          await starMap.GET(
            new Request(
              'https://example.com/api?mode=discover&search=Map%20fixture&group=calm&cursor=' +
                first.nextCursor,
            ),
          )
        ).json()
        assert.equal(second.nodes.length, 4)
        assert.equal(second.nextCursor, null)
        assert.equal(
          new Set([...first.nodes, ...second.nodes].map((n) => n.id)).size,
          40,
        )
        await db.user.deleteMany({ where: { id: { startsWith: 'map-' } } })
      },
    )
    await t.test(
      'galaxy star map points to real galaxy identities with real member counts',
      async () => {
        as('owner')
        const data = await (
          await starMap.GET(
            new Request(
              'https://example.com/api?mode=galaxies&search=Existing',
            ),
          )
        ).json()
        assert.equal(data.total, 1)
        assert.equal(data.nodes[0].href, '/galaxy/legacy-existing')
        assert.equal(data.groups[0].count, 0)
        assert.equal(data.nodes[0].memberCount, 0)
      },
    )
    await t.test(
      'migration preserves existing events and approved attendance',
      async () => {
        const oldEvent = await db.event.findUnique({
          where: { id: 'legacy-event' },
        })
        const oldRSVP = await db.eventRSVP.findUnique({
          where: { id: 'legacy-rsvp' },
        })
        assert.equal(oldEvent.status, 'APPROVED')
        assert.equal(oldEvent.approvalRewarded, true)
        assert.equal(oldEvent.requiresApproval, false)
        assert.equal(oldRSVP.status, 'APPROVED')
        assert.equal(oldRSVP.rewarded, true)
        assert.equal(
          (await db.community.findUnique({ where: { id: 'legacy-community' } }))
            .joinPolicy,
          'OPEN',
        )
      },
    )
    let galaxyId, eventId
    await t.test(
      'signed-out and no-planet accounts cannot create galaxies',
      async () => {
        as(null)
        assert.equal((await community.POST(request(galaxyData))).status, 401)
        as('noPlanet')
        assert.equal((await community.POST(request(galaxyData))).status, 403)
      },
    )
    await t.test(
      'creator receives ownership and ADMIN membership',
      async () => {
        as('owner')
        const result = await community.POST(request(galaxyData))
        assert.equal(result.status, 201)
        const galaxy = (await result.json()).galaxy
        galaxyId = galaxy.id
        assert.equal(galaxy.creatorId, 'owner')
        assert.equal(
          (
            await db.communityMembership.findFirst({
              where: { communityId: galaxyId },
            })
          ).role,
          'ADMIN',
        )
      },
    )
    await t.test(
      'joining moderated galaxy creates a pending request, no membership',
      async () => {
        as('member')
        const result = await join.POST(request({ communityId: galaxyId }))
        assert.equal(result.status, 200)
        assert.deepEqual(await result.json(), {
          joined: false,
          requestStatus: 'PENDING',
        })
        assert.equal(
          await db.communityMembership.count({
            where: { communityId: galaxyId, userId: 'member' },
          }),
          0,
        )
      },
    )
    await t.test(
      'repeated pending join does not repeat notifications',
      async () => {
        as('member')
        const before = await db.notification.count()
        await join.POST(request({ communityId: galaxyId }))
        assert.equal(await db.notification.count(), before)
      },
    )
    await t.test(
      'applicant cannot approve their own join request',
      async () => {
        as('member')
        assert.equal(
          (
            await members.PATCH(
              request({ action: 'approveJoin', userId: 'member' }),
              context(galaxyId),
            )
          ).status,
          403,
        )
      },
    )
    await t.test(
      'owner approves member and sends Chinese notification',
      async () => {
        as('owner')
        assert.equal(
          (
            await members.PATCH(
              request({ action: 'approveJoin', userId: 'member' }),
              context(galaxyId),
            )
          ).status,
          200,
        )
        assert.equal(
          await db.communityMembership.count({
            where: { communityId: galaxyId, userId: 'member' },
          }),
          1,
        )
        assert.match(
          (
            await db.notification.findFirst({
              where: { userId: 'member' },
              orderBy: { createdAt: 'desc' },
            })
          ).title,
          /加入申请/,
        )
        assert.equal(
          (
            await members.PATCH(
              request({ action: 'approveJoin', userId: 'member' }),
              context(galaxyId),
            )
          ).status,
          409,
        )
      },
    )
    await t.test(
      'only owner can appoint admins and transfer ownership',
      async () => {
        as('member')
        assert.equal(
          (
            await members.PATCH(
              request({ action: 'promote', userId: 'member' }),
              context(galaxyId),
            )
          ).status,
          403,
        )
        as('owner')
        assert.equal(
          (
            await members.PATCH(
              request({ action: 'promote', userId: 'member' }),
              context(galaxyId),
            )
          ).status,
          200,
        )
        as('member')
        assert.equal(
          (
            await members.PATCH(
              request({ action: 'transfer', userId: 'member' }),
              context(galaxyId),
            )
          ).status,
          403,
        )
      },
    )
    await t.test('admin cannot remove owner or peer admins', async () => {
      as('member')
      assert.equal(
        (
          await members.PATCH(
            request({ action: 'remove', userId: 'owner' }),
            context(galaxyId),
          )
        ).status,
        409,
      )
    })
    await t.test('owner must transfer before leaving', async () => {
      as('owner')
      assert.equal((await leave.POST(request(), context(galaxyId))).status, 409)
    })
    await t.test(
      'nonmember cannot propose activity or inspect membership roster',
      async () => {
        as('outsider')
        assert.equal(
          (await events.POST(request(eventData), context(galaxyId))).status,
          403,
        )
        assert.equal(
          (await (await members.GET(request(), context(galaxyId))).json())
            .members.length,
          0,
        )
      },
    )
    await t.test(
      'member proposes pending activity and reviewer URL exists',
      async () => {
        as('member')
        const result = await events.POST(request(eventData), context(galaxyId))
        assert.equal(result.status, 201)
        const activity = (await result.json()).event
        eventId = activity.id
        assert.equal(activity.status, 'PENDING')
        assert.match(
          (
            await db.notification.findFirst({
              where: { userId: 'owner' },
              orderBy: { createdAt: 'desc' },
            })
          ).actionUrl,
          /\/galaxy\/.+\?events=pending#events$/,
        )
      },
    )
    await t.test(
      'pending activity cannot accept attendance requests',
      async () => {
        as('member')
        assert.equal(
          (await rsvp.POST(request(), context(galaxyId, eventId))).status,
          409,
        )
      },
    )
    await t.test(
      'admin approves once; replay does not award another XP event',
      async () => {
        as('owner')
        assert.equal(
          (
            await status.PATCH(
              request({ status: 'APPROVED' }),
              context(galaxyId, eventId),
            )
          ).status,
          200,
        )
        assert.equal(
          (
            await status.PATCH(
              request({ status: 'APPROVED' }),
              context(galaxyId, eventId),
            )
          ).status,
          409,
        )
        assert.equal(
          await db.xPEvent.count({
            where: { userId: 'member', type: 'EVENT_APPROVED' },
          }),
          1,
        )
      },
    )
    await t.test(
      'moderated attendance remains pending and is not counted',
      async () => {
        as('owner')
        const result = await rsvp.POST(request(), context(galaxyId, eventId))
        assert.equal(result.status, 200)
        const data = await result.json()
        assert.equal(data.userAttendance, 'PENDING')
        assert.equal(data.rsvpCount, 0)
        assert.equal(data.userHasRSVPed, false)
      },
    )
    await t.test('request appears in pending attendance overview', async () => {
      as('owner')
      const response = await summary.GET(
        new Request('https://example.com/api?status=requests'),
      )
      assert.equal((await response.json()).events.length, 1)
      const going = await summary.GET(
        new Request('https://example.com/api?status=going'),
      )
      assert.equal((await going.json()).events.length, 0)
    })
    await t.test(
      'organizer approves attendance and capacity counts only approvals',
      async () => {
        as('member')
        assert.equal(
          (
            await attendees.PATCH(
              request({ userId: 'owner', status: 'APPROVED' }),
              context(galaxyId, eventId),
            )
          ).status,
          200,
        )
        as('member')
        await rsvp.POST(request(), context(galaxyId, eventId))
        await attendees.PATCH(
          request({ userId: 'member', status: 'APPROVED' }),
          context(galaxyId, eventId),
        )
        assert.equal(
          await db.eventRSVP.count({ where: { eventId, status: 'APPROVED' } }),
          2,
        )
      },
    )
    await t.test(
      'direct joining transition accepts waiting applicants',
      async () => {
        as('applicant')
        await join.POST(request({ communityId: galaxyId }))
        as('owner')
        assert.equal(
          (
            await settings.PATCH(
              request({ ...galaxyData, joinPolicy: 'OPEN' }),
              context(galaxyId),
            )
          ).status,
          200,
        )
        assert.equal(
          await db.communityMembership.count({
            where: { communityId: galaxyId, userId: 'applicant' },
          }),
          1,
        )
      },
    )
    await t.test(
      'full activity cannot approve an additional participant',
      async () => {
        as('applicant')
        await rsvp.POST(request(), context(galaxyId, eventId))
        as('member')
        assert.equal(
          (
            await attendees.PATCH(
              request({ userId: 'applicant', status: 'APPROVED' }),
              context(galaxyId, eventId),
            )
          ).status,
          409,
        )
      },
    )
    await t.test(
      'cancelling and reapplying does not award duplicate attendance XP',
      async () => {
        as('owner')
        await rsvp.DELETE(request(), context(galaxyId, eventId))
        await rsvp.POST(request(), context(galaxyId, eventId))
        as('member')
        await attendees.PATCH(
          request({ userId: 'owner', status: 'APPROVED' }),
          context(galaxyId, eventId),
        )
        assert.equal(
          await db.xPEvent.count({
            where: { userId: 'owner', type: 'EVENT_RSVP' },
          }),
          1,
        )
      },
    )
    await t.test(
      'roster contains real custom texture and hides private profiles',
      async () => {
        await db.user.update({
          where: { id: 'applicant' },
          data: { planetCustomTexture: 'https://example.com/diy.png' },
        })
        as('owner')
        let response = await (
          await members.GET(request(), context(galaxyId))
        ).json()
        assert.equal(
          response.members.find((m) => m.userId === 'applicant').planet
            .planetConfig.customTextureUrl,
          'https://example.com/diy.png',
        )
        await db.profile.create({
          data: { userId: 'applicant', visibility: 'PRIVATE' },
        })
        response = await (
          await members.GET(request(), context(galaxyId))
        ).json()
        assert.equal(
          response.members.find((m) => m.userId === 'applicant').planet,
          null,
        )
        assert.equal(
          response.members.find((m) => m.userId === 'applicant').planetConfig,
          null,
        )
      },
    )
    await t.test(
      'outsider cannot review attendees or change activities',
      async () => {
        as('outsider')
        assert.equal(
          (
            await attendees.PATCH(
              request({ userId: 'owner', status: 'REJECTED' }),
              context(galaxyId, eventId),
            )
          ).status,
          403,
        )
        assert.equal(
          (await event.PATCH(request(eventData), context(galaxyId, eventId)))
            .status,
          403,
        )
        assert.equal(
          (await event.DELETE(request(), context(galaxyId, eventId))).status,
          403,
        )
      },
    )
    await t.test(
      'edits resubmit to review without losing registrations',
      async () => {
        as('member')
        assert.equal(
          (
            await event.PATCH(
              request({ ...eventData, title: 'Edited event' }),
              context(galaxyId, eventId),
            )
          ).status,
          200,
        )
        assert.equal(
          (await db.event.findUnique({ where: { id: eventId } })).status,
          'PENDING',
        )
        assert.equal(
          await db.eventRSVP.count({ where: { eventId, status: 'APPROVED' } }),
          2,
        )
        as('owner')
        await status.PATCH(
          request({ status: 'APPROVED' }),
          context(galaxyId, eventId),
        )
        assert.equal(
          await db.xPEvent.count({
            where: { userId: 'member', type: 'EVENT_APPROVED' },
          }),
          1,
        )
      },
    )
    await t.test(
      'expired approved event rejects RSVP even before status refresh',
      async () => {
        await db.event.update({
          where: { id: eventId },
          data: { date: new Date('2000-01-01') },
        })
        as('applicant')
        assert.equal(
          (await rsvp.POST(request(), context(galaxyId, eventId))).status,
          409,
        )
        await db.event.update({
          where: { id: eventId },
          data: { date: new Date(eventData.date) },
        })
      },
    )
    await t.test(
      'event cancellation clears requests, approvals and publishes notifications',
      async () => {
        as('member')
        assert.equal(
          (await event.DELETE(request(), context(galaxyId, eventId))).status,
          200,
        )
        assert.equal(
          (await db.event.findUnique({ where: { id: eventId } })).status,
          'CANCELLED',
        )
        assert.equal(
          await db.eventRSVP.count({
            where: { eventId, status: { in: ['PENDING', 'APPROVED'] } },
          }),
          0,
        )
        const notice = await db.notification.findFirst({
          where: { userId: 'applicant', title: 'Événement annulé' },
        })
        assert.ok(notice)
        assert.match(notice.actionUrl, /\?event=.+#events$/)
      },
    )
    await t.test(
      'ownership transfer preserves previous owner as admin and enables departure',
      async () => {
        as('owner')
        assert.equal(
          (
            await members.PATCH(
              request({ action: 'transfer', userId: 'member' }),
              context(galaxyId),
            )
          ).status,
          200,
        )
        assert.equal(
          (await db.community.findUnique({ where: { id: galaxyId } }))
            .creatorId,
          'member',
        )
        assert.equal(
          (await leave.POST(request(), context(galaxyId))).status,
          200,
        )
      },
    )
    await t.test(
      'legacy galaxies cannot be claimed by normal users; platform operator can claim',
      async () => {
        const old = await db.community.create({
          data: { name: 'Legacy', slug: 'legacy-audit' },
        })
        as('outsider')
        assert.equal(
          (await members.PATCH(request({ action: 'claim' }), context(old.id)))
            .status,
          403,
        )
        process.env.OPERATOR_EMAILS = 'operator@example.test'
        as('operator')
        assert.equal(
          (await members.PATCH(request({ action: 'claim' }), context(old.id)))
            .status,
          200,
        )
        assert.equal(
          (await db.community.findUnique({ where: { id: old.id } })).creatorId,
          'operator',
        )
      },
    )
    await t.test(
      'direct RSVP is idempotent when already at capacity',
      async () => {
        as('member')
        const result = await events.POST(
          request({ ...eventData, requiresApproval: false }),
          context(galaxyId),
        )
        const directId = (await result.json()).event.id
        await status.PATCH(
          request({ status: 'APPROVED' }),
          context(galaxyId, directId),
        )
        await rsvp.POST(request(), context(galaxyId, directId))
        as('applicant')
        await rsvp.POST(request(), context(galaxyId, directId))
        const before = await db.xPEvent.count({
          where: { userId: 'applicant', type: 'EVENT_RSVP' },
        })
        assert.equal(
          (await rsvp.POST(request(), context(galaxyId, directId))).status,
          200,
        )
        assert.equal(
          await db.xPEvent.count({
            where: { userId: 'applicant', type: 'EVENT_RSVP' },
          }),
          before,
        )
        await db.communityMembership.create({
          data: { communityId: galaxyId, userId: 'outsider' },
        })
        as('outsider')
        assert.equal(
          (await rsvp.POST(request(), context(galaxyId, directId))).status,
          409,
        )
      },
    )
    await t.test(
      'members can create discussions, duplicate titles and outsiders are rejected',
      async () => {
        as('applicant')
        const result = await discussion.POST(
          request({ title: 'Discussion audit', content: 'Opening message' }),
          context(galaxyId),
        )
        assert.equal(result.status, 201)
        assert.equal(
          (
            await discussion.POST(
              request({
                title: 'Discussion audit',
                content: 'Duplicate message',
              }),
              context(galaxyId),
            )
          ).status,
          409,
        )
        as('noPlanet')
        assert.equal(
          (
            await discussion.POST(
              request({ title: 'Unauthorized', content: 'Opening message' }),
              context(galaxyId),
            )
          ).status,
          403,
        )
      },
    )
    await t.test(
      'moderators can delete content; ordinary members cannot delete another author',
      async () => {
        const topic = await db.communityDiscussion.findFirst({
          where: { communityId: galaxyId },
        })
        as('outsider')
        assert.equal(
          (
            await discussionDelete.DELETE(request(), {
              params: Promise.resolve({ id: galaxyId, discussionId: topic.id }),
            })
          ).status,
          403,
        )
        as('member')
        assert.equal(
          (
            await discussionDelete.DELETE(request(), {
              params: Promise.resolve({ id: galaxyId, discussionId: topic.id }),
            })
          ).status,
          200,
        )
        const post = await db.communityPost.create({
          data: {
            communityId: galaxyId,
            authorId: 'applicant',
            content: 'Moderation audit',
          },
        })
        assert.equal(
          (
            await postDelete.DELETE(request(), {
              params: Promise.resolve({ id: galaxyId, postId: post.id }),
            })
          ).status,
          200,
        )
      },
    )
    await t.test(
      'blocking a member hides their planet appearance in roster',
      async () => {
        await db.block.create({
          data: { blockerId: 'member', blockedId: 'outsider' },
        })
        as('member')
        const roster = await (
          await members.GET(request(), context(galaxyId))
        ).json()
        assert.equal(
          roster.members.find((m) => m.userId === 'outsider').planet,
          null,
        )
        assert.equal(
          roster.members.find((m) => m.userId === 'outsider').planetConfig,
          null,
        )
      },
    )
    await t.test(
      'leaving cancels future participation and prevents duplicate join rewards',
      async () => {
        as('applicant')
        assert.equal(
          (await leave.POST(request(), context(galaxyId))).status,
          200,
        )
        assert.equal(
          await db.eventRSVP.count({
            where: { userId: 'applicant', status: 'APPROVED' },
          }),
          0,
        )
        await join.POST(request({ communityId: galaxyId }))
        assert.equal(
          await db.xPEvent.count({
            where: { userId: 'applicant', type: 'GALAXY_JOINED' },
          }),
          1,
        )
      },
    )
    await t.test(
      'account deletion transfers ownership and cancels future organized events',
      async () => {
        as('member')
        const response = await account.DELETE(request({ confirm: true }))
        assert.equal(response.status, 200)
        const successor = (
          await db.community.findUnique({ where: { id: galaxyId } })
        ).creatorId
        assert.ok(successor && successor !== 'member')
        assert.equal(
          (
            await db.communityMembership.findUnique({
              where: {
                userId_communityId: {
                  userId: successor,
                  communityId: galaxyId,
                },
              },
            })
          ).role,
          'ADMIN',
        )
        assert.equal(
          await db.event.count({
            where: {
              proposerId: 'member',
              status: { in: ['PENDING', 'APPROVED'] },
            },
          }),
          0,
        )
        assert.equal(
          await db.communityJoinRequest.count({ where: { userId: 'member' } }),
          0,
        )
      },
    )
  } finally {
    actor = null
    await db.$disconnect()
    await pool.end()
    Module._load = previousLoad
    delete process.env.OPERATOR_EMAILS
  }
})
