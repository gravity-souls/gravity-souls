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
const communityPosts = require('../app/api/communities/[id]/posts/route.ts')
const communityReplies = require('../app/api/communities/[id]/posts/[postId]/replies/route.ts')
const communityReplyDelete = require('../app/api/communities/[id]/posts/[postId]/replies/[replyId]/route.ts')
const discussionReplies = require('../app/api/communities/[id]/discussions/[discussionId]/replies/route.ts')
const discussionReplyDelete = require('../app/api/communities/[id]/discussions/[discussionId]/replies/[replyId]/route.ts')
const communityLike = require('../app/api/communities/[id]/posts/[postId]/like/route.ts')
const postReplyLike = require('../app/api/communities/[id]/posts/[postId]/replies/[replyId]/like/route.ts')
const discussionReplyLike = require('../app/api/communities/[id]/discussions/[discussionId]/replies/[replyId]/like/route.ts')
const account = require('../app/api/me/route.ts')
const accountExport = require('../app/api/me/export/route.ts')
const interest = require('../app/api/galaxies/[id]/events/[eventId]/interest/route.ts')
const summary = require('../app/api/galaxies/events/route.ts')
const streamPosts = require('../app/api/posts/route.ts')
const streamPost = require('../app/api/posts/[id]/route.ts')
const postChoices = require('../app/api/posts/context/route.ts')
const streamLike = require('../app/api/posts/[id]/like/route.ts')
const streamComments = require('../app/api/posts/[id]/comments/route.ts')
const commentEdit = require('../app/api/posts/[id]/comments/[commentId]/route.ts')
const commentLike = require('../app/api/posts/[id]/comments/[commentId]/like/route.ts')
const starMap = require('../app/api/star-map/route.ts')
const inbox = require('../app/api/conversations/route.ts')
const messages = require('../app/api/conversations/[id]/route.ts')
const shareSend = require('../app/api/conversations/[id]/shares/route.ts')
const shareOptions = require('../app/api/conversations/[id]/share-options/route.ts')
const shareRefresh = require('../app/api/conversations/[id]/shared-cards/route.ts')
const { resolveSharedCard } = require('../lib/chat-shares.ts')
const notifications = require('../app/api/notifications/route.ts')
const notificationRead = require('../app/api/notifications/read/route.ts')
const notificationDelete = require('../app/api/notifications/[id]/route.ts')
const follows = require('../app/api/follows/route.ts')
const followStatus = require('../app/api/follows/[userId]/route.ts')
const saved = require('../app/api/saved-planets/route.ts')
const removeSaved = require('../app/api/saved-planets/[planetId]/route.ts')
const invitations = require('../app/api/beam-invitations/route.ts')
const invitationAction = require('../app/api/beam-invitations/[id]/route.ts')
const invitationStatus = require('../app/api/beam-invitations/status/route.ts')
const upcomingEvents = require('../app/api/user/upcoming-events/route.ts')
const calendar = require('../app/api/galaxies/[id]/events/[eventId]/calendar/route.ts')
const blocks = require('../app/api/blocks/route.ts')
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
    await t.test('upcoming reminders prioritize confirmed attendance without leaking suggestions or writing lifecycle status', async () => {
      const owner='reminder-owner', viewer='reminder-viewer'
      for(const id of [owner,viewer]) await db.user.create({data:{id,name:id,email:`${id}@example.test`}})
      const g=await db.community.create({data:{...galaxyData,slug:'reminder-feed',creatorId:owner}})
      try {
        await db.communityMembership.create({data:{communityId:g.id,userId:viewer}})
        const make=(title,hours)=>db.event.create({data:{...eventData,galaxyId:g.id,proposerId:owner,title,onlineUrl:'https://example.test/private-room',date:new Date(Date.now()+hours*3600000),status:'APPROVED'}})
        const suggestion=await make('Suggestion',1), going=await make('Confirmed',48), soon=await make('Soon',2), pending=await make('Pending',3), withdrawn=await make('Withdrawn',4), expired=await make('Expired',-1)
        for(const [item,status] of [[going,'APPROVED'],[soon,'APPROVED'],[pending,'PENDING'],[withdrawn,'CANCELLED']]) await db.eventRSVP.create({data:{eventId:item.id,userId:viewer,status}})
        const get=(query='?limit=6')=>upcomingEvents.GET(new Request('https://example.test/api'+query))
        as(null);assert.equal((await get()).status,401)
        as(viewer)
        for(const query of ['?limit=0','?limit=7','?limit=1.5','?userId='+owner]) assert.equal((await get(query)).status,400)
        const before=await db.notification.count(),response=await get()
        assert.equal(response.headers.get('cache-control'),'private, no-store')
        const data=await response.json()
        assert.deepEqual(data.events.map(e=>e.id),[soon.id,going.id,suggestion.id])
        assert.equal(data.event.id,soon.id)
        assert.deepEqual(data.events.map(e=>e.reminderState),['soon','scheduled',null])
        assert.equal(data.events[2].onlineUrl,null)
        assert.equal(data.events[0].onlineUrl,'https://example.test/private-room')
        assert.equal((await db.event.findUnique({where:{id:expired.id}})).status,'APPROVED')
        assert.equal(await db.notification.count(),before)
        await db.eventRSVP.update({where:{eventId_userId:{eventId:soon.id,userId:viewer}},data:{status:'CANCELLED'}})
        assert.deepEqual((await (await get('?limit=1')).json()).events.map(e=>e.id),[going.id])
        await db.communityMembership.deleteMany({where:{communityId:g.id,userId:viewer}})
        assert.deepEqual(await (await get()).json(),{event:null,events:[]})
        as(owner);assert.ok((await (await get()).json()).events.length>0)
      } finally {await db.community.delete({where:{id:g.id}});await db.user.deleteMany({where:{id:{in:[owner,viewer]}}});as('owner')}
    })
    await t.test('upcoming reminders recheck both block directions and deleted organizer or viewer', async () => {
      const owner='reminder-private-owner', viewer='reminder-private-viewer'
      for(const id of [owner,viewer]) await db.user.create({data:{id,name:id,email:`${id}@example.test`}})
      const g=await db.community.create({data:{...galaxyData,slug:'reminder-private',creatorId:owner}})
      try {
        await db.communityMembership.create({data:{communityId:g.id,userId:viewer}})
        await db.event.create({data:{...eventData,galaxyId:g.id,proposerId:owner,date:new Date(eventData.date),status:'APPROVED'}})
        const get=()=>upcomingEvents.GET(new Request('https://example.test/api'))
        as(viewer);assert.ok((await (await get()).json()).event)
        for(const [blockerId,blockedId] of [[owner,viewer],[viewer,owner]]) {
          await db.block.create({data:{blockerId,blockedId}})
          assert.equal((await (await get()).json()).event,null)
          await db.block.deleteMany({where:{blockerId,blockedId}})
        }
        await db.user.update({where:{id:owner},data:{deletedAt:new Date()}})
        assert.equal((await (await get()).json()).event,null)
        await db.user.update({where:{id:viewer},data:{deletedAt:new Date()}})
        assert.equal((await get()).status,401)
      } finally {await db.community.delete({where:{id:g.id}});await db.user.deleteMany({where:{id:{in:[owner,viewer]}}});as('owner')}
    })
    await t.test('calendar exports require current approved attendance and visibility, escape content and never enroll or notify', async () => {
      const owner='calendar-owner',viewer='calendar-viewer',outsider='calendar-outsider'
      for(const id of [owner,viewer,outsider]) await db.user.create({data:{id,name:id,email:`${id}@example.test`}})
      const g=await db.community.create({data:{...galaxyData,slug:'calendar-test',creatorId:owner}})
      try {
        await db.communityMembership.create({data:{communityId:g.id,userId:viewer}})
        const e=await db.event.create({data:{...eventData,galaxyId:g.id,proposerId:owner,title:'星群🌌'.repeat(30)+'\r\nBEGIN:VEVENT,;\\',date:new Date(eventData.date),status:'APPROVED',onlineUrl:'https://example.test/private-room'}})
        const get=(galaxyId=g.id)=>calendar.GET(new Request('https://example.test/api'),context(galaxyId,e.id))
        as(null);assert.equal((await get()).status,401)
        as(outsider);assert.equal((await get()).status,404)
        as(viewer);assert.equal((await get()).status,403)
        const attendance=await db.eventRSVP.create({data:{eventId:e.id,userId:viewer,status:'PENDING'}})
        assert.equal((await get()).status,403)
        await db.eventRSVP.update({where:{id:attendance.id},data:{status:'APPROVED'}})
        const before=await db.notification.count(),response=await get(),ics=await response.text()
        assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store')
        assert.match(response.headers.get('content-type'),/text\/calendar/)
        assert.match(response.headers.get('content-disposition'),/attachment/)
        assert.ok(ics.includes('DTSTART:20300101T120000Z\r\n'))
        assert.ok(ics.includes('TRIGGER:-PT15M\r\n'))
        const unfolded=ics.replace(/\r\n /g,'')
        assert.equal(unfolded.split('\r\n').filter(line=>line==='BEGIN:VEVENT').length,1)
        assert.ok(unfolded.includes('\\nBEGIN:VEVENT\\,\\;\\\\'))
        assert.ok(!ics.includes('private-room'));assert.ok(!ics.includes(viewer+'@example.test'))
        for(const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line)<=75)
        assert.equal(await db.notification.count(),before)
        assert.equal(await db.eventRSVP.count({where:{eventId:e.id}}),1)
        assert.equal((await get('wrong-galaxy')).status,404)
        for(const [blockerId,blockedId] of [[owner,viewer],[viewer,owner]]) {
          await db.block.create({data:{blockerId,blockedId}});assert.equal((await get()).status,404);await db.block.deleteMany({where:{blockerId,blockedId}})
        }
        for(const status of ['CANCELLED','REJECTED','PENDING']) {await db.eventRSVP.update({where:{id:attendance.id},data:{status}});assert.equal((await get()).status,403)}
        as(owner);assert.equal((await get()).status,200)
        for(const status of ['PENDING','PASSED','CANCELLED','REJECTED']) {await db.event.update({where:{id:e.id},data:{status}});assert.equal((await get()).status,409)}
        await db.event.update({where:{id:e.id},data:{status:'APPROVED',date:new Date('2020-01-01')}});assert.equal((await get()).status,409)
        await db.event.update({where:{id:e.id},data:{date:new Date(eventData.date)}})
        as(viewer);await db.eventRSVP.update({where:{id:attendance.id},data:{status:'APPROVED'}})
        await db.communityMembership.deleteMany({where:{communityId:g.id,userId:viewer}});assert.equal((await get()).status,404)
        await db.communityMembership.create({data:{communityId:g.id,userId:viewer}})
        await db.user.update({where:{id:owner},data:{deletedAt:new Date()}});assert.equal((await get()).status,404)
        await db.user.update({where:{id:viewer},data:{deletedAt:new Date()}});assert.equal((await get()).status,401)
      } finally {await db.community.delete({where:{id:g.id}});await db.user.deleteMany({where:{id:{in:[owner,viewer,outsider]}}});as('owner')}
    })
    await t.test('beam invitation consent is owner-bound, idempotent, localized and opens chat without sending or following', async () => {
      const sender = 'invite-sender', recipient = 'invite-recipient', outsider = 'invite-outsider'
      for (const id of [sender, recipient, outsider]) await db.user.create({ data: { id, name: id, email: `${id}@example.test`, language: id === recipient ? 'zh' : 'fr' } })
      await db.planet.create({ data: { userId: sender, name: 'Invitation custom planet' } })
      await db.user.update({ where: { id: sender }, data: { planetCustomTexture: 'https://example.test/invite.png' } })
      as(null)
      assert.equal((await invitations.POST(request({ recipientId: recipient }))).status, 401)
      assert.equal((await invitations.GET(new Request('https://example.test/api'))).status, 401)
      as(sender)
      assert.equal((await invitations.POST(request({ recipientId: sender }))).status, 400)
      assert.equal((await invitations.POST(request({ recipientId: recipient, content: 'unsolicited text' }))).status, 400)
      const created = await invitations.POST(request({ recipientId: recipient }))
      assert.equal(created.status, 201)
      const { invitationId } = await created.json()
      const ctx = { params: Promise.resolve({ id: invitationId }) }
      const before = await db.notification.count()
      const retry = await invitations.POST(request({ recipientId: recipient }))
      assert.equal(retry.status, 200)
      assert.equal((await retry.json()).invitationId, invitationId)
      assert.equal(await db.notification.count(), before)
      assert.equal((await db.rateLimitBucket.findUnique({ where: { bucketKey: `BEAM_INVITATION:${sender}` } })).count, 1)
      assert.equal((await invitationAction.PATCH(request({ action: 'accept' }), ctx)).status, 404)
      as(outsider)
      assert.equal((await invitationAction.PATCH(request({ action: 'accept' }), ctx)).status, 404)
      assert.equal((await (await invitations.GET(new Request('https://example.test/api'))).json()).invitations.length, 0)
      as(recipient)
      const incoming = await invitations.GET(new Request('https://example.test/api?direction=received'))
      assert.equal(incoming.headers.get('cache-control'), 'private, no-store')
      assert.equal((await incoming.json()).invitations[0].planet.planetConfig.customTextureUrl, 'https://example.test/invite.png')
      const notice = await db.notification.findFirst({ where: { userId: recipient, type: 'BEAM_INVITATION' } })
      const unrelated = await db.notification.create({ data: { userId: recipient, type: 'BEAM_INVITATION', title: 'Another request', body: 'Other', actionUrl: '/messages?invitations=received&invite=unrelated' } })
      assert.equal(notice.title, JSON.parse(readFileSync('messages/zh.json', 'utf8')).notifications.beamInvitationTitle)
      assert.equal(notice.actionUrl, `/messages?invitations=received&invite=${invitationId}`)
      assert.equal((await invitationAction.PATCH(request({ action: 'cancel' }), ctx)).status, 404)
      const crossed = await invitations.POST(request({ recipientId: sender }))
      assert.equal(crossed.status, 409)
      assert.equal((await crossed.json()).error, 'incomingPending')
      const accepted = await invitationAction.PATCH(request({ action: 'accept' }), ctx)
      assert.equal(accepted.status, 200)
      const { conversationId } = await accepted.json()
      assert.ok(conversationId)
      assert.equal(await db.directMessage.count({ where: { conversationId } }), 0)
      assert.equal(await db.follow.count({ where: { OR: [{ followerId: sender }, { followerId: recipient }] } }), 0)
      assert.equal((await db.notification.findUnique({ where: { id: notice.id } })).read, true)
      assert.equal((await db.notification.findUnique({ where: { id: unrelated.id } })).read, false)
      assert.equal((await invitationAction.PATCH(request({ action: 'accept' }), ctx)).status, 200)
      assert.equal((await invitationAction.PATCH(request({ action: 'reject' }), ctx)).status, 409)
      assert.equal(await db.notification.count({ where: { userId: sender, type: 'BEAM_INVITATION_ACCEPTED' } }), 1)
      const acceptedNotice = await db.notification.findFirst({ where: { userId: sender, type: 'BEAM_INVITATION_ACCEPTED' } })
      assert.equal(acceptedNotice.title, JSON.parse(readFileSync('messages/fr.json', 'utf8')).notifications.beamInvitationAcceptedTitle)
      as(sender)
      const exported = await (await accountExport.GET()).json()
      assert.equal(exported.beamInvitations.length, 1)
      assert.equal(exported.beamInvitations[0].id, invitationId)
      assert.ok(!JSON.stringify(exported.beamInvitations).includes(`${recipient}@example.test`))
      assert.equal((await (await inbox.POST(request({ recipientId: recipient }))).json()).conversationId, conversationId)
      assert.equal((await (await invitations.POST(request({ recipientId: recipient }))).json()).conversationId, conversationId)
      assert.equal(await db.notification.count({ where: { type: 'NEW_MESSAGE', userId: recipient } }), 0)
      await db.user.deleteMany({ where: { id: { in: [sender, recipient, outsider] } } })
    })
    await t.test('invitation status reads current viewer consent and thread without sending, following or redirecting',async()=>{
      const ids=['sync-sender','sync-recipient','sync-outsider','sync-cancel']
      for(const id of ids) await db.user.create({data:{id,name:id,email:`${id}@example.test`}})
      const read=recipientId=>invitationStatus.GET(new Request(`https://example.test/api?recipientId=${recipientId}`))
      const data=async id=>(await read(id)).json()
      try {
        as(null);assert.equal((await read(ids[1])).status,401)
        as(ids[0]);assert.equal((await data(ids[1])).status,null)
        const sent=await (await invitations.POST(request({recipientId:ids[1]}))).json()
        const pending=await data(ids[1]);assert.equal(pending.status,'PENDING');assert.equal(pending.invitationId,sent.invitationId)
        assert.equal((await read(ids[1])).headers.get('cache-control'),'private, no-store')
        as(ids[1]);assert.equal((await data(ids[0])).incomingPending,true);assert.equal((await data(ids[0])).invitationId,null)
        as(ids[2]);assert.equal((await data(ids[1])).status,null);assert.equal((await data(ids[1])).conversationId,null)
        as(ids[1]);const accepted=await (await invitationAction.PATCH(request({action:'accept'}),{params:Promise.resolve({id:sent.invitationId})})).json()
        as(ids[0]);const confirmed=await data(ids[1]);assert.equal(confirmed.status,'ACCEPTED');assert.equal(confirmed.conversationId,accepted.conversationId)
        const cancelled=await (await invitations.POST(request({recipientId:ids[3]}))).json()
        await invitationAction.PATCH(request({action:'cancel'}),{params:Promise.resolve({id:cancelled.invitationId})})
        assert.equal((await data(ids[3])).status,'CANCELLED')
        const before=await db.notification.count()
        await data(ids[1]);await data(ids[3])
        assert.equal(await db.notification.count(),before)
        assert.equal(await db.directMessage.count({where:{conversationId:accepted.conversationId}}),0)
        assert.equal(await db.follow.count({where:{followerId:{in:ids}}}),0)
        assert.deepEqual(Object.keys(confirmed).sort(),['available','conversationId','incomingPending','invitationId','status'].sort())
      } finally { await db.user.deleteMany({where:{id:{in:ids}}});as('owner') }
    })
    await t.test('invitation status hides blocked or deleted pairs and rejects caller-selected owners',async()=>{
      const ids=['sync-private-a','sync-private-b']
      for(const id of ids) await db.user.create({data:{id,name:id,email:`${id}@example.test`}})
      const read=(extra='')=>invitationStatus.GET(new Request(`https://example.test/api?recipientId=${ids[1]}${extra}`))
      try {
        as(ids[0]);await invitations.POST(request({recipientId:ids[1]}))
        for(const extra of ['&userId=sync-private-b','&senderId=sync-private-b','&direction=sent']) assert.equal((await read(extra)).status,400)
        for(const [blockerId,blockedId] of [[ids[0],ids[1]],[ids[1],ids[0]]]) {
          const block=await db.block.create({data:{blockerId,blockedId}})
          const hidden=await (await read()).json();assert.equal(hidden.available,false);assert.equal(hidden.invitationId,null);assert.equal(hidden.status,null)
          await db.block.delete({where:{id:block.id}})
        }
        await db.user.update({where:{id:ids[1]},data:{deletedAt:new Date()}})
        assert.equal((await (await read()).json()).available,false)
        await db.user.update({where:{id:ids[0]},data:{deletedAt:new Date()}})
        assert.equal((await read()).status,401)
      } finally {await db.user.deleteMany({where:{id:{in:ids}}});as('owner')}
    })
    await t.test('invitation rejection and cancellation remain terminal; visibility and blocks cannot be bypassed', async () => {
      const a = 'invite-privacy-a', b = 'invite-privacy-b', c = 'invite-privacy-c'
      for (const id of [a, b, c]) await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
      as(a)
      const id = (await (await invitations.POST(request({ recipientId: b }))).json()).invitationId
      const ctx = { params: Promise.resolve({ id }) }
      const received = () => invitations.GET(new Request('https://example.test/api?direction=received'))
      await db.profile.create({ data: { userId: a, visibility: 'PRIVATE' } })
      as(b)
      assert.equal((await (await received()).json()).invitations.length, 0)
      assert.equal((await invitationAction.PATCH(request({ action: 'accept' }), ctx)).status, 404)
      await db.profile.delete({ where: { userId: a } })
      for (const [actor, other] of [[b, a], [a, b]]) {
        as(actor)
        assert.equal((await blocks.POST(request({ userId: other }))).status, 201)
        as(b)
        assert.equal((await (await received()).json()).invitations.length, 0)
        assert.equal((await invitationAction.PATCH(request({ action: 'accept' }), ctx)).status, 404)
        as(a)
        assert.equal((await invitations.POST(request({ recipientId: b }))).status, 404)
        await db.block.deleteMany({ where: { OR: [{ blockerId: a }, { blockerId: b }] } })
      }
      await db.user.update({ where: { id: a }, data: { deletedAt: new Date() } })
      as(b)
      assert.equal((await invitationAction.PATCH(request({ action: 'accept' }), ctx)).status, 404)
      await db.user.update({ where: { id: a }, data: { deletedAt: null } })
      assert.equal((await invitationAction.PATCH(request({ action: 'reject' }), ctx)).status, 200)
      as(a)
      assert.equal((await (await invitations.POST(request({ recipientId: b }))).json()).status, 'REJECTED')
      assert.equal((await invitationAction.PATCH(request({ action: 'cancel' }), ctx)).status, 409)
      const cancelled = (await (await invitations.POST(request({ recipientId: c }))).json()).invitationId
      assert.equal((await invitationAction.PATCH(request({ action: 'cancel' }), { params: Promise.resolve({ id: cancelled }) })).status, 200)
      assert.equal((await (await invitations.POST(request({ recipientId: c }))).json()).status, 'CANCELLED')
      as(c)
      assert.equal((await invitationAction.PATCH(request({ action: 'accept' }), { params: Promise.resolve({ id: cancelled }) })).status, 409)
      assert.equal(await db.conversationThread.count({ where: { OR: [{ userAId: a }, { userBId: a }] } }), 0)
      await db.user.deleteMany({ where: { id: { in: [a, b, c] } } })
    })
    await t.test('invitation quota, list pagination, owner cursors and account cleanup use real persisted state', async () => {
      const sender = 'invite-quota', ids = Array.from({ length: 25 }, (_, i) => `invite-quota-recipient-${i}`)
      for (const id of [sender, ...ids]) await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
      as(sender)
      for (const recipientId of ids.slice(0, 5)) assert.equal((await invitations.POST(request({ recipientId }))).status, 201)
      assert.equal((await invitations.POST(request({ recipientId: ids[5] }))).status, 429)
      assert.equal(await db.beamInvitation.count({ where: { senderId: sender } }), 5)
      for (const recipientId of ids.slice(5)) await db.beamInvitation.create({ data: { senderId: sender, recipientId } })
      const first = await (await invitations.GET(new Request('https://example.test/api?direction=sent'))).json()
      assert.equal(first.invitations.length, 20)
      const second = await (await invitations.GET(new Request(`https://example.test/api?direction=sent&cursor=${first.nextCursor}`))).json()
      assert.equal(second.invitations.length, 5)
      assert.equal(new Set([...first.invitations, ...second.invitations].map(row => row.id)).size, 25)
      assert.equal(second.nextCursor, null)
      as(ids[0])
      assert.equal((await invitations.GET(new Request(`https://example.test/api?direction=received&cursor=${first.nextCursor}`))).status, 400)
      assert.equal((await account.DELETE(request({ confirm: true }))).status, 200)
      assert.equal(await db.beamInvitation.count({ where: { recipientId: ids[0] } }), 0)
      as(sender)
      assert.equal((await account.DELETE(request({ confirm: true }))).status, 200)
      assert.equal(await db.beamInvitation.count({ where: { senderId: sender } }), 0)
      await db.user.deleteMany({ where: { id: { in: [sender, ...ids] } } })
    })
    await t.test('activity interest is independent, private, idempotent and follows the event lifecycle', async () => {
      const g = await db.community.create({ data: { name: 'Interest test', slug: 'interest-test', creatorId: 'owner' } })
      await db.communityMembership.create({ data: { communityId: g.id, userId: 'member' } })
      const e = await db.event.create({ data: { ...eventData, date: new Date(eventData.date), galaxyId: g.id, proposerId: 'owner', status: 'APPROVED', onlineUrl: 'https://private.example.test/meeting' } })
      const ctx = context(g.id, e.id)
      const list = () => summary.GET(new Request('https://example.test/api?status=interested'))
      as(null)
      for (const method of ['GET', 'POST', 'DELETE']) assert.equal((await interest[method](request(), ctx)).status, 401)
      as('outsider')
      assert.equal((await interest.POST(request(), ctx)).status, 404)
      assert.equal((await interest.GET(request(), ctx)).status, 404)
      as('member')
      const notificationsBefore = await db.notification.count()
      const xpBefore = await db.xPEvent.count()
      assert.deepEqual(await (await interest.GET(request(), ctx)).json(), { interested: false })
      for (let i = 0; i < 2; i++) assert.equal((await interest.POST(request(), ctx)).status, 200)
      assert.equal(await db.eventInterest.count({ where: { eventId: e.id } }), 1)
      assert.equal(await db.eventRSVP.count({ where: { eventId: e.id } }), 0)
      assert.equal(await db.notification.count(), notificationsBefore)
      assert.equal(await db.xPEvent.count(), xpBefore)
      let response = await list()
      assert.equal(response.headers.get('cache-control'), 'private, no-store')
      let data = await response.json()
      assert.equal(data.total, 1)
      assert.equal(data.events[0].userInterested, true)
      assert.equal(data.events[0].onlineUrl, null)
      assert.equal((await (await event.GET(request(), ctx)).json()).event.onlineUrl, null)
      as('owner')
      assert.equal((await interest.DELETE(request(), ctx)).status, 204)
      assert.equal(await db.eventInterest.count({ where: { eventId: e.id } }), 1)
      // Privacy applies even to saved content and to the reverse block direction.
      await db.block.create({ data: { blockerId: 'owner', blockedId: 'member' } })
      as('member')
      assert.equal((await list().then(r => r.json())).total, 0)
      assert.equal((await interest.GET(request(), ctx)).status, 404)
      assert.equal((await event.GET(request(), ctx)).status, 404)
      await db.block.deleteMany({ where: { blockerId: 'owner', blockedId: 'member' } })
      await db.user.update({ where: { id: 'owner' }, data: { deletedAt: new Date() } })
      assert.equal((await list().then(r => r.json())).total, 0)
      assert.equal((await interest.POST(request(), ctx)).status, 404)
      await db.user.update({ where: { id: 'owner' }, data: { deletedAt: null } })
      for (const status of ['PENDING', 'REJECTED']) {
        await db.event.update({ where: { id: e.id }, data: { status } })
        assert.equal((await list().then(r => r.json())).total, 0)
        assert.equal((await interest.POST(request(), ctx)).status, 404)
      }
      await db.event.update({ where: { id: e.id }, data: { status: 'APPROVED', date: new Date('2020-01-01') } })
      assert.equal((await interest.POST(request(), ctx)).status, 409)
      data = await list().then(r => r.json())
      assert.equal(data.events[0].status, 'PASSED')
      await db.event.update({ where: { id: e.id }, data: { status: 'CANCELLED' } })
      assert.equal((await interest.POST(request(), ctx)).status, 409)
      assert.equal((await list().then(r => r.json())).total, 1)
      const history = () => summary.GET(new Request('https://example.test/api?status=passed')).then(r => r.json())
      assert.equal((await history()).total, 0) // Saving is not participation.
      await db.eventRSVP.create({ data: { eventId: e.id, userId: 'member', status: 'CANCELLED' } })
      assert.equal((await history()).total, 1)
      await db.communityMembership.deleteMany({ where: { communityId: g.id, userId: 'member' } })
      assert.equal((await list().then(r => r.json())).total, 0)
      assert.equal((await interest.GET(request(), ctx)).status, 404)
      for (let i = 0; i < 2; i++) assert.equal((await interest.DELETE(request(), ctx)).status, 204)
      assert.equal(await db.eventInterest.count({ where: { eventId: e.id } }), 0)
      // Cascading deletion leaves no orphaned interests.
      await db.eventInterest.create({ data: { eventId: e.id, userId: 'member' } })
      await db.community.delete({ where: { id: g.id } })
      assert.equal(await db.eventInterest.count({ where: { eventId: e.id } }), 0)
    })
    await t.test('activity pagination has deterministic pages and private proposer images are withheld', async () => {
      as('member')
      const g = await db.community.create({ data: { name: 'Page test', slug: 'interest-page-test', creatorId: 'owner' } })
      await db.communityMembership.create({ data: { communityId: g.id, userId: 'member' } })
      await db.event.createMany({ data: Array.from({ length: 21 }, (_, i) => ({ id: `interest-page-${String(i).padStart(2, '0')}`, galaxyId: g.id, proposerId: 'owner', title: 'Pagination activity', description: 'Test', date: new Date('2030-01-01'), category: 'MEETUP', status: 'APPROVED' })) })
      await db.profile.upsert({ where: { userId: 'owner' }, create: { userId: 'owner', visibility: 'PRIVATE' }, update: { visibility: 'PRIVATE' } })
      const first = await summary.GET(new Request('https://example.test/api?search=Pagination&page=1')).then(r => r.json())
      const second = await summary.GET(new Request('https://example.test/api?search=Pagination&page=2')).then(r => r.json())
      assert.equal(first.events.length, 20)
      assert.equal(second.events.length, 1)
      assert.equal(new Set([...first.events, ...second.events].map(e => e.id)).size, 21)
      assert.equal(first.events[0].proposer.planetConfig, null)
      assert.equal(first.events[0].proposer.planetTexture, null)
      await db.profile.delete({ where: { userId: 'owner' } })
      await db.community.delete({ where: { id: g.id } })
    })
    await t.test('activity filters reject malformed pagination, status, category and oversized search', async () => {
      as('member')
      for (const query of ['page=-1', 'page=1.5', 'page=Infinity', 'page=10001', 'status=unknown', 'category=unknown', 'search=' + 'x'.repeat(81)]) {
        assert.equal((await summary.GET(new Request('https://example.test/api?' + query))).status, 400)
      }
    })
    await t.test('saved status and relationship guidance persist and respect visibility changes', async () => {
      for (const id of ['action-viewer', 'action-target', 'action-other']) await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
      const planet = await db.planet.create({ data: { userId: 'action-target', name: 'Action test' } })
      const savedContext = { params: Promise.resolve({ planetId: planet.id }) }
      const followContext = { params: Promise.resolve({ userId: 'action-target' }) }
      as(null)
      assert.equal((await removeSaved.GET(request(), savedContext)).status, 401)
      as('action-viewer')
      assert.deepEqual(await (await removeSaved.GET(request(), savedContext)).json(), { saved: false })
      const before = await db.notification.count()
      assert.equal((await saved.POST(request({ planetId: planet.id }))).status, 200)
      const savedState = await removeSaved.GET(request(), savedContext)
      assert.equal(savedState.headers.get('cache-control'), 'private, no-store')
      assert.deepEqual(await savedState.json(), { saved: true })
      assert.equal(await db.notification.count(), before)
      as('action-other')
      assert.deepEqual(await (await removeSaved.GET(request(), savedContext)).json(), { saved: false })
      assert.equal((await removeSaved.DELETE(request(), savedContext)).status, 204)
      as('action-viewer')
      assert.deepEqual(await (await removeSaved.GET(request(), savedContext)).json(), { saved: true })
      const guidance = await inbox.POST(request({ recipientId: 'action-target' }))
      assert.equal(guidance.status, 403)
      assert.equal((await guidance.json()).code, 'mutualFollowRequired')
      await follows.POST(request({ userId: 'action-target' }))
      assert.deepEqual(await (await followStatus.GET(request(), followContext)).json(), { following: true, followedBy: false, available: true })
      as('action-target')
      await follows.POST(request({ userId: 'action-viewer' }))
      as('action-viewer')
      assert.deepEqual(await (await followStatus.GET(request(), followContext)).json(), { following: true, followedBy: true, available: true })
      const opened = await inbox.POST(request({ recipientId: 'action-target' }))
      assert.equal(opened.status, 201)
      const thread = (await opened.json()).conversationId
      assert.equal(await db.directMessage.count({ where: { conversationId: thread } }), 0)
      await followStatus.DELETE(request(), followContext)
      assert.equal((await inbox.POST(request({ recipientId: 'action-target' }))).status, 200)
      await db.block.create({ data: { blockerId: 'action-target', blockedId: 'action-viewer' } })
      assert.equal((await removeSaved.GET(request(), savedContext)).status, 404)
      assert.deepEqual(await (await followStatus.GET(request(), followContext)).json(), { following: false, followedBy: false, available: false })
      assert.equal((await inbox.POST(request({ recipientId: 'action-target' }))).status, 403)
      assert.equal((await removeSaved.DELETE(request(), savedContext)).status, 204)
      await db.block.deleteMany({ where: { blockerId: 'action-target' } })
      await db.follow.deleteMany({ where: { followerId: 'action-target' } })
      await db.profile.create({ data: { userId: 'action-target', visibility: 'PRIVATE' } })
      assert.equal((await removeSaved.GET(request(), savedContext)).status, 404)
      await db.profile.delete({ where: { userId: 'action-target' } })
      await db.planet.update({ where: { id: planet.id }, data: { active: false } })
      assert.equal((await removeSaved.GET(request(), savedContext)).status, 404)
      await db.planet.update({ where: { id: planet.id }, data: { active: true } })
      await db.user.update({ where: { id: 'action-target' }, data: { deletedAt: new Date() } })
      assert.equal((await removeSaved.GET(request(), savedContext)).status, 404)
      assert.equal((await followStatus.GET(request(), followContext)).status, 200)
      assert.equal((await followStatus.GET(request(), followContext).then(r => r.json())).available, false)
      await db.user.deleteMany({ where: { id: { in: ['action-viewer', 'action-target', 'action-other'] } } })
    })
    await t.test('stream context creation, read and interaction permissions use real persisted associations', async () => {
      for (const id of ['context-owner', 'context-member', 'context-outsider']) await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
      const g = await db.community.create({ data: { name: 'Context galaxy', slug: 'context-galaxy', creatorId: 'context-owner' } })
      const other = await db.community.create({ data: { name: 'Other galaxy', slug: 'context-other', creatorId: 'context-owner' } })
      await db.communityMembership.createMany({ data: [{ userId: 'context-member', communityId: g.id }, { userId: 'context-member', communityId: other.id }] })
      const e = await db.event.create({ data: { ...eventData, date: new Date(eventData.date), galaxyId: g.id, proposerId: 'context-owner', status: 'APPROVED' } })
      const form = fields => { const body = new FormData(); for (const [key, value] of Object.entries({ content: 'Context signal', category: 'GENERAL', ...fields })) body.set(key, value); return new Request('https://example.test/api/posts', { method: 'POST', body }) }
      const ctx = id => ({ params: Promise.resolve({ id }) })
      const get = query => new Request('https://example.test/api/posts?' + query)
      as(null)
      assert.equal((await streamPosts.POST(form({}))).status, 401)
      assert.equal((await postChoices.GET(get(''))).status, 401)
      as('context-outsider')
      assert.equal((await streamPosts.POST(form({ eventId: e.id }))).status, 404)
      assert.equal((await postChoices.GET(get(`kind=events&galaxyId=${g.id}`)).then(r => r.json())).options.length, 0)
      as('context-member')
      assert.equal((await streamPosts.POST(form({ eventId: e.id, galaxyId: other.id }))).status, 400)
      assert.equal((await streamPosts.POST(form({ extra: 'forbidden' }))).status, 400)
      const created = await streamPosts.POST(form({ eventId: e.id }))
      assert.equal(created.status, 201)
      const post = (await created.json()).post
      assert.equal(post.context.galaxy.id, g.id)
      assert.equal(post.context.event.id, e.id)
      assert.equal(post.contextRestricted, true)
      assert.equal((await db.post.findUnique({ where: { id: post.id } })).galaxyId, g.id)
      assert.equal(await db.communityPost.count({ where: { communityId: g.id } }), 0)
      assert.equal(await db.xPEvent.count({ where: { userId: 'context-member', type: 'POST_CREATED' } }), 1)
      as('context-owner')
      assert.equal((await streamPost.GET(get(''), ctx(post.id))).status, 200)
      const commentResponse = await streamComments.POST(request({ content: 'Member reply' }), ctx(post.id))
      assert.equal(commentResponse.status, 201)
      const commentId = (await commentResponse.json()).comment.id
      const commentCtx = { params: Promise.resolve({ id: post.id, commentId }) }
      as('context-outsider')
      // A bookmarked/forged navigation hint never grants access to the destination.
      assert.equal((await streamPost.GET(get(`fromContext=%2Fgalaxy%2F${g.slug}%3Fevent%3D${e.id}&returnPost=${post.id}`), ctx(post.id))).status, 404)
      assert.equal((await streamPost.GET(get(''), ctx(post.id))).status, 404)
      assert.equal((await streamLike.POST(request(), ctx(post.id))).status, 404)
      assert.equal((await streamComments.GET(get(''), ctx(post.id))).status, 404)
      assert.equal((await streamComments.POST(request({ content: 'not allowed' }), ctx(post.id))).status, 404)
      assert.equal((await commentLike.POST(request(), commentCtx)).status, 404)
      assert.equal((await commentEdit.PATCH(request({ content: 'not allowed' }), commentCtx)).status, 404)
      assert.equal((await streamPosts.GET(get(`eventId=${e.id}`)).then(r => r.json())).posts.length, 0)
      as(null)
      assert.equal((await streamPost.GET(get(''), ctx(post.id))).status, 404)
      as('context-member')
      const updated = await streamPost.PATCH(request({ content: 'Revised signal' }), ctx(post.id))
      assert.equal(updated.status, 200)
      assert.equal((await updated.json()).post.context.event.id, e.id)
      assert.equal(await db.xPEvent.count({ where: { userId: 'context-member', type: 'POST_CREATED' } }), 1)
      as('context-owner')
      assert.equal((await streamPost.PATCH(request({ content: 'Not mine' }), ctx(post.id))).status, 403)
      for (const status of ['PENDING', 'REJECTED']) {
        await db.event.update({ where: { id: e.id }, data: { status } })
        assert.equal((await streamPost.GET(get(''), ctx(post.id))).status, 404)
        as('context-member')
        const own = await streamPost.GET(get(''), ctx(post.id)).then(r => r.json())
        assert.equal(own.post.context.event, null)
        assert.ok(!JSON.stringify(own.post.context).includes(e.title))
        assert.equal((await streamPost.PATCH(request({ content: 'Keep pending' }), ctx(post.id))).status, 404)
        as('context-owner')
      }
      for (const status of ['PASSED', 'CANCELLED']) {
        await db.event.update({ where: { id: e.id }, data: { status } })
        assert.equal((await streamPost.GET(get(''), ctx(post.id))).status, 200)
        as('context-member')
        const next = await streamPosts.POST(form({ eventId: e.id }))
        assert.equal(next.status, status === 'PASSED' ? 201 : 404)
        if (next.status === 201) await db.post.delete({ where: { id: (await next.json()).post.id } })
        as('context-owner')
      }
      await db.block.create({ data: { blockerId: 'context-owner', blockedId: 'context-member' } })
      assert.equal((await streamPost.GET(get(''), ctx(post.id))).status, 404)
      await db.block.deleteMany({ where: { blockerId: 'context-owner' } })
      await db.communityMembership.deleteMany({ where: { userId: 'context-member', communityId: g.id } })
      as('context-member')
      const own = await streamPost.GET(get(''), ctx(post.id)).then(r => r.json())
      assert.equal(own.post.context, null)
      assert.equal((await streamPost.PATCH(request({ content: 'Still linked' }), ctx(post.id))).status, 404)
      // Galaxy deletion removes references without exposing a previously restricted post.
      await db.community.delete({ where: { id: g.id } })
      const stored = await db.post.findUnique({ where: { id: post.id } })
      assert.equal(stored.galaxyId, null)
      assert.equal(stored.eventId, null)
      assert.equal(stored.contextRestricted, true)
      as('context-outsider')
      assert.equal((await streamPost.GET(get(''), ctx(post.id))).status, 404)
      as('context-member')
      assert.equal((await streamPost.DELETE(request(), ctx(post.id))).status, 200)
      // Explicitly removing links is an author decision to return to the global stream.
      const fresh = await streamPosts.POST(form({ galaxyId: other.id })).then(r => r.json())
      assert.equal((await streamPost.PATCH(request({ content: 'Now global', galaxyId: null, eventId: null }), ctx(fresh.post.id))).status, 200)
      as(null)
      assert.equal((await streamPost.GET(get(''), ctx(fresh.post.id))).status, 200)
      await db.post.createMany({ data: Array.from({ length: 21 }, (_, i) => ({ id: `ctx-page-${String(i).padStart(2, '0')}`, authorId: 'context-member', content: 'Pagination context test', createdAt: new Date('2030-01-01') })) })
      const first = await streamPosts.GET(get('search=Pagination%20context&limit=20')).then(r => r.json())
      assert.equal(first.posts.length, 20)
      assert.equal(first.nextCursor, first.posts.at(-1).id)
      const second = await streamPosts.GET(get(`search=Pagination%20context&limit=20&cursor=${first.nextCursor}`)).then(r => r.json())
      assert.equal(second.posts.length, 1)
      assert.equal(new Set([...first.posts, ...second.posts].map(row => row.id)).size, 21)
      assert.equal(first.posts[0].author.planetConfig, null)
      as('context-member')
      await db.community.createMany({ data: Array.from({ length: 21 }, (_, i) => ({ name: `Choice test ${i}`, slug: `ctx-choice-${i}`, creatorId: 'context-member' })) })
      const choices = await postChoices.GET(get('search=Choice%20test')).then(r => r.json())
      assert.equal(choices.options.length, 20)
      assert.equal(choices.more, true)
      assert.equal((await postChoices.GET(get('search=Choice%20test&page=2')).then(r => r.json())).options.length, 1)
      for (const query of ['kind=unknown', 'kind=events', 'page=0', 'search=' + 'x'.repeat(81)]) assert.equal((await postChoices.GET(get(query))).status, 400)
      for (const query of ['limit=1.5', 'cursor=unknown', 'eventId=', 'search=' + 'x'.repeat(81)]) assert.equal((await streamPosts.GET(get(query))).status, 400)
      await db.community.deleteMany({ where: { slug: { startsWith: 'ctx-choice-' } } })
      await db.community.delete({ where: { id: other.id } })
      await db.user.deleteMany({ where: { id: { in: ['context-owner', 'context-member', 'context-outsider'] } } })
    })
    let threadId, firstMessageId, secondMessageId
    const threadContext = () => ({ params: Promise.resolve({ id: threadId }) })
    const getRequest = (query = '') =>
      new Request('https://example.test/api' + query)
    await t.test('structured shares enforce both-participant access and live viewer hydration', async t => {
      const sender = 'shares-sender', recipient = 'shares-recipient', target = 'shares-target', proposer = 'shares-proposer'
      for (const id of [sender, recipient, target, proposer]) await db.user.create({ data: { id, name: id, email: `${id}@example.test`, language: 'zh' } })
      const planet = await db.planet.create({ data: { userId: target, name: 'Secret DIY target' } })
      await db.user.update({ where: { id: target }, data: { planetCustomTexture: 'https://example.test/shared-diy.png' } })
      const galaxy = await db.community.create({ data: { name: 'Shared galaxy', slug: 'shared-galaxy', creatorId: sender, joinPolicy: 'APPROVAL' } })
      const event = await db.event.create({ data: { galaxyId: galaxy.id, proposerId: proposer, title: 'Secret activity title', description: 'Private event details', onlineUrl: 'https://example.test/private-meeting', category: 'ONLINE', date: new Date('2030-01-01'), status: 'APPROVED' } })
      const thread = await db.conversationThread.create({ data: { userAId: sender, userBId: recipient } })
      const ctx = { params: Promise.resolve({ id: thread.id }) }, key = crypto.randomUUID()
      const send = (kind, targetId, clientMessageId = crypto.randomUUID()) => shareSend.POST(request({ kind, targetId, clientMessageId }), ctx)
      const options = kind => shareOptions.GET(new Request('https://example.test/api?kind=' + kind), ctx)
      let planetMessage
      try {
        await t.test('explicit sends are strict, owned, idempotent, generic and preserve DIY configuration', async () => {
          as(null); assert.equal((await send('planet', planet.id)).status, 401)
          as('outsider'); assert.equal((await send('planet', planet.id)).status, 404); assert.equal((await options('planet')).status, 404)
          as(sender)
          assert.equal((await shareSend.POST(request({ kind: 'planet', targetId: planet.id, clientMessageId: key, title: 'forged' }), ctx)).status, 400)
          assert.equal((await shareSend.POST(request({ kind: 'link', targetId: planet.id, clientMessageId: key }), ctx)).status, 400)
          assert.equal((await shareSend.POST(request({ kind: 'planet', targetId: planet.id }), ctx)).status, 400)
          assert.equal((await shareOptions.GET(new Request('https://example.test/api?kind=planet&cursor=1'), ctx)).status, 400)
          const available = await (await options('planet')).json()
          assert.ok(available.options.some(card => card.id === planet.id))
          const first = await send('planet', planet.id, key); assert.equal(first.status, 201)
          planetMessage = await first.json()
          assert.equal(planetMessage.share.planetConfig.customTextureUrl, 'https://example.test/shared-diy.png')
          const retry = await send('planet', planet.id, key); assert.equal(retry.status, 200); assert.equal((await retry.json()).id, planetMessage.id)
          assert.equal(await db.directMessage.count({ where: { conversationId: thread.id } }), 1)
          assert.equal((await send('galaxy', galaxy.id, key)).status, 409)
          assert.equal((await messages.POST(request({ content: 'text', clientMessageId: key }), ctx)).status, 409)
          const notice = await db.notification.findMany({ where: { userId: recipient, type: 'NEW_MESSAGE' } })
          assert.equal(notice.length, 1); assert.ok(!JSON.stringify(notice).includes(planet.name)); assert.ok(!JSON.stringify(notice).includes('shared-diy'))
          assert.equal((await db.$queryRaw`SELECT count FROM rate_limit_bucket WHERE \"bucketKey\" = ${'MESSAGE_SEND:' + sender}`)[0].count, 1)
          await db.$executeRaw`UPDATE rate_limit_bucket SET count = 60 WHERE \"bucketKey\" = ${'MESSAGE_SEND:' + sender}`
          assert.equal((await send('galaxy', galaxy.id)).status, 429)
          assert.equal((await send('planet', planet.id, key)).status, 200)
          await db.$executeRaw`UPDATE rate_limit_bucket SET count = 1 WHERE \"bucketKey\" = ${'MESSAGE_SEND:' + sender}`
          assert.equal(notice[0].actionUrl, '/messages/' + thread.id)
          assert.ok(notice[0].body.includes(sender))
          assert.equal((await (await inbox.GET(new Request('https://example.test/api'))).json()).find(row => row.id === thread.id).lastMessage.content, '')
          assert.equal(await db.follow.count({ where: { OR: [{ followerId: sender }, { followerId: recipient }] } }), 0)
          assert.equal(await db.communityMembership.count({ where: { communityId: galaxy.id } }), 0)
          assert.equal(await db.eventRSVP.count({ where: { eventId: event.id } }), 0)
        })
        await t.test('private/follow, inactive, deleted and bidirectional block changes minimize reads and deny new sends', async () => {
          await db.profile.create({ data: { userId: target, visibility: 'PRIVATE' } })
          await db.follow.create({ data: { followerId: sender, followingId: target } })
          as(sender); assert.ok(!(await (await options('planet')).json()).options.some(card => card.id === planet.id))
          assert.equal((await send('planet', planet.id)).status, 404)
          as(recipient)
          let read = await (await messages.GET(new Request('https://example.test/api'), ctx)).json()
          assert.deepEqual(read.messages[0].share, { available: false }); assert.ok(!JSON.stringify(read.messages).includes(planet.id)); assert.ok(!JSON.stringify(read.messages).includes(planet.name))
          await db.follow.create({ data: { followerId: target, followingId: recipient } })
          read = await (await messages.GET(new Request('https://example.test/api'), ctx)).json(); assert.equal(read.messages[0].share.title, target)
          await db.user.update({ where: { id: target }, data: { planetCustomTexture: 'https://example.test/new-diy.png' } })
          const fresh = await (await shareRefresh.POST(request({ ids: [planetMessage.id, 'foreign-id'] }), ctx)).json()
          assert.equal(fresh.messages.length, 1); assert.equal(fresh.messages[0].share.planetConfig.customTextureUrl, 'https://example.test/new-diy.png')
          assert.equal((await db.directMessage.findUnique({ where: { id: planetMessage.id } })).readAt, null)
          assert.equal((await shareRefresh.POST(request({ ids: Array(101).fill(planetMessage.id) }), ctx)).status, 400)
          for (const blocker of [target, recipient]) {
            await db.block.create({ data: { blockerId: blocker, blockedId: blocker === target ? recipient : target } })
            assert.deepEqual((await (await shareRefresh.POST(request({ ids: [planetMessage.id] }), ctx)).json()).messages[0].share, { available: false })
            as(sender); assert.equal((await send('planet', planet.id)).status, 404)
            as(recipient); await db.block.deleteMany({ where: { OR: [{ blockerId: target, blockedId: recipient }, { blockerId: recipient, blockedId: target }] } })
          }
          for (const change of ['inactive', 'deleted']) {
            if (change === 'inactive') await db.planet.update({ where: { id: planet.id }, data: { active: false } })
            else await db.user.update({ where: { id: target }, data: { deletedAt: new Date() } })
            assert.deepEqual((await (await messages.GET(new Request('https://example.test/api'), ctx)).json()).messages[0].share, { available: false })
            as(sender); const retry = await send('planet', planet.id, key); assert.equal(retry.status, 200); assert.deepEqual((await retry.json()).share, { available: false })
            await db.planet.update({ where: { id: planet.id }, data: { active: true } }); await db.user.update({ where: { id: target }, data: { deletedAt: null } }); as(recipient)
          }
        })
        await t.test('galaxy shares use stable IDs; event cards mirror membership/status/proposer/admin/operator access', async () => {
          as(sender); const sharedGalaxy = await send('galaxy', galaxy.id); assert.equal(sharedGalaxy.status, 201)
          await db.community.update({ where: { id: galaxy.id }, data: { slug: 'shared-galaxy-renamed' } })
          as(recipient); assert.equal((await (await messages.GET(new Request('https://example.test/api'), ctx)).json()).messages.find(row => row.type === 'share' && row.share.kind === 'galaxy').share.href, '/galaxy/shared-galaxy-renamed')
          as(sender); assert.equal((await send('event', event.id)).status, 404)
          await db.communityMembership.create({ data: { communityId: galaxy.id, userId: recipient } })
          const sharedEvent = await send('event', event.id); assert.equal(sharedEvent.status, 201)
          const eventRow = await sharedEvent.json(); assert.ok(!JSON.stringify(eventRow).includes('private-meeting')); assert.ok(!JSON.stringify(eventRow).includes('Private event details'))
          await db.event.update({ where: { id: event.id }, data: { status: 'PENDING' } })
          as(recipient); assert.deepEqual((await (await shareRefresh.POST(request({ ids: [eventRow.id] }), ctx)).json()).messages[0].share, { available: false })
          for (const status of ['APPROVED', 'PASSED', 'CANCELLED']) {
            await db.event.update({ where: { id: event.id }, data: { status } })
            assert.equal((await resolveSharedCard('event', event.id, { id: recipient }, db)).available, true)
          }
          await db.event.update({ where: { id: event.id }, data: { status: 'REJECTED' } })
          assert.equal((await resolveSharedCard('event', event.id, { id: recipient }, db)).available, false)
          assert.equal((await resolveSharedCard('event', event.id, { id: sender }, db)).available, true)
          assert.equal((await resolveSharedCard('event', event.id, { id: proposer }, db)).available, true)
          await db.communityMembership.update({ where: { userId_communityId: { userId: recipient, communityId: galaxy.id } }, data: { role: 'ADMIN' } })
          assert.equal((await resolveSharedCard('event', event.id, { id: recipient }, db)).available, true)
          await db.communityMembership.deleteMany({ where: { communityId: galaxy.id, userId: recipient } })
          const previous = process.env.OPERATOR_EMAILS; process.env.OPERATOR_EMAILS = recipient + '@example.test'
          try { assert.equal((await resolveSharedCard('event', event.id, { id: recipient, email: recipient + '@example.test' }, db)).available, true) } finally { if (previous === undefined) delete process.env.OPERATOR_EMAILS; else process.env.OPERATOR_EMAILS = previous }
          await db.block.create({ data: { blockerId: proposer, blockedId: sender } })
          assert.equal((await resolveSharedCard('event', event.id, { id: sender }, db)).available, false)
          await db.block.deleteMany({ where: { blockerId: proposer, blockedId: sender } })
          await db.user.update({ where: { id: proposer }, data: { deletedAt: new Date() } })
          assert.equal((await resolveSharedCard('event', event.id, { id: sender }, db)).available, false)
          await db.user.update({ where: { id: proposer }, data: { deletedAt: null } })
          await db.event.delete({ where: { id: event.id } }); assert.equal((await resolveSharedCard('event', event.id, { id: sender }, db)).available, false)
        })
        await t.test('share selection paginates bounded search results without returning inaccessible target IDs', async () => {
          for (let i = 0; i < 25; i++) await db.community.create({ data: { name: 'share-choice-' + i, slug: 'share-choice-' + i } })
          as(sender)
          const first = await (await shareOptions.GET(new Request('https://example.test/api?kind=galaxy&search=share-choice-'), ctx)).json()
          assert.equal(first.options.length, 20); assert.equal(first.nextCursor, '20')
          const second = await (await shareOptions.GET(new Request('https://example.test/api?kind=galaxy&search=share-choice-&cursor=20'), ctx)).json()
          assert.equal(second.options.length, 5); assert.equal(second.nextCursor, null)
          assert.equal(new Set([...first.options, ...second.options].map(card => card.id)).size, 25)
          await db.profile.create({ data: { userId: proposer, visibility: 'PRIVATE' } })
          const hidden = []
          for (let i = 0; i < 21; i++) hidden.push(await db.planet.create({ data: { userId: proposer, name: 'NoSharePrivate-' + i } }))
          const privatePage = await (await shareOptions.GET(new Request('https://example.test/api?kind=planet&search=NoSharePrivate-'), ctx)).json()
          assert.deepEqual(privatePage.options, []); assert.equal(privatePage.nextCursor, '20')
          for (const planet of hidden) assert.ok(!JSON.stringify(privatePage).includes(planet.id))
          assert.equal((await shareOptions.GET(new Request('https://example.test/api?kind=galaxy&search=' + 'x'.repeat(81)), ctx)).status, 400)
          await db.community.deleteMany({ where: { slug: { startsWith: 'share-choice-' } } })
        })
        await t.test('card history, recipient unread, export and account cleanup stay in the message lifecycle', async () => {
          as(recipient); assert.equal((await (await notifications.GET(new Request('https://example.test/api'))).json()).unreadMessagesCount, 3)
          as(sender)
          const exported = await (await accountExport.GET()).json()
          const history = exported.directMessages.find(row => row.conversationId === thread.id).messages
          assert.equal(history.find(row => row.id === planetMessage.id).shareTargetId, planet.id); assert.equal(history.find(row => row.id === planetMessage.id).content, '')
          assert.ok(!JSON.stringify(exported.directMessages).includes('Secret DIY target'))
          await db.community.delete({ where: { id: galaxy.id } })
          as(recipient); const read = await (await messages.GET(new Request('https://example.test/api'), ctx)).json(); assert.ok(read.messages.filter(row => row.share).some(row => !row.share.available))
          await messages.PATCH(request({ ids: read.messages.map(row => row.id) }), ctx)
          assert.equal((await (await notifications.GET(new Request('https://example.test/api'))).json()).unreadMessagesCount, 0)
          await db.block.create({ data: { blockerId: sender, blockedId: recipient } })
          assert.equal((await shareRefresh.POST(request({ ids: [planetMessage.id] }), ctx)).status, 404)
          assert.equal((await options('planet')).status, 404)
          as(sender); assert.equal((await send('planet', planet.id, key)).status, 404)
          await db.block.deleteMany({ where: { blockerId: sender, blockedId: recipient } })
          as(recipient); assert.equal((await account.DELETE(new Request('https://example.test/api/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) }))).status, 200)
          assert.equal(await db.directMessage.count({ where: { conversationId: thread.id } }), 3)
          as(sender); assert.equal((await (await messages.GET(new Request('https://example.test/api'), ctx)).json()).canSend, false)
          assert.equal((await send('planet', planet.id)).status, 404)
          as(target); assert.equal((await account.DELETE(new Request('https://example.test/api/me', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) }))).status, 200)
          as(sender); assert.deepEqual((await (await shareRefresh.POST(request({ ids: [planetMessage.id] }), ctx)).json()).messages[0].share, { available: false })
        })
      } finally {
        await db.community.deleteMany({ where: { OR: [{ id: galaxy.id }, { slug: { startsWith: 'share-choice-' } }] } }); await db.conversationThread.deleteMany({ where: { id: thread.id } })
        await db.notification.deleteMany({ where: { userId: { in: [sender, recipient, target, proposer] } } })
        await db.user.deleteMany({ where: { id: { in: [sender, recipient, target, proposer] } } })
      }
    })
    await t.test('chat text preserves emoji, internal newlines and URLs across delivery, retry and received history', async () => {
      const sender = 'chat-text-sender', recipient = 'chat-text-recipient'
      for (const id of [sender, recipient]) await db.user.create({ data: { id, name: id, email: `${id}@example.test`, language: 'fr' } })
      const thread = await db.conversationThread.create({ data: { userAId: sender, userBId: recipient } })
      const ctx = { params: Promise.resolve({ id: thread.id }) }
      const content = '你好 😊❤️\nBonjour 👋\nhttps://example.test/路径?q=1&x=2'
      const clientMessageId = crypto.randomUUID()
      as(sender)
      const sent = await messages.POST(request({ content, clientMessageId }), ctx)
      assert.equal(sent.status, 201)
      const row = await sent.json()
      assert.equal(row.content, content)
      assert.equal(row.type, 'text')
      const retry = await messages.POST(request({ content, clientMessageId }), ctx)
      assert.equal(retry.status, 200)
      assert.equal((await retry.json()).id, row.id)
      assert.equal(await db.directMessage.count({ where: { conversationId: thread.id } }), 1)
      assert.equal(await db.notification.count({ where: { userId: recipient, type: 'NEW_MESSAGE' } }), 1)
      as(recipient)
      const received = await (await messages.GET(getRequest(), ctx)).json()
      assert.equal(received.messages[0].content, content)
      assert.equal(received.messages[0].readAt, undefined)
      assert.equal((await db.directMessage.findUnique({ where: { id: row.id } })).readAt, null)
      as(sender)
      assert.equal((await messages.POST(request({ content: '🪐'.repeat(2001) }), ctx)).status, 400)
      const atLimit = await messages.POST(request({ content: '🪐'.repeat(2000), clientMessageId: crypto.randomUUID() }), ctx)
      assert.equal(atLimit.status, 201)
      assert.equal((await atLimit.json()).content.length, 4000)
      await db.notification.deleteMany({ where: { userId: { in: [sender, recipient] } } })
      await db.conversationThread.delete({ where: { id: thread.id } })
      await db.user.deleteMany({ where: { id: { in: [sender, recipient] } } })
    })
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
          { following: false, followedBy: false, available: false },
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
        assert.equal(search.total, data.total)
        assert.deepEqual(search.groups, data.groups)
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
    await t.test('star map returns only viewer-owned relationship state and refreshes after visibility changes', async () => {
      const viewer = 'map-relation-viewer', target = 'map-relation-target', other = 'map-relation-other'
      for (const id of [viewer, target, other]) await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
      const planet = await db.planet.create({ data: { userId: target, name: 'Relationship fixture target' } })
      const map = () => starMap.GET(new Request('https://example.test/api?mode=discover&search=Relationship%20fixture'))
      const state = async () => (await (await map()).json()).nodes[0]?.relationship
      as(other)
      await saved.POST(request({ planetId: planet.id }))
      await db.conversationThread.create({ data: { userAId: other, userBId: target } })
      as(viewer)
      const response = await map()
      assert.equal(response.headers.get('cache-control'), 'private, no-store')
      assert.equal((await response.json()).nodes[0].userId, target)
      assert.deepEqual(await state(), { saved: false, following: false, followedBy: false, conversationId: null })
      await saved.POST(request({ planetId: planet.id }))
      await follows.POST(request({ userId: target }))
      assert.deepEqual(await state(), { saved: true, following: true, followedBy: false, conversationId: null })
      as(target)
      await follows.POST(request({ userId: viewer }))
      as(viewer)
      const opened = await inbox.POST(request({ recipientId: target }))
      assert.equal(opened.status, 201)
      const conversationId = (await opened.json()).conversationId
      assert.deepEqual(await state(), { saved: true, following: true, followedBy: true, conversationId })
      assert.equal(await db.directMessage.count({ where: { conversationId } }), 0)
      await followStatus.DELETE(request(), { params: Promise.resolve({ userId: target }) })
      assert.deepEqual(await state(), { saved: true, following: false, followedBy: true, conversationId })
      assert.equal((await inbox.POST(request({ recipientId: target }))).status, 200)
      as(other)
      assert.notEqual((await state()).conversationId, conversationId)
      as(viewer)
      const visibleTotal = (await (await map()).json()).total
      for (const [blockerId, blockedId] of [[viewer, target], [target, viewer]]) {
        const block = await db.block.create({ data: { blockerId, blockedId } })
        const hidden = await (await map()).json()
        assert.equal(hidden.nodes.length, 0)
        assert.equal(hidden.total, visibleTotal - 1)
        assert.ok(!JSON.stringify(hidden).includes(conversationId))
        await db.block.delete({ where: { id: block.id } })
      }
      await db.profile.create({ data: { userId: target, visibility: 'PRIVATE' } })
      assert.equal(await state(), undefined)
      await db.profile.delete({ where: { userId: target } })
      await db.planet.update({ where: { id: planet.id }, data: { active: false } })
      assert.equal(await state(), undefined)
      await db.planet.update({ where: { id: planet.id }, data: { active: true } })
      await db.user.update({ where: { id: target }, data: { deletedAt: new Date() } })
      assert.equal(await state(), undefined)
      await db.user.update({ where: { id: target }, data: { deletedAt: null } })
      assert.equal((await state()).conversationId, conversationId)
      await removeSaved.DELETE(request(), { params: Promise.resolve({ planetId: planet.id }) })
      assert.equal((await state()).saved, false)
      await db.user.deleteMany({ where: { id: { in: [viewer, target, other] } } })
    })
    await t.test('personal map collections, permissions and lifecycle on real SQL', async (t) => {
      const viewer = 'personal-viewer', outsider = 'personal-outsider'
      const ids = [viewer, outsider, 'personal-saved', 'personal-followed', 'personal-both', 'personal-incoming', 'personal-chat', 'personal-private']
      for (const id of ids) await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
      const planets = new Map()
      for (const id of ids) planets.set(id, await db.planet.create({ data: { userId: id, name: `Personal fixture ${id}`, mood: id === 'personal-followed' ? 'cold' : 'calm' } }))
      const map = (collection = 'all', extra = '') => starMap.GET(new Request(`https://example.test/api?mode=personal&collection=${collection}&search=Personal%20fixture${extra}`))
      const data = async (...args) => (await (await map(...args)).json())
      const names = async (...args) => (await data(...args)).nodes.map(n => n.userId).sort()
      as(viewer)
      for (const id of ['personal-saved', 'personal-both', 'personal-private']) await saved.POST(request({ planetId: planets.get(id).id }))
      for (const id of ['personal-followed', 'personal-both']) await follows.POST(request({ userId: id }))
      await db.follow.createMany({ data: [
        { followerId: 'personal-both', followingId: viewer },
        { followerId: 'personal-incoming', followingId: viewer },
      ] })
      await db.conversationThread.create({ data: { userAId: viewer, userBId: 'personal-chat' } })
      try {
        await t.test('collections deduplicate saves and outgoing follows, excluding own, incoming-only and chat-only', async () => {
          assert.deepEqual(await names(), ['personal-both', 'personal-followed', 'personal-private', 'personal-saved'])
          assert.deepEqual(await names('saved'), ['personal-both', 'personal-private', 'personal-saved'])
          assert.deepEqual(await names('following'), ['personal-both', 'personal-followed'])
          assert.deepEqual(await names('mutual'), ['personal-both'])
          const response = await map()
          assert.equal(response.headers.get('cache-control'), 'private, no-store')
          const result = await response.json()
          assert.equal(result.scope, 'personal')
          assert.equal(result.total, result.nodes.length)
          assert.equal(result.groups.reduce((sum,g) => sum + g.count,0), result.total)
          assert.equal((await data('all', '&group=cold')).nodes[0].userId, 'personal-followed')
        })
        await t.test('owner isolation and strict query authentication', async () => {
          as(outsider)
          assert.equal((await data()).total, 0)
          as(null)
          assert.equal((await map()).status, 401)
          as(viewer)
          assert.equal((await map('unknown')).status, 400)
          assert.equal((await starMap.GET(new Request('https://example.test/api?mode=discover&collection=saved'))).status,400)
          assert.equal((await starMap.GET(new Request('https://example.test/api?mode=personal&userId=personal-outsider'))).status,400)
        })
        await t.test('PRIVATE follows match profile visibility; saves alone do not grant access', async () => {
          await db.profile.create({ data: { userId: 'personal-private', visibility: 'PRIVATE' } })
          assert.ok(!(await names()).includes('personal-private'))
          await db.follow.create({ data: { followerId: 'personal-private', followingId: viewer } })
          assert.ok((await names()).includes('personal-private'))
          const discovery = await (await starMap.GET(new Request('https://example.test/api?mode=discover&search=Personal%20fixture'))).json()
          assert.ok(!discovery.nodes.some(n => n.userId === 'personal-private'))
          await db.follow.deleteMany({ where: { followerId: 'personal-private', followingId: viewer } })
          assert.ok(!(await names()).includes('personal-private'))
          assert.equal(await db.savedPlanet.count({ where: { userId: viewer, planetId: planets.get('personal-private').id } }), 1)
          await db.profile.delete({ where: { userId: 'personal-private' } })
        })
        await t.test('both-direction blocks hide nodes, counts, avatars and relationship metadata', async () => {
          for (const [blockerId, blockedId] of [[viewer,'personal-both'],['personal-both',viewer]]) {
            const block = await db.block.create({ data: { blockerId, blockedId } })
            const result = await data()
            assert.equal(result.total,3)
            assert.ok(!JSON.stringify(result).includes('personal-both'))
            await db.block.delete({ where: { id: block.id } })
          }
        })
        await t.test('inactive and deleted targets disappear; fresh custom avatars resolve', async () => {
          const target = planets.get('personal-both')
          await db.planet.update({ where: { id: target.id }, data: { active: false } })
          assert.ok(!(await names()).includes('personal-both'))
          await db.planet.update({ where: { id: target.id }, data: { active: true } })
          await db.user.update({ where: { id: 'personal-both' }, data: { deletedAt: new Date() } })
          assert.ok(!(await names()).includes('personal-both'))
          await db.user.update({ where: { id: 'personal-both' }, data: { deletedAt: null, planetCustomTexture: 'https://example.test/personal-new.png' } })
          assert.equal((await data()).nodes.find(n => n.userId === 'personal-both').planetConfig.customTextureUrl, 'https://example.test/personal-new.png')
          await db.user.update({ where: { id: viewer }, data: { deletedAt: new Date() } })
          assert.equal((await map()).status,401)
          await db.user.update({ where: { id: viewer }, data: { deletedAt: null } })
        })
        await t.test('real save/follow removals update membership independently without new notices', async () => {
          const notices = await db.notification.count()
          await removeSaved.DELETE(request(), { params: Promise.resolve({ planetId: planets.get('personal-both').id }) })
          assert.ok((await names()).includes('personal-both'))
          assert.ok(!(await names('saved')).includes('personal-both'))
          await followStatus.DELETE(request(), { params: Promise.resolve({ userId: 'personal-both' }) })
          assert.ok(!(await names()).includes('personal-both'))
          assert.equal(await db.notification.count(), notices)
          assert.equal(await db.directMessage.count({ where: { conversation: { OR: [{ userAId: viewer }, { userBId: viewer }] } } }), 0)
        })
        await t.test('large collections use bounded stable pages without missing or duplicate nodes', async () => {
          const moreIds = Array.from({length:40}, (_,i) => `personal-page-${String(i).padStart(2,'0')}`)
          for (const id of moreIds) {
            await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
            const p = await db.planet.create({ data: { userId:id, name:`Personal fixture ${id}` } })
            await db.savedPlanet.create({ data: { userId:viewer, planetId:p.id } })
          }
          try {
            const first = await data('saved'), second = await data('saved', `&cursor=${first.nextCursor}`)
            assert.equal(first.nodes.length,36)
            assert.ok(second.nodes.length > 0 && second.nodes.length <= 36)
            assert.equal(second.nextCursor,null)
            const all = [...first.nodes,...second.nodes].map(n => n.id)
            assert.equal(all.length,first.total)
            assert.equal(new Set(all).size,first.total)
            const emptySearch = await data('saved','&search=zzzz-not-found')
            assert.equal(emptySearch.nodes.length,0)
            assert.equal(emptySearch.total,first.total)
            assert.deepEqual(emptySearch.groups,first.groups)
          } finally { await db.user.deleteMany({ where: { id: { in: moreIds } } }) }
        })
      } finally { await db.user.deleteMany({ where: { id: { in: ids } } }); as('owner') }
    })
    await t.test('personal context layers enforce real membership, event states and bounded owner-only reads', async t => {
      const viewer='mapctx-viewer', owner='mapctx-owner', outsider='mapctx-outsider', deleted='mapctx-deleted'
      for (const id of [viewer,owner,outsider,deleted]) await db.user.create({data:{id,name:id,email:`${id}@example.test`,...(id===deleted?{deletedAt:new Date()}:{})}})
      const own=await db.community.create({data:{name:'Map context owned',slug:'mapctx-owned',creatorId:viewer}})
      const joined=await db.community.create({data:{name:'Map context joined',slug:'mapctx-joined',creatorId:owner}})
      const orphan=await db.community.create({data:{name:'Map context unowned',slug:'mapctx-unowned'}})
      const foreign=await db.community.create({data:{name:'Map context pending',slug:'mapctx-pending',creatorId:owner}})
      await db.communityMembership.createMany({data:[{communityId:joined.id,userId:viewer},{communityId:joined.id,userId:owner},{communityId:joined.id,userId:deleted},{communityId:orphan.id,userId:viewer}]})
      await db.communityJoinRequest.create({data:{communityId:foreign.id,userId:viewer,status:'PENDING'}})
      const read=(layer,extra='')=>starMap.GET(new Request(`https://example.test/api?mode=personal&layer=${layer}${extra}`))
      const data=async(layer,extra='')=>(await read(layer,extra)).json()
      const create=(name,extra={})=>db.event.create({data:{title:`Map context ${name}`,description:'Fixture',date:new Date('2030-01-01'),category:'ONLINE',status:'APPROVED',galaxyId:joined.id,proposerId:owner,...extra}})
      const interested=await create('interest'), going=await create('going'), pending=await create('pending'), rejected=await create('rejected'), ended=await create('ended',{date:new Date('2020-01-01')}), cancelled=await create('cancelled',{status:'CANCELLED'}), withdrawn=await create('withdrawn'), proposal=await create('proposal',{status:'PENDING'}), other=await create('foreign',{galaxyId:foreign.id})
      await create('unrelated')
      await db.eventInterest.createMany({data:[interested,going,pending,rejected,ended,cancelled,proposal,other].map(e=>({eventId:e.id,userId:viewer}))})
      await db.eventRSVP.createMany({data:[{eventId:going.id,userId:viewer,status:'APPROVED'},{eventId:pending.id,userId:viewer,status:'PENDING'},{eventId:rejected.id,userId:viewer,status:'REJECTED'},{eventId:withdrawn.id,userId:viewer,status:'CANCELLED'}]})
      as(viewer)
      try {
        await t.test('pending galaxy applications are excluded; creators and unowned joined galaxies count once',async()=>{
          const result=await data('galaxies')
          assert.equal(result.total,3)
          assert.deepEqual(result.nodes.map(n=>n.id).sort(),[own.id,joined.id,orphan.id].sort())
          assert.equal(result.nodes.find(n=>n.id===joined.id).memberCount,2)
          assert.deepEqual(result.nodes.find(n=>n.id===own.id).galaxyRelationship,{created:true,joined:false})
          assert.deepEqual(result.nodes.find(n=>n.id===joined.id).galaxyRelationship,{created:false,joined:true})
          assert.deepEqual(result.nodes.find(n=>n.id===orphan.id).galaxyRelationship,{created:false,joined:true})
          assert.ok(!('memberships' in result.nodes.find(n=>n.id===joined.id)))
          assert.equal(result.groups.find(g=>g.id==='joined').count,2)
          assert.equal((await data('galaxies','&group=owned')).nodes[0].id,own.id)
          assert.equal((await read('galaxies')).headers.get('cache-control'),'private, no-store')
        })
        await t.test('creation and membership remain independent relations without duplicating a galaxy',async()=>{
          const membership=await db.communityMembership.create({data:{communityId:own.id,userId:viewer}})
          const result=await data('galaxies')
          assert.equal(result.total,3)
          assert.equal(result.nodes.filter(n=>n.id===own.id).length,1)
          assert.deepEqual(result.nodes.find(n=>n.id===own.id).galaxyRelationship,{created:true,joined:true})
          await db.communityMembership.delete({where:{id:membership.id}})
          assert.deepEqual((await data('galaxies')).nodes.find(n=>n.id===own.id).galaxyRelationship,{created:true,joined:false})
        })
        await t.test('interest and attendance deduplicate, with pending and rejected states distinct from approval',async()=>{
          const result=await data('activities'), byId=new Map(result.nodes.map(n=>[n.id,n]))
          assert.equal(result.total,7); assert.equal(byId.size,7)
          assert.equal(result.groups.reduce((sum,g)=>sum+g.count,0),7)
          assert.equal(byId.get(going.id).groupId,'going'); assert.equal(byId.get(going.id).userInterested,true)
          assert.equal(byId.get(pending.id).groupId,'requested'); assert.equal(byId.get(pending.id).userAttendance,'PENDING')
          assert.equal(byId.get(rejected.id).groupId,'interested'); assert.equal(byId.get(rejected.id).userAttendance,'REJECTED')
          assert.equal(byId.get(ended.id).eventStatus,'PASSED'); assert.equal(byId.get(cancelled.id).eventStatus,'CANCELLED')
          assert.equal(byId.get(withdrawn.id).groupId,'past')
          assert.ok(!byId.has(proposal.id)); assert.ok(!byId.has(other.id))
          assert.equal((await data('activities','&group=going')).nodes[0].id,going.id)
          assert.equal(byId.get(going.id).href,`/galaxy/mapctx-joined?event=${going.id}#events`)
          assert.ok(!JSON.stringify(result).includes('planetConfig'))
        })
        await t.test('real interest removal and approval move the same node without adding relationships',async()=>{
          assert.equal((await interest.DELETE(request(),context(joined.id,pending.id))).status,204)
          assert.equal((await data('activities')).nodes.find(n=>n.id===pending.id).userInterested,false)
          assert.equal((await data('activities')).nodes.find(n=>n.id===pending.id).groupId,'requested')
          as(owner)
          assert.equal((await attendees.PATCH(request({userId:viewer,status:'APPROVED'}),context(joined.id,pending.id))).status,200)
          as(viewer)
          assert.equal((await data('activities')).nodes.find(n=>n.id===pending.id).groupId,'going')
          assert.equal((await data('constellations')).nodes.find(n=>n.id===pending.id).activityState,'going')
          assert.equal((await data('constellations')).nodes.find(n=>n.id===pending.id).userInterested,false)
        })
        await t.test('activity star groups use real galaxies and preserve independent attendance with bounded batch counts',async()=>{
          const result=await data('constellations')
          assert.equal(result.total,7);assert.equal(result.groupScope,'batch')
          assert.equal(result.groups.length,2)
          assert.equal(result.groups.find(g=>g.phase==='active').id,`active:${joined.id}`)
          assert.equal(result.groups.find(g=>g.phase==='active').count,4)
          assert.equal(result.groups.find(g=>g.phase==='past').count,3)
          assert.equal(result.groups.reduce((sum,g)=>sum+g.count,0),result.nodes.length)
          assert.equal(new Set(result.nodes.map(n=>n.id)).size,7)
          assert.equal(result.nodes.find(n=>n.id===going.id).activityState,'going')
          assert.equal(result.nodes.find(n=>n.id===going.id).userInterested,true)
          assert.equal(result.nodes.find(n=>n.id===rejected.id).activityState,'interested')
          assert.ok(!JSON.stringify(result).includes('proposerId'))
          const focused=await data('constellations',`&group=history:${joined.id}`)
          assert.equal(focused.nodes.length,3)
          assert.ok(focused.nodes.every(n=>n.activityState==='past'))
          assert.equal((await data('constellations',`&group=active:${foreign.id}`)).nodes.length,0)
          for(const extra of ['&group=going','&group=active:','&group=active:bad%2Fid','&collection=all','&userId=mapctx-owner']) assert.equal((await read('constellations',extra)).status,400,extra)
        })
        await t.test('star group interest, join review, withdrawal and lifecycle run through real handlers',async()=>{
          const fresh=await create('star group lifecycle',{requiresApproval:true})
          const find=async()=> (await data('constellations')).nodes.find(n=>n.id===fresh.id)
          assert.equal(await find(),undefined)
          assert.equal((await interest.POST(request(),context(joined.id,fresh.id))).status,200)
          assert.equal((await find()).activityState,'interested')
          assert.equal((await interest.DELETE(request(),context(joined.id,fresh.id))).status,204)
          assert.equal(await find(),undefined)
          assert.equal((await rsvp.POST(request(),context(joined.id,fresh.id))).status,200)
          assert.equal((await find()).activityState,'requested')
          as(owner)
          assert.equal((await attendees.PATCH(request({userId:viewer,status:'APPROVED'}),context(joined.id,fresh.id))).status,200)
          as(viewer)
          assert.equal((await find()).activityState,'going')
          assert.equal((await rsvp.DELETE(request(),context(joined.id,fresh.id))).status,200)
          assert.equal((await find()).groupId,`history:${joined.id}`)
          assert.equal((await find()).userAttendance,'CANCELLED')
          await db.event.delete({where:{id:fresh.id}})
          const before=await db.notification.count()
          await db.event.update({where:{id:going.id},data:{date:new Date('2020-01-01')}})
          assert.equal((await data('constellations')).nodes.find(n=>n.id===going.id).groupId,`history:${joined.id}`)
          assert.equal((await read('constellations',`&group=active:${joined.id}&cursor=${going.id}`)).status,400)
          await db.event.update({where:{id:going.id},data:{date:new Date('2030-01-01'),status:'CANCELLED'}})
          assert.equal((await data('constellations')).nodes.find(n=>n.id===going.id).activityState,'past')
          assert.equal(await db.notification.count(),before)
          await db.event.update({where:{id:going.id},data:{status:'APPROVED'}})
        })
        await t.test('both block directions and deleted organizers remove target metadata and totals',async()=>{
          for (const [blockerId,blockedId] of [[viewer,owner],[owner,viewer]]) {
            const block=await db.block.create({data:{blockerId,blockedId}})
            assert.equal((await data('activities')).total,0)
            assert.equal((await data('constellations')).groups.length,0)
            assert.ok(!(await data('galaxies')).nodes.some(n=>n.id===joined.id))
            await db.block.delete({where:{id:block.id}})
          }
          await db.user.update({where:{id:owner},data:{deletedAt:new Date()}})
          assert.equal((await data('activities')).total,0)
          assert.equal((await data('constellations')).groups.length,0)
          await db.user.update({where:{id:owner},data:{deletedAt:null}})
        })
        await t.test('leaving hides event references while retaining interest for possible rejoining',async()=>{
          assert.equal((await leave.POST(request(),context(joined.id))).status,200)
          assert.equal((await data('activities')).total,0)
          assert.equal((await data('constellations')).groups.length,0)
          assert.ok(await db.eventInterest.findFirst({where:{userId:viewer,eventId:interested.id}}))
          await db.communityMembership.create({data:{userId:viewer,communityId:joined.id}})
          assert.ok((await data('activities')).nodes.some(n=>n.id===interested.id))
          assert.ok((await data('constellations')).nodes.some(n=>n.id===interested.id))
        })
        await t.test('query validation, owner isolation and live viewer authentication',async()=>{
          as(outsider); assert.equal((await data('activities')).total,0); assert.equal((await data('galaxies')).total,0)
          as(null); assert.equal((await read('activities')).status,401)
          as(viewer)
          for (const extra of ['&group=calm','&group=owned','&collection=all','&userId=mapctx-owner','&layer=wrong','&search='+'x'.repeat(81)]) assert.equal((await read('activities',extra)).status,400,extra)
          assert.equal((await starMap.GET(new Request('https://example.test/api?mode=discover&layer=activities'))).status,400)
          await db.user.update({where:{id:viewer},data:{deletedAt:new Date()}})
          assert.equal((await read('activities')).status,401)
          await db.user.update({where:{id:viewer},data:{deletedAt:null}})
        })
        await t.test('bounded pagination uses permitted anchors and recovers after a deleted anchor',async()=>{
          await db.community.createMany({data:Array.from({length:27},(_,i)=>({id:`mapctx-page-${String(i).padStart(2,'0')}`,name:'Map context batch',slug:`mapctx-page-${i}`,creatorId:viewer}))})
          const first=await data('galaxies','&search=batch'),second=await data('galaxies',`&search=batch&cursor=${first.nextCursor}`)
          assert.equal(first.nodes.length,24);assert.equal(second.nodes.length,3);assert.equal(first.total,27)
          assert.equal(new Set([...first.nodes,...second.nodes].map(n=>n.id)).size,27)
          assert.equal((await read('galaxies',`&cursor=${foreign.id}`)).status,400)
          await db.community.delete({where:{id:first.nextCursor}})
          assert.equal((await read('galaxies',`&search=batch&cursor=${first.nextCursor}`)).status,400)
        })
        await t.test('star group pages remain bounded and isolate galaxy anchors across batches',async()=>{
          const items=[]
          for(let i=0;i<27;i++) items.push(await create(`star-batch ${i}`,{id:`mapctx-star-${String(i).padStart(2,'0')}`}))
          const another=await create('star-batch own',{galaxyId:own.id,proposerId:viewer})
          items.push(another)
          await db.eventInterest.createMany({data:items.map(e=>({eventId:e.id,userId:viewer}))})
          const first=await data('constellations','&search=star-batch')
          const second=await data('constellations',`&search=star-batch&cursor=${first.nextCursor}`)
          assert.equal(first.total,28);assert.equal(first.nodes.length,24);assert.equal(second.nodes.length,4)
          assert.equal(new Set([...first.nodes,...second.nodes].map(n=>n.id)).size,28)
          for(const page of [first,second]) assert.equal(page.groups.reduce((sum,g)=>sum+g.count,0),page.nodes.length)
          const ownPage=await data('constellations',`&search=star-batch&group=active:${own.id}`)
          assert.deepEqual(ownPage.nodes.map(n=>n.id),[another.id])
          assert.equal((await read('constellations',`&search=star-batch&group=active:${joined.id}&cursor=${another.id}`)).status,400)
          await db.event.deleteMany({where:{id:{in:items.map(e=>e.id)}}})
          assert.equal((await read('constellations',`&search=star-batch&cursor=${first.nextCursor}`)).status,400)
          assert.equal((await data('constellations','&search=star-batch')).groups.length,0)
        })
      } finally {await db.community.deleteMany({where:{slug:{startsWith:'mapctx-'}}});await db.user.deleteMany({where:{id:{in:[viewer,owner,outsider,deleted]}}});as('owner')}
    })
    await t.test('personal map center stays owner-only, live and separate from collection counts', async t => {
      const viewer='center-viewer', target='center-target', outsider='center-outsider'
      for (const id of [viewer,target,outsider]) await db.user.create({data:{id,name:id,email:`${id}@example.test`}})
      const own=await db.planet.create({data:{userId:viewer,name:'Private center fixture',active:true}})
      const other=await db.planet.create({data:{userId:target,name:'Saved center target fixture',active:true}})
      await db.profile.create({data:{userId:viewer,visibility:'PRIVATE'}})
      await db.savedPlanet.create({data:{userId:viewer,planetId:other.id}})
      await db.user.update({where:{id:viewer},data:{planetCustomTexture:'https://example.test/center-original.png',planetHasRing:true}})
      const read=layer=>starMap.GET(new Request(`https://example.test/api?mode=personal&layer=${layer}`))
      const data=async layer=>(await read(layer)).json()
      as(viewer)
      try {
        await t.test('all personal layers expose the current owner center but do not count it as a node',async()=>{
          for (const layer of ['planets','galaxies','activities']) {
            const result=await data(layer)
            assert.equal(result.selfPlanet.id,own.id)
            assert.equal(result.selfPlanet.name,own.name)
            assert.equal(result.selfPlanet.href,"/my-planet")
            assert.equal(result.selfPlanet.planetConfig.customTextureUrl,'https://example.test/center-original.png')
            assert.equal(result.selfPlanet.planetConfig.hasRing,false)
            assert.ok(!result.nodes.some(n=>n.id===own.id))
            assert.equal(result.total,layer==='planets'?1:0)
            assert.equal(result.groups.reduce((sum,g)=>sum+g.count,0),result.total)
            assert.equal((await read(layer)).headers.get('cache-control'),'private, no-store')
          }
          const filtered=await starMap.GET(new Request('https://example.test/api?mode=personal&collection=mutual&search=No-match')).then(r=>r.json())
          assert.equal(filtered.total,0);assert.equal(filtered.selfPlanet.id,own.id)
        })
        await t.test('other readers cannot select or see a private owner center through map parameters',async()=>{
          as(outsider)
          const result=await data('planets')
          assert.equal(result.selfPlanet,null)
          assert.ok(!JSON.stringify(result).includes(own.id));assert.ok(!JSON.stringify(result).includes('center-original.png'))
          assert.equal((await starMap.GET(new Request(`https://example.test/api?mode=personal&userId=${viewer}`))).status,400)
          as(null);assert.equal((await read('planets')).status,401)
          as(viewer)
          for (const mode of ['discover','galaxies']) {
            const global=await starMap.GET(new Request(`https://example.test/api?mode=${mode}`)).then(r=>r.json())
            if (mode === 'discover') assert.equal(global.selfPlanet.id,own.id)
            else assert.equal(global.selfPlanet,undefined)
          }
        })
        await t.test('fresh avatar and name changes replace the center without writes or notifications',async()=>{
          const notices=await db.notification.count(), relationships=await db.savedPlanet.count({where:{userId:viewer}})
          await db.user.update({where:{id:viewer},data:{planetCustomTexture:'https://example.test/center-updated.png'}})
          await db.planet.update({where:{id:own.id},data:{name:'Renamed center fixture'}})
          const result=await data('activities')
          assert.equal(result.selfPlanet.name,'Renamed center fixture')
          assert.equal(result.selfPlanet.planetConfig.customTextureUrl,'https://example.test/center-updated.png')
          assert.equal(await db.notification.count(),notices)
          assert.equal(await db.savedPlanet.count({where:{userId:viewer}}),relationships)
        })
        await t.test('inactive or replaced owner planets do not suppress personal collections',async()=>{
          await db.planet.update({where:{id:own.id},data:{active:false}})
          const inactive=await data('planets')
          assert.equal(inactive.selfPlanet,null);assert.equal(inactive.total,1)
          const replacement=await db.planet.create({data:{userId:viewer,name:'Replacement center fixture',active:true}})
          assert.equal((await data('galaxies')).selfPlanet.id,replacement.id)
          await db.user.update({where:{id:viewer},data:{deletedAt:new Date()}})
          assert.equal((await read('activities')).status,401)
        })
      } finally {await db.user.deleteMany({where:{id:{in:[viewer,target,outsider]}}});as('owner')}
    })
    await t.test(
      'star map bounded pages have no missing or duplicate planet nodes',
      async () => {
        as('owner')
        const visibleTotal = (await (await starMap.GET(new Request('https://example.com/api?mode=discover'))).json()).total
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
        assert.equal(first.total, visibleTotal + 40)
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
    await t.test('activity review hub respects roles, approvals, cancellation and privacy', async (t) => {
      const ids = ['review-owner','review-organizer','review-admin','review-attendee','review-hidden','review-outsider']
      for (const id of ids) await db.user.create({ data: { id,name:id,email:`${id}@example.test` } })
      const galaxy = await db.community.create({ data: { name:'Review hub fixture',slug:'review-hub-fixture',creatorId:ids[0] } })
      for (const id of ids.slice(0,-1)) await db.communityMembership.create({ data: { communityId:galaxy.id,userId:id,role: ['review-owner','review-admin'].includes(id) ? 'ADMIN' : 'MEMBER' } })
      const pending = await db.event.create({ data: { ...eventData, galaxyId:galaxy.id,proposerId:'review-organizer',title:'Review proposal',date:new Date('2030-01-01'),status:'PENDING' } })
      const active = await db.event.create({ data: { ...eventData,galaxyId:galaxy.id,proposerId:'review-organizer',title:'Review attendance',date:new Date('2030-01-02'),status:'APPROVED',maxAttendees:1 } })
      const list = (status='review') => summary.GET(new Request(`https://example.test/api?status=${status}&search=Review`))
      const data = async (...args) => (await (await list(...args)).json())
      try {
        as('review-attendee')
        assert.equal((await rsvp.POST(request(),context(galaxy.id,active.id))).status,200)
        as('review-hidden')
        await rsvp.POST(request(),context(galaxy.id,active.id))
        await t.test('admin proposal queue and organizer attendance queue stay distinct', async () => {
          as('review-owner')
          const response = await list()
          assert.equal(response.headers.get('cache-control'),'private, no-store')
          const events = (await response.json()).events
          assert.deepEqual(events.map(e => e.id).sort(),[pending.id,active.id].sort())
          assert.ok(events.every(e => e.canReviewEvent && e.canManage))
          assert.equal(events.find(e => e.id === active.id).pendingAttendanceCount,2)
          assert.ok(!Object.hasOwn(events[0].galaxy,'memberships'))
          as('review-organizer')
          const mine = await data()
          assert.deepEqual(mine.events.map(e => e.id),[active.id])
          assert.equal(mine.events[0].canReviewEvent,false)
          assert.equal(mine.events[0].canManage,true)
          assert.equal((await status.PATCH(request({status:'APPROVED'}),context(galaxy.id,pending.id))).status,403)
          as('review-attendee')
          assert.equal((await data()).total,0)
          const own = await data('requests')
          assert.equal(own.events[0].id,active.id)
          assert.ok(!Object.hasOwn(own.events[0],'pendingAttendanceCount'))
          as('review-outsider')
          assert.equal((await data()).total,0)
          as(null)
          assert.equal((await list()).status,401)
        })
        await t.test('proposal approval clears the queue and rejection resubmission remains visible', async () => {
          as('review-admin')
          assert.equal((await status.PATCH(request({status:'REJECTED',rejectionReason:'Review fixture'}),context(galaxy.id,pending.id))).status,200)
          assert.ok(!(await data()).events.some(e => e.id === pending.id))
          as('review-organizer')
          assert.equal((await event.PATCH(request({...eventData,title:'Review proposal',date:'2030-01-01T00:00:00Z'}),context(galaxy.id,pending.id))).status,200)
          as('review-owner')
          assert.ok((await data()).events.some(e => e.id === pending.id))
          assert.equal((await status.PATCH(request({status:'APPROVED'}),context(galaxy.id,pending.id))).status,200)
          assert.ok(!(await data()).events.some(e => e.id === pending.id))
        })
        await t.test('both-direction blocks exclude pending people from counts and management responses', async () => {
          as('review-organizer')
          for (const [blockerId,blockedId] of [['review-organizer','review-hidden'],['review-hidden','review-organizer']]) {
            const b = await db.block.create({data:{blockerId,blockedId}})
            assert.equal((await data()).events[0].pendingAttendanceCount,1)
            const response = await attendees.GET(request(),context(galaxy.id,active.id))
            assert.equal(response.headers.get('cache-control'),'private, no-store')
            assert.ok(!JSON.stringify(await response.json()).includes('review-hidden'))
            assert.equal((await attendees.PATCH(request({userId:'review-hidden',status:'APPROVED'}),context(galaxy.id,active.id))).status,404)
            await db.block.delete({where:{id:b.id}})
          }
          await db.user.update({where:{id:'review-hidden'},data:{deletedAt:new Date()}})
          assert.equal((await data()).events[0].pendingAttendanceCount,1)
          assert.equal((await attendees.PATCH(request({userId:'review-hidden',status:'APPROVED'}),context(galaxy.id,active.id))).status,404)
          await db.user.update({where:{id:'review-hidden'},data:{deletedAt:null}})
        })
        await t.test('attendee approval obeys capacity; rejection clears queue; cancellation enters history', async () => {
          as('review-organizer')
          assert.equal((await attendees.PATCH(request({userId:'review-attendee',status:'APPROVED'}),context(galaxy.id,active.id))).status,200)
          assert.equal((await data()).events[0].pendingAttendanceCount,1)
          assert.equal((await attendees.PATCH(request({userId:'review-hidden',status:'APPROVED'}),context(galaxy.id,active.id))).status,409)
          assert.equal((await db.eventRSVP.findUnique({where:{eventId_userId:{eventId:active.id,userId:'review-hidden'}}})).status,'PENDING')
          assert.equal((await attendees.PATCH(request({userId:'review-hidden',status:'REJECTED'}),context(galaxy.id,active.id))).status,200)
          assert.equal((await data()).total,0)
          as('review-attendee')
          assert.equal((await data('going')).events[0].id,active.id)
          as('review-organizer')
          assert.equal((await event.DELETE(request(),context(galaxy.id,active.id))).status,200)
          as('review-attendee')
          assert.equal((await data('going')).total,0)
          assert.equal((await data('passed')).events[0].status,'CANCELLED')
        })
        await t.test('galaxy map counts living memberships, not pending applications or rendered planets', async () => {
          as('review-owner')
          await db.communityJoinRequest.create({data:{communityId:galaxy.id,userId:'review-outsider',status:'PENDING'}})
          const map = async () => (await (await starMap.GET(new Request('https://example.test/api?mode=galaxies&search=Review%20hub%20fixture'))).json())
          assert.equal((await map()).nodes[0].memberCount,5)
          assert.equal((await map()).groups[0].count,5)
          assert.equal((await map()).nodes.length,1)
          assert.ok(!JSON.stringify(await map()).includes('review-attendee'))
          await db.user.update({where:{id:'review-hidden'},data:{deletedAt:new Date()}})
          assert.equal((await map()).nodes[0].memberCount,4)
          await db.user.update({where:{id:'review-hidden'},data:{deletedAt:null}})
        })
        await t.test('review-role revocation, blocked proposer and deleted actor cannot bypass direct routes', async () => {
          await db.event.update({where:{id:pending.id},data:{status:'PENDING'}})
          as('review-admin')
          assert.equal((await data()).total,1)
          await db.communityMembership.update({where:{userId_communityId:{userId:'review-admin',communityId:galaxy.id}},data:{role:'MEMBER'}})
          assert.equal((await data()).total,0)
          assert.equal((await status.PATCH(request({status:'APPROVED'}),context(galaxy.id,pending.id))).status,403)
          as('review-owner')
          const b = await db.block.create({data:{blockerId:'review-organizer',blockedId:'review-owner'}})
          assert.equal((await data()).total,0)
          assert.equal((await attendees.GET(request(),context(galaxy.id,pending.id))).status,404)
          assert.equal((await status.PATCH(request({status:'APPROVED'}),context(galaxy.id,pending.id))).status,404)
          await db.block.delete({where:{id:b.id}})
          await db.user.update({where:{id:'review-owner'},data:{deletedAt:new Date()}})
          assert.equal((await list()).status,401)
          assert.equal((await status.PATCH(request({status:'APPROVED'}),context(galaxy.id,pending.id))).status,401)
          assert.equal((await attendees.GET(request(),context(galaxy.id,pending.id))).status,401)
        })
      } finally {
        await db.community.delete({where:{id:galaxy.id}})
        await db.user.deleteMany({where:{id:{in:ids}}})
        as('owner')
      }
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
    await t.test('both community reply likes enforce scope/privacy and idempotent state, serialize counts, export and cascade', async () => {
      const parentAuthor = 'reply-like-parent', replyAuthor = 'reply-like-author', viewer = 'reply-like-viewer', second = 'reply-like-second'
      for (const id of [parentAuthor, replyAuthor, viewer, second])
        await db.user.create({ data: { id, name: id, email: `${id}@example.test` } })
      const g = await db.community.create({ data: { ...galaxyData, slug: 'reply-likes', creatorId: parentAuthor } })
      await db.communityMembership.createMany({ data: [parentAuthor, replyAuthor, viewer, second].map(userId => ({ communityId: g.id, userId })) })
      const p = await db.communityPost.create({ data: { communityId: g.id, authorId: parentAuthor, content: 'Like target post' } })
      const d = await db.communityDiscussion.create({ data: { communityId: g.id, authorId: parentAuthor, title: 'Like target discussion' } })
      const pReply = await db.communityPostReply.create({ data: { postId: p.id, authorId: replyAuthor, content: 'Post reply' } })
      const dReply = await db.communityDiscussionReply.create({ data: { discussionId: d.id, authorId: replyAuthor, authorName: 'Snapshot', content: 'Discussion reply' } })
      const otherGalaxy = await db.community.create({ data: { ...galaxyData, slug: 'reply-likes-other', creatorId: parentAuthor } })
      await db.communityMembership.create({ data: { communityId: otherGalaxy.id, userId: viewer } })
      const otherPost = await db.communityPost.create({ data: { communityId: g.id, authorId: parentAuthor, content: 'Other post' } })
      const otherDiscussion = await db.communityDiscussion.create({ data: { communityId: g.id, authorId: parentAuthor, title: 'Other discussion' } })
      const otherPostReply = await db.communityPostReply.create({ data: { postId: otherPost.id, authorId: replyAuthor, content: 'Other post reply' } })
      const otherDiscussionReply = await db.communityDiscussionReply.create({ data: { discussionId: otherDiscussion.id, authorId: replyAuthor, content: 'Other discussion reply' } })
      const surfaces = [
        { route: postReplyLike, edge: db.communityPostReplyLike, parent: p.id, reply: pReply.id, parentKey: 'postId', deleteReply: communityReplyDelete, deleteParent: postDelete },
        { route: discussionReplyLike, edge: db.communityDiscussionReplyLike, parent: d.id, reply: dReply.id, parentKey: 'discussionId', deleteReply: discussionReplyDelete, deleteParent: discussionDelete },
      ]
      const ctx = (s, overrides = {}) => ({ params: Promise.resolve({ id: g.id, [s.parentKey]: s.parent, replyId: s.reply, ...overrides }) })
      const set = (s, liked, overrides) => s.route.POST(request({ liked }), ctx(s, overrides))
      const before = await db.user.findUniqueOrThrow({ where: { id: viewer }, select: { xp: true } })
      const notices = await db.notification.count()
      for (const s of surfaces) {
        as(null)
        assert.equal((await set(s, true)).status, 401)
        as('outsider')
        assert.equal((await set(s, true)).status, 403)
        as(viewer)
        for (const overrides of [{ id: 'missing-galaxy' }, { [s.parentKey]: 'other-parent' }, { replyId: 'other-reply' }])
          assert.equal((await set(s, true, overrides)).status, 404)
        assert.equal((await set(s, true, { id: otherGalaxy.id })).status, 404)
        assert.equal((await set(s, true, { [s.parentKey]: s.parentKey === 'postId' ? otherPost.id : otherDiscussion.id })).status, 404)
        assert.equal((await set(s, true, { replyId: s.parentKey === 'postId' ? otherPostReply.id : otherDiscussionReply.id })).status, 404)
        assert.equal((await set(s, true, { replyId: 'x'.repeat(129) })).status, 400)
        assert.equal((await s.route.POST(request({ liked: true, extra: true }), ctx(s))).status, 400)
        assert.equal((await s.route.POST(request({ liked: 'true' }), ctx(s))).status, 400)
        assert.equal((await s.route.POST(new Request('https://example.test/api', { method: 'POST', body: '{' }), ctx(s))).status, 400)
        assert.equal((await s.route.POST(request({ liked: true, padding: 'x'.repeat(65536) }), ctx(s))).status, 413)
        for (const target of [parentAuthor, replyAuthor]) {
          for (const reverse of [false, true]) {
            const b = await db.block.create({ data: { blockerId: reverse ? target : viewer, blockedId: reverse ? viewer : target } })
            assert.equal((await set(s, true)).status, 404)
            assert.equal((await set(s, false)).status, 404)
            await db.block.delete({ where: { id: b.id } })
          }
          await db.profile.create({ data: { userId: target, visibility: 'PRIVATE' } })
          assert.equal((await set(s, true)).status, 404)
          const f = await db.follow.create({ data: { followerId: viewer, followingId: target } })
          assert.equal((await set(s, true)).status, 200)
          await db.follow.delete({ where: { id: f.id } })
          await db.profile.delete({ where: { userId: target } })
          assert.deepEqual(await (await set(s, false)).json(), { liked: false, likes: 0 })
        }
        const attempts = await Promise.all([set(s, true), set(s, true), set(s, true)])
        for (const response of attempts) {
          assert.equal(response.status, 200)
          assert.deepEqual(await response.json(), { liked: true, likes: 1 })
        }
        assert.equal(await s.edge.count({ where: { replyId: s.reply } }), 1)
        as(replyAuthor)
        assert.deepEqual(await (await set(s, true)).json(), { liked: true, likes: 2 }) // Own reply likes follow comment precedent.
        as(viewer)
      }
      assert.deepEqual((await db.user.findUniqueOrThrow({ where: { id: viewer }, select: { xp: true } })), before)
      assert.equal(await db.notification.count(), notices)
      const checkRead = async (likedByMe, likes) => {
        const posts = await (await communityPosts.GET(request(), context(g.id))).json()
        const threads = await (await discussion.GET(request(), context(g.id))).json()
        const replies = await (await communityReplies.GET(request(), { params: Promise.resolve({ id: g.id, postId: p.id }) })).json()
        for (const reply of [posts.posts.find(row => row.id === p.id).replyItems[0], threads.discussions.find(row => row.id === d.id).replyItems[0], replies.replies[0]]) {
          assert.equal(reply.likes, likes)
          assert.equal(reply.likedByMe, likedByMe)
        }
      }
      await checkRead(true, 2)
      as(null)
      await checkRead(false, 2)
      as(second)
      await checkRead(false, 2)
      as(viewer)
      const exported = await (await accountExport.GET()).json()
      for (const [key, id] of [['communityPostReplyLikes', pReply.id], ['communityDiscussionReplyLikes', dReply.id]]) {
        assert.equal(exported[key].length, 1)
        assert.equal(exported[key][0].replyId, id)
        assert.deepEqual(Object.keys(exported[key][0]).sort(), ['createdAt', 'replyId'])
      }
      for (const s of surfaces) {
        for (let i = 0; i < 2; i++) assert.deepEqual(await (await set(s, false)).json(), { liked: false, likes: 1 })
      }
      await checkRead(false, 1)
      for (const s of surfaces) {
        const table = s.parentKey === 'postId' ? 'community_post_reply_like' : 'community_discussion_reply_like'
        await pool.db.exec(`ALTER TABLE "${table}" ADD CONSTRAINT reply_like_test_failure CHECK ("userId" <> '${viewer}') NOT VALID`)
        try {
          assert.equal((await set(s, true)).status, 500)
          assert.equal(await s.edge.count({ where: { replyId: s.reply, userId: viewer } }), 0)
        } finally { await pool.db.exec(`ALTER TABLE "${table}" DROP CONSTRAINT reply_like_test_failure`) }
        assert.equal((await set(s, true)).status, 200)
      }
      const bucket = await db.rateLimitBucket.findUniqueOrThrow({ where: { bucketKey: `MESSAGE_REACTION:${viewer}` } })
      await db.rateLimitBucket.update({ where: { id: bucket.id }, data: { count: 120 } })
      for (const s of surfaces) assert.equal((await set(s, false)).status, 429)
      await db.rateLimitBucket.delete({ where: { id: bucket.id } })
      // Tombstone deletion must explicitly remove likes, because it keeps the user row.
      assert.equal((await account.DELETE(request({ confirm: true }))).status, 200)
      for (const s of surfaces) {
        assert.equal(await s.edge.count({ where: { userId: viewer } }), 0)
        assert.equal((await set(s, true)).status, 401)
      }
      as(replyAuthor)
      for (const s of surfaces) {
        assert.equal((await s.deleteReply.DELETE(request(), ctx(s))).status, 200)
        assert.equal(await s.edge.count({ where: { replyId: s.reply } }), 0)
        assert.equal((await set(s, true)).status, 404)
      }
      // Every create serializer, including a discussion's opening reply, returns real zero state.
      as(parentAuthor)
      const createdPost = await (await communityPosts.POST(request({ content: 'Fresh post' }), context(g.id))).json()
      const freshPostReply = await (await communityReplies.POST(request({ content: 'Fresh reply' }), { params: Promise.resolve({ id: g.id, postId: createdPost.post.id }) })).json()
      const createdTopic = await (await discussion.POST(request({ title: 'Fresh topic', content: 'Opening reply' }), context(g.id))).json()
      const freshTopicReply = await (await discussionReplies.POST(request({ content: 'Fresh topic reply' }), { params: Promise.resolve({ id: g.id, discussionId: createdTopic.discussion.id }) })).json()
      for (const reply of [freshPostReply.reply, createdTopic.discussion.replyItems[0], freshTopicReply.reply]) {
        assert.equal(reply.likes, 0)
        assert.equal(reply.likedByMe, false)
      }
      const fresh = [
        { ...surfaces[0], parent: createdPost.post.id, reply: freshPostReply.reply.id },
        { ...surfaces[1], parent: createdTopic.discussion.id, reply: freshTopicReply.reply.id },
      ]
      for (const s of fresh) {
        assert.equal((await set(s, true)).status, 200)
        as(second)
        assert.equal((await set(s, true)).status, 200)
        as(parentAuthor)
      }
      // Hard deletion uses FK cascades independently of the tombstone cleanup.
      await db.user.delete({ where: { id: second } })
      for (const s of fresh) {
        assert.equal(await s.edge.count({ where: { replyId: s.reply } }), 1)
        assert.equal((await s.deleteParent.DELETE(request(), ctx(s))).status, 200)
        assert.equal(await s.edge.count({ where: { replyId: s.reply } }), 0)
      }
      await db.community.delete({ where: { id: g.id } })
      await db.community.delete({ where: { id: otherGalaxy.id } })
    })
    await t.test('community publishing and replies keep pseudonyms, validation, privacy and deletion consistent', async () => {
      const g = await db.community.create({ data: { ...galaxyData, slug: 'content-integrity', creatorId: 'owner', joinPolicy: 'OPEN' } })
      await db.communityMembership.createMany({ data: ['owner', 'applicant'].map(userId => ({ communityId: g.id, userId })) })
      const postContext = postId => ({ params: Promise.resolve({ id: g.id, postId }) })
      const discussionContext = discussionId => ({ params: Promise.resolve({ id: g.id, discussionId }) })
      as(null)
      assert.equal((await communityPosts.POST(request({ content: 'Anonymous' }), context(g.id))).status, 401)
      as('outsider')
      assert.equal((await communityPosts.POST(request({ content: 'Not a member' }), context(g.id))).status, 403)
      as('owner')
      for (const content of ['x', 'x'.repeat(1001)]) assert.equal((await communityPosts.POST(request({ content }), context(g.id))).status, 400)
      assert.equal((await communityPosts.POST(request({ content: 'Valid', extra: true }), context(g.id))).status, 400)
      assert.equal((await communityPosts.POST(new Request('https://example.test/api', { method: 'POST', body: '{' }), context(g.id))).status, 400)
      const posted = await communityPosts.POST(request({ content: 'A real community signal\nSecond line' }), context(g.id))
      assert.equal(posted.status, 201)
      const { post } = await posted.json()
      assert.equal(post.author.name, 'owner')
      assert.equal(post.author.planet.name, 'owner planet')
      assert.equal(post.canDelete, true)
      const originalBucket = await db.rateLimitBucket.findUniqueOrThrow({ where: { bucketKey: 'POST_CREATE:owner' } })
      await db.rateLimitBucket.update({ where: { id: originalBucket.id }, data: { count: 30 } })
      assert.equal((await communityPosts.POST(request({ content: 'Over the exact limit' }), context(g.id))).status, 429)
      assert.equal(await db.communityPost.count({ where: { communityId: g.id } }), 1)
      await db.rateLimitBucket.update({ where: { id: originalBucket.id }, data: { count: originalBucket.count, windowStart: originalBucket.windowStart } })
      const xpBeforeFailure = (await db.user.findUniqueOrThrow({ where: { id: 'owner' } })).xp
      await pool.db.exec(`ALTER TABLE "Notification" ADD CONSTRAINT content_test_notice_failure CHECK (type <> 'GALAXY_NEW_POST') NOT VALID`)
      try {
        assert.equal((await communityPosts.POST(request({ content: 'Notification transaction failure' }), context(g.id))).status, 500)
        assert.equal(await db.communityPost.count({ where: { communityId: g.id } }), 1)
        assert.equal((await db.user.findUniqueOrThrow({ where: { id: 'owner' } })).xp, xpBeforeFailure)
      } finally {
        await pool.db.exec('ALTER TABLE "Notification" DROP CONSTRAINT content_test_notice_failure')
      }
      const opened = await discussion.POST(request({ title: 'Integrity discussion', content: 'Opening message' }), context(g.id))
      assert.equal(opened.status, 201)
      const { discussion: topic } = await opened.json()
      // Current public pseudonym wins over the stored reply snapshot.
      await db.communityDiscussionReply.updateMany({ where: { discussionId: topic.id }, data: { authorName: 'Stale snapshot' } })
      const listed = await (await discussion.GET(request(), context(g.id))).json()
      assert.equal(listed.discussions[0].replyItems[0].author.name, 'owner')
      assert.equal(listed.discussions[0].replyItems[0].author.planet.name, 'owner planet')
      as('applicant')
      const replyResult = await communityReplies.POST(request({ content: 'A real reply' }), postContext(post.id))
      assert.equal(replyResult.status, 201)
      const { reply } = await replyResult.json()
      assert.equal(reply.author.name, 'applicant')
      assert.equal(reply.author.planet.name, 'applicant planet')
      assert.equal(reply.canDelete, true)
      const discussionReplyResult = await discussionReplies.POST(request({ content: 'A discussion reply' }), discussionContext(topic.id))
      assert.equal(discussionReplyResult.status, 201)
      const { reply: topicReply } = await discussionReplyResult.json()
      assert.equal(topicReply.author.name, 'applicant')
      assert.equal(topicReply.author.planet.name, 'applicant planet')
      const replyBucket = await db.rateLimitBucket.findUniqueOrThrow({ where: { bucketKey: 'MESSAGE_SEND:applicant' } })
      await db.rateLimitBucket.update({ where: { id: replyBucket.id }, data: { count: 60 } })
      assert.equal((await communityReplies.POST(request({ content: 'Over reply limit' }), postContext(post.id))).status, 429)
      assert.equal((await discussionReplies.POST(request({ content: 'Over reply limit' }), discussionContext(topic.id))).status, 429)
      assert.equal(await db.communityPostReply.count({ where: { postId: post.id } }), 1)
      await db.rateLimitBucket.update({ where: { id: replyBucket.id }, data: { count: replyBucket.count, windowStart: replyBucket.windowStart } })
      for (const content of ['x', 'x'.repeat(601)]) {
        assert.equal((await communityReplies.POST(request({ content }), postContext(post.id))).status, 400)
        assert.equal((await discussionReplies.POST(request({ content }), discussionContext(topic.id))).status, 400)
      }
      const replyContext = { params: Promise.resolve({ id: g.id, postId: post.id, replyId: reply.id }) }
      const topicReplyContext = { params: Promise.resolve({ id: g.id, discussionId: topic.id, replyId: topicReply.id }) }
      as('outsider')
      assert.equal((await communityReplyDelete.DELETE(request(), replyContext)).status, 403)
      assert.equal((await discussionReplyDelete.DELETE(request(), topicReplyContext)).status, 403)
      as('applicant')
      assert.equal((await postDelete.DELETE(request(), postContext(post.id))).status, 403)
      assert.equal((await discussionDelete.DELETE(request(), discussionContext(topic.id))).status, 403)
      const privateProfile = await db.profile.upsert({ where: { userId: 'owner' }, create: { userId: 'owner', visibility: 'PRIVATE' }, update: { visibility: 'PRIVATE' } })
      assert.equal(privateProfile.visibility, 'PRIVATE')
      const privatePosts = await (await communityPosts.GET(request(), context(g.id))).json()
      assert.equal(privatePosts.posts[0].author.name, 'owner')
      assert.equal(privatePosts.posts[0].author.planet, null)
      await db.block.create({ data: { blockerId: 'applicant', blockedId: 'owner' } })
      assert.deepEqual((await (await communityPosts.GET(request(), context(g.id))).json()).posts, [])
      assert.deepEqual((await (await discussion.GET(request(), context(g.id))).json()).discussions, [])
      assert.equal((await communityReplies.GET(request(), postContext(post.id))).status, 404)
      assert.equal((await communityReplies.POST(request({ content: 'Blocked contact' }), postContext(post.id))).status, 404)
      assert.equal((await discussionReplies.POST(request({ content: 'Blocked contact' }), discussionContext(topic.id))).status, 404)
      assert.equal((await communityLike.POST(request(), postContext(post.id))).status, 404)
      await db.block.deleteMany({ where: { blockerId: 'applicant', blockedId: 'owner' } })
      await db.profile.update({ where: { userId: 'owner' }, data: { visibility: 'MEMBERS' } })
      assert.equal((await communityReplyDelete.DELETE(request(), { params: Promise.resolve({ id: 'wrong-galaxy', postId: post.id, replyId: reply.id }) })).status, 404)
      assert.equal((await communityReplyDelete.DELETE(request(), replyContext)).status, 200)
      assert.equal((await discussionReplyDelete.DELETE(request(), topicReplyContext)).status, 200)
      assert.equal((await communityReplies.GET(request(), postContext(post.id))).status, 200)
      assert.deepEqual((await (await communityReplies.GET(request(), postContext(post.id))).json()).replies, [])
      as('owner')
      assert.equal((await postDelete.DELETE(request(), postContext(post.id))).status, 200)
      assert.equal((await discussionDelete.DELETE(request(), discussionContext(topic.id))).status, 200)
      assert.equal(await db.communityDiscussionReply.count({ where: { discussionId: topic.id } }), 0)
      await db.community.delete({ where: { id: g.id } })
    })
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
