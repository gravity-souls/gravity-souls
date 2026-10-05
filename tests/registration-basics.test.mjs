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
const previous = Module._load
Module._load = function(id, parent, main) {
  if (id === '@/lib/prisma') return { prisma: db }
  if (id === '@/lib/session') return { requireUser: async () => { if (!actor) throw Response.json({}, { status: 401 }); return { user: await db.user.findUniqueOrThrow({ where: { id: actor } }) } } }
  if (id === '@/lib/grantXP') return { grantXP: async () => {} }
  return previous.call(this, id, parent, main)
}
const registration = require('../app/api/registration/route.ts')
const complete = require('../app/api/onboarding/complete/route.ts')
const exportData = require('../app/api/me/export/route.ts')
const account = require('../app/api/me/route.ts')
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
