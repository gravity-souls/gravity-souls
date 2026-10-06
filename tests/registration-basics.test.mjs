import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { EmbeddedPool } from './helpers/pglite-pool.mjs'
const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client'), { PrismaPg } = require('@prisma/adapter-pg')
const pool = new EmbeddedPool(), db = new PrismaClient({ adapter: new PrismaPg(pool), transactionOptions: { timeout: 30000 } })
let actor = null
let deliveryConfigured = false
const verificationCalls = []
const previous = Module._load
Module._load = function(id, parent, main) {
  if (id === '@/lib/prisma') return { prisma: db }
  if (id === '@/lib/session') return { requireUser: async () => { if (!actor) throw Response.json({}, { status: 401 }); return { user: await db.user.findUniqueOrThrow({ where: { id: actor } }) } } }
  if (id === '@/lib/grantXP') return { grantXP: async () => {} }
  if (id === '@/lib/email') return { verificationEmailConfigured: () => deliveryConfigured }
  if (id === '@/lib/auth') return { auth: { api: { sendVerificationEmail: async input => { verificationCalls.push(input.body); return { status: true } } } } }
  return previous.call(this, id, parent, main)
}
const registration = require('../app/api/registration/route.ts')
const complete = require('../app/api/onboarding/complete/route.ts')
const exportData = require('../app/api/me/export/route.ts')
const planetList = require('../app/api/planets/route.ts')
const planetDetail = require('../app/api/planets/[id]/route.ts')
const starMap = require('../app/api/star-map/route.ts')
const events = require('../app/api/galaxies/events/route.ts')
const myPlanet = require('../app/api/my-planet/route.ts')
const account = require('../app/api/me/route.ts')
const emailVerification = require('../app/api/user/email-verification/route.ts')
const regions = require('../app/api/regions/route.ts')
const { isAdultBirthDate, BASIC_OPTIONS } = require('../lib/registration-basics.ts')
const request = (data, origin = 'https://test.invalid') => new Request('https://test.invalid/api/registration', { method: 'PUT', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(data) })
const draft = { selectedThemes: ['art'], abstractAxis: 50, introspectiveAxis: 50 }
const savePlanet = () => complete.POST(request({ draft }))

test('adult boundary uses real calendar dates and rejects invalid or future input', () => {
  const now = new Date('2026-10-05T12:00:00Z')
  for (const value of ['2008-10-05','2008-10-04','1996-02-29','1900-01-01']) assert.equal(isAdultBirthDate(value, now), true, value)
  for (const value of ['2008-10-06','2009-01-01','2030-01-01','2007-02-29','2000-02-30','1999-13-01','1999-00-01','1999-1-1','1899-01-01','not a date']) assert.equal(isAdultBirthDate(value, now), false, value)
  assert.equal(isAdultBirthDate('2008-02-29', new Date('2026-02-28T12:00:00Z')), false)
  assert.equal(isAdultBirthDate('2008-02-29', new Date('2026-03-01T12:00:00Z')), true)
})

test('private basics registration and edit lifecycle on real migrations and routes', async t => {
  try {
    const folders = readdirSync('prisma/migrations').filter(f => f !== 'migration_lock.toml').sort()
    for (const folder of folders) {
      if (folder === '20261005220000_registration_basics') await pool.db.exec(`INSERT INTO "user" (id, name, email, "updatedAt") VALUES ('legacy', 'Legacy', 'legacy@test.invalid', NOW())`)
      await pool.db.exec(readFileSync(path.join('prisma/migrations', folder, 'migration.sql'), 'utf8'))
    }
    for (const id of ['new','other','date']) await db.user.create({ data: { id, name: id, email: `${id}@test.invalid` } })
    await t.test('existing accounts remain optional while new ones require registration', async () => {
      actor = 'legacy'; assert.equal((await (await registration.GET()).json()).required, false)
      assert.equal((await savePlanet()).status, 200)
      actor = 'new'; assert.equal((await (await registration.GET()).json()).required, true)
      const response = await savePlanet(); assert.equal(response.status, 403); assert.equal((await response.json()).error, 'REGISTRATION_REQUIRED')
      assert.equal(await db.planet.count({ where: { userId: 'new' } }), 0)
      assert.equal((await myPlanet.POST(request({ name: 'Bypass attempt' }))).status, 403)
    })
    await t.test('requires authentication, rejects cross-origin and forged owner fields', async () => {
      actor = null; assert.equal((await registration.GET()).status, 401); assert.equal((await registration.PUT(request({ adultConfirmed: true }))).status, 401)
      actor = 'new'; assert.equal((await registration.PUT(request({ adultConfirmed: true }, 'https://evil.invalid'))).status, 403)
      assert.equal((await registration.PUT(request({ adultConfirmed: true, userId: 'other' }))).status, 400)
      assert.equal((await registration.PUT(request({ adultConfirmed: true, gender: 'invalid' }))).status, 400)
    })
    await t.test('underage and invalid dates cannot be overridden by adult checkbox', async () => {
      for (const birthDate of ['2020-01-01','2007-02-29','2000-02-30','']) {
        const response = await registration.PUT(request({ birthDate, adultConfirmed: birthDate ? true : false }))
        assert.equal(response.status, 400)
      }
      assert.equal(await db.registrationBasics.count(), 0)
    })
    await t.test('all optional details can be withheld, adult declaration persists and unlocks save', async () => {
      assert.equal((await registration.PUT(request({ adultConfirmed: true }))).status, 200)
      const result = await (await registration.GET()).json()
      assert.equal(result.required, false); assert.equal(result.basics.gender, 'undisclosed'); assert.deepEqual(result.basics.languages, [])
      assert.equal(result.basics.ageMethod, 'adult-self-declaration')
      assert.equal((await savePlanet()).status, 200)
    })
    await t.test('edits reload exactly, preserve adult evidence and stay outside public profile', async () => {
      const before = await db.registrationBasics.findUniqueOrThrow({ where: { userId: 'new' } })
      const changes = { gender: 'nonbinary', region: 'Paris, France', languages: ['fr','zh','fr'], interests: ['art','books'], connectionGoals: ['friendship','dating'], peoplePreferences: ['differentPerspectives'], gatheringPreferences: ['smallGroups'] }
      assert.equal((await registration.PUT(request(changes))).status, 200)
      const result = (await (await registration.GET()).json()).basics
      assert.equal(result.region, changes.region); assert.deepEqual(result.languages, ['fr','zh']); assert.deepEqual(result.connectionGoals, changes.connectionGoals)
      assert.equal(result.adultConfirmedAt, before.adultConfirmedAt.toISOString())
      const profile = await db.profile.findUniqueOrThrow({ where: { userId: 'new' } })
      assert.equal(profile.location, null); assert.deepEqual(profile.languages, []); assert.equal(profile.gender, undefined)
      actor = 'other'; assert.equal((await (await registration.GET()).json()).basics, null)
      actor = 'new'; assert.equal((await registration.PUT(request({}))).status, 200)
      assert.equal((await (await registration.GET()).json()).basics.region, '')
    })
    await t.test('birth date only produces declaration evidence and never stored or returned', async () => {
      actor = 'date'; assert.equal((await registration.PUT(request({ birthDate: '1996-01-01', interests: ['music'] }))).status, 200)
      const result = await (await registration.GET()).json()
      assert.equal(result.basics.ageMethod, 'birth-date-declaration'); assert.ok(!JSON.stringify(result).includes('1996-01-01')); assert.equal(result.basics.birthDate, undefined)
      const exported = await (await exportData.GET()).json()
      assert.equal(exported.registrationBasics.ageMethod, 'birth-date-declaration'); assert.ok(!JSON.stringify(exported).includes('1996-01-01'))
    })
    await t.test('public tags require individual consent, private fields stay server-side, revocation is immediate', async () => {
      actor = 'other'
      const values = { adultConfirmed: true, gender: 'nonbinary', region: 'Hidden city', languages: ['fr'], interests: ['art'], connectionGoals: ['friendship'], publicTags: ['interests:art', 'birthDate', 'gender:male', 'region:forged'] }
      assert.equal((await registration.PUT(request(values))).status, 200)
      assert.equal((await savePlanet()).status, 200)
      const peer = await db.planet.findFirstOrThrow({ where: { userId: actor, active: true } })
      actor = 'new'
      await registration.PUT(request({ region: 'Paris', languages: ['fr'], interests: ['art'] }))
      const read = async () => (await planetList.GET(new Request('https://test.invalid/api/planets'))).json()
      let result = await read(), candidate = result.planets.find(p => p.id === peer.id)
      assert.deepEqual(candidate.publicTags, [{ key: 'interests', value: 'art' }])
      assert.ok(candidate.preferenceFit.coverage > 0)
      const own = await db.planet.findFirstOrThrow({ where: { userId: 'new', active: true } })
      assert.equal(candidate.preferenceFit.sourcePlanetId, own.id)
      for (const text of ['Hidden city', 'nonbinary', 'adultConfirmedAt', 'registrationBasics']) assert.ok(!JSON.stringify(result).includes(text), text)
      const detail = await (await planetDetail.GET(new Request('https://test.invalid'), { params: Promise.resolve({ id: peer.id }) })).json()
      assert.deepEqual(detail.publicTags, candidate.publicTags)
      assert.deepEqual(detail.preferenceFit, candidate.preferenceFit)
      actor = 'other'; await registration.PUT(request({ ...values, publicTags: [] }))
      actor = 'new'; candidate = (await read()).planets.find(p => p.id === peer.id)
      assert.deepEqual(candidate.publicTags, [])
      const map = await (await starMap.GET(new Request('https://test.invalid/api/star-map?mode=discover'))).json()
      assert.deepEqual(map.nodes.find(p => p.id === peer.id).publicTags, [])
      await db.profile.update({ where: { userId: 'other' }, data: { visibility: 'PRIVATE' } })
      assert.ok(!(await read()).planets.some(p => p.id === peer.id))
      assert.equal((await planetDetail.GET(new Request('https://test.invalid'), { params: Promise.resolve({ id: peer.id }) })).status, 404)
      await db.profile.update({ where: { userId: 'other' }, data: { visibility: 'MEMBERS' } })
    })
    await t.test('activity preference filters and recommendation preserve membership and proposer privacy', async () => {
      const galaxy = await db.community.create({ data: { name: 'Preferences', slug: 'preferences', creatorId: 'new' } })
      await db.communityMembership.create({ data: { userId: 'new', communityId: galaxy.id } })
      const base = { galaxyId: galaxy.id, proposerId: 'new', description: 'Public event description', date: new Date('2050-01-01'), category: 'MEETUP', status: 'APPROVED' }
      const local = await db.event.create({ data: { ...base, title: 'Local art', location: 'Paris', languages: ['fr'], interestTags: ['art'] } })
      await db.event.create({ data: { ...base, title: 'Remote music', location: 'Berlin', languages: ['en'], interestTags: ['music'] } })
      actor = 'new'
      const url = 'https://test.invalid/api/galaxies/events?status=upcoming&sort=recommended&region=Paris&language=fr&interest=art'
      const response = await events.GET(new Request(url)); assert.equal(response.status, 200)
      const result = await response.json(); assert.deepEqual(result.events.map(e => e.id), [local.id]); assert.ok(result.events[0].recommendation.score > 0)
      const canonical = await (await events.GET(new Request(url.replace('region=Paris','region=Paris%2C%20FR')))).json()
      assert.deepEqual(canonical.events.map(e => e.id), [local.id])
      actor = 'other'; const outsider = await (await events.GET(new Request(url))).json(); assert.deepEqual(outsider.events, [])
      actor = 'new'; assert.equal((await events.GET(new Request(url + '&language=invalid'))).status, 400)
    })
    await t.test('uploaded planet image replaces Google avatar in self and peer map nodes', async () => {
      for (const id of ['new','other']) await db.user.update({ where: { id }, data: { image: `https://google.test/${id}.png`, planetCustomTexture: `https://uploads.test/${id}.png` } })
      actor = 'new'
      const map = await (await starMap.GET(new Request('https://test.invalid/api/star-map?mode=discover'))).json()
      assert.equal(map.selfPlanet.avatarUrl, 'https://uploads.test/new.png')
      assert.equal(map.nodes.find(n => n.userId === 'other').avatarUrl, 'https://uploads.test/other.png')
      await db.user.update({ where: { id: 'other' }, data: { planetCustomTexture: null } })
      const fallback = await (await starMap.GET(new Request('https://test.invalid/api/star-map?mode=discover'))).json()
      assert.equal(fallback.nodes.find(n => n.userId === 'other').avatarUrl, 'https://google.test/other.png')
    })
    await t.test('email identity is private, verified status is fresh, resend is owner-only and rate limited', async () => {
      actor = null; assert.equal((await emailVerification.GET()).status,401)
      actor = 'new'
      const identity = await (await emailVerification.GET()).json()
      assert.equal(identity.email,'new@test.invalid'); assert.equal(identity.available,false)
      assert.equal((await emailVerification.POST(request({}))).status,503)
      deliveryConfigured = true
      assert.equal((await emailVerification.POST(request({},'https://evil.invalid'))).status,403)
      assert.equal((await emailVerification.POST(request({ email: 'other@test.invalid' }))).status,400)
      for (let i=0;i<3;i++) assert.equal((await emailVerification.POST(request({}))).status,200)
      assert.equal((await emailVerification.POST(request({}))).status,429)
      assert.equal(verificationCalls.length,3)
      assert.ok(verificationCalls.every(call => call.email === 'new@test.invalid' && call.callbackURL === '/settings/account'))
      await db.user.update({ where: { id: 'new' }, data: { emailVerified: true } })
      assert.equal((await (await emailVerification.GET()).json()).verified,true)
      assert.deepEqual(await (await emailVerification.POST(request({}))).json(),{ verified: true })
      assert.equal(verificationCalls.length,3)
      actor = 'date'; await db.user.update({ where: { id: actor }, data: { deletedAt: new Date() } })
      assert.equal((await emailVerification.GET()).status,401); assert.equal((await emailVerification.POST(request({}))).status,401)
      await db.user.update({ where: { id: actor }, data: { deletedAt: null } })
    })
    await t.test('city search authenticates, bounds queries, strips precise coordinates and caches provider results', async () => {
      actor = null; assert.equal((await regions.GET(new Request('https://test.invalid/api/regions?q=Paris'))).status,401)
      actor = 'new'; const originalFetch = globalThis.fetch; let calls = 0
      globalThis.fetch = async url => {
        calls++; assert.equal(url.hostname,'photon.komoot.io'); assert.equal(url.searchParams.get('lang'),'en')
        return Response.json({ features: [{ properties: { name: 'Paris', countrycode: 'FR', state: 'Île-de-France' }, geometry: { coordinates: [2.3,48.8] } }] })
      }
      try {
        assert.deepEqual(await (await regions.GET(new Request('https://test.invalid/api/regions?q=P'))).json(),{ suggestions: [] })
        const response = await (await regions.GET(new Request('https://test.invalid/api/regions?q=Paris'))).json()
        assert.deepEqual(response,{ suggestions: [{ value: 'Paris, FR', label: 'Paris, FR · Île-de-France' }] })
        await regions.GET(new Request('https://test.invalid/api/regions?q=paris')); assert.equal(calls,1)
        actor = 'date'; await db.user.update({ where: { id: actor }, data: { deletedAt: new Date() } })
        assert.equal((await regions.GET(new Request('https://test.invalid/api/regions?q=Paris'))).status,401)
        await db.user.update({ where: { id: actor }, data: { deletedAt: null } })
      } finally { globalThis.fetch = originalFetch }
    })
    await t.test('deleted owner cannot recreate private preferences and physical deletion cascades', async () => {
      actor = 'date'; await db.user.update({ where: { id: actor }, data: { deletedAt: new Date() } })
      assert.equal((await registration.GET()).status, 401); assert.equal((await registration.PUT(request({ interests: ['books'] }))).status, 401)
      await db.user.delete({ where: { id: actor } }); assert.equal(await db.registrationBasics.count({ where: { userId: actor } }), 0)
    })
    await t.test('self-deletion clears all private preferences even though the account row remains', async () => {
      actor = 'new'
      const response = await account.DELETE(request({ confirm: true }))
      assert.equal(response.status, 200)
      assert.equal(await db.registrationBasics.count({ where: { userId: actor } }), 0)
      assert.ok((await db.user.findUniqueOrThrow({ where: { id: actor } })).deletedAt)
    })
    await t.test('all registration labels exist in English, French and Chinese', () => {
      for (const locale of ['en','fr','zh']) {
        const copy = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')).registrationBasics
        for (const values of Object.values(BASIC_OPTIONS)) for (const option of values) assert.ok(copy.options[option], `${locale}:${option}`)
      }
    })
  } finally { await db.$disconnect(); await pool.db.close() }
})
