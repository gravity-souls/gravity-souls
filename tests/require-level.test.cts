import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isLevelAuthorized } from '../lib/level-authorization'

test('EARLY_ACCESS bypass authorizes regardless of level', () => {
  assert.equal(isLevelAuthorized(0, 5, true), true)
  assert.equal(isLevelAuthorized(0, 1, true), true)
  assert.equal(isLevelAuthorized(1, 2, true), true)
})

// This is the logic that must be verified correct before
// NEXT_PUBLIC_EARLY_ACCESS is ever set to 'false' for real users — with the
// bypass on (the current, always-tested default), this branch never runs in
// any live environment.
test('with the bypass off, gating denies below minLevel and allows at/above it', () => {
  assert.equal(isLevelAuthorized(0, 1, false), false)
  assert.equal(isLevelAuthorized(1, 2, false), false)
  assert.equal(isLevelAuthorized(4, 5, false), false)
  assert.equal(isLevelAuthorized(2, 2, false), true)
  assert.equal(isLevelAuthorized(5, 2, false), true)
  assert.equal(isLevelAuthorized(0, 0, false), true)
})
