import { test } from 'node:test'
import assert from 'node:assert/strict'
import { followSchema, blockSchema, reportSchema, visibilitySchema, planetUpdateSchema } from '../lib/input-schemas'

test('follow and block schemas require exactly one userId and reject unknown fields', () => {
  assert.equal(followSchema.safeParse({ userId: 'usr_abc' }).success, true)
  assert.equal(followSchema.safeParse({}).success, false)
  assert.equal(followSchema.safeParse({ userId: 'usr_abc', extra: 'nope' }).success, false)
  assert.equal(blockSchema.safeParse({ userId: 'usr_abc' }).success, true)
  assert.equal(blockSchema.safeParse({ userId: '' }).success, false)
})

test('report schema requires a valid target type and a non-empty reason', () => {
  const base = { targetType: 'USER', targetId: 'usr_abc', reason: 'Harassing me in DMs' }
  assert.equal(reportSchema.safeParse(base).success, true)
  assert.equal(reportSchema.safeParse({ ...base, targetType: 'NOT_A_TYPE' }).success, false)
  assert.equal(reportSchema.safeParse({ ...base, reason: '' }).success, false)
  assert.equal(reportSchema.safeParse({ ...base, details: 'x'.repeat(2001) }).success, false)
  assert.equal(reportSchema.safeParse({ ...base, unknownField: 1 }).success, false)
})

test('visibility schema only accepts the two approved states', () => {
  assert.equal(visibilitySchema.safeParse({ visibility: 'MEMBERS' }).success, true)
  assert.equal(visibilitySchema.safeParse({ visibility: 'PRIVATE' }).success, true)
  assert.equal(visibilitySchema.safeParse({ visibility: 'PUBLIC' }).success, false)
  assert.equal(planetUpdateSchema.safeParse({ visibility: 'PRIVATE' }).success, true)
  assert.equal(planetUpdateSchema.safeParse({ visibility: 'everyone' }).success, false)
})
