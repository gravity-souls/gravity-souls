import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { matchesPost, postErrorKey, streamPostSchema, streamPageSchema } = require('../lib/stream-workflow.ts')
const { streamOriginHref, withPostOrigin, withPostReturn } = require('../lib/post-return.ts')
const author = { id: 'owner', name: 'Owner', planetId: null, planetTexture: null, planetConfig: null, tintColor: '#a78bfa', userLevel: 1 }
const post = { id: 'post', authorId: 'owner', content: 'Night Sky', category: 'NIGHT', tags: ['Stars'], mediaUrls: [], mediaTypes: [], likeCount: 0, commentCount: 0, createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z', author, userHasLiked: false }

test('stream filters match server category, author, case-sensitive tag and case-insensitive content/search OR', () => {
  assert.equal(matchesPost(post, { category: 'ALL', authorId: 'owner', tag: '#Stars', search: 'sky' }), true)
  assert.equal(matchesPost(post, { search: '#Stars' }), true)
  for (const filters of [{ category: 'ART' }, { authorId: 'other' }, { tag: 'stars' }, { search: '#stars' }, { search: 'unmatched' }]) {
    assert.equal(matchesPost(post, filters), false)
  }
  assert.equal(matchesPost({ ...post, content: 'Edited away' }, { search: 'sky' }), false)
})
test('authoritative post/page validation rejects malformed successful-looking responses', () => {
  assert.deepEqual(streamPostSchema.parse(post), post)
  assert.equal(streamPostSchema.safeParse({ id: 'post' }).success, false)
  assert.equal(streamPostSchema.safeParse({ ...post, category: 'UNKNOWN' }).success, false)
  assert.equal(streamPostSchema.safeParse({ ...post, author: null }).success, false)
  assert.equal(streamPageSchema.safeParse({ posts: [] }).success, false)
  assert.equal(streamPageSchema.safeParse({ posts: [post], nextCursor: null }).success, true)
})
test('all known publish API errors map to localized keys, never raw server text', () => {
  const cases = [
    [401, 'Unauthorized', 'authError'], [429, 'rateLimited', 'rateError'],
    [404, 'contextUnavailable', 'contextError'], [400, 'contextMismatch', 'contextError'],
    [404, 'notFound', 'contextError'], [403, 'authorOnly', 'permissionError'],
    [400, 'Post content is required', 'validationRequired'],
    [400, 'Post content must be 2000 characters or fewer', 'validationMax'],
    [400, 'Posts can include up to 9 media items', 'mediaCountError'],
    [400, 'Media must be JPG, PNG, WEBP, MP4, or WEBM', 'mediaTypeError'],
    [400, 'Images must be 5MB or smaller', 'imageSizeError'],
    [400, 'Videos must be 50MB or smaller', 'videoSizeError'],
    [400, 'invalidFields', 'validationError'], [413, 'Request is too large', 'validationError'],
    [500, 'Private internal diagnostics', 'sendError'],
  ]
  for (const [status, error, expected] of cases) assert.equal(postErrorKey(status, error), expected)
})
test('stream origin hints allow exact stream/my-planet/home paths only through the full return chain', () => {
  for (const origin of ['/stream', '/my-planet', '/']) {
    assert.equal(streamOriginHref(origin), origin)
    const context = new URL(withPostReturn('/galaxy/night?event=event#events', 'post', origin), 'https://local.invalid')
    assert.equal(context.searchParams.get('fromStream'), origin)
    const detail = new URL(withPostOrigin('post', '/galaxy/night?event=event#events', context.searchParams.get('fromStream')), 'https://local.invalid')
    assert.equal(detail.searchParams.get('fromStream'), origin)
  }
  for (const origin of ['https://evil.test', '//evil.test', '/stream/../admin', '/my-planet?next=https://evil.test', '/%73tream', '/stream#x', '/dashboard', '\\stream']) {
    assert.equal(streamOriginHref(origin), null)
    assert.equal(new URL(withPostOrigin('post', null, origin), 'https://local.invalid').search, '')
  }
})
