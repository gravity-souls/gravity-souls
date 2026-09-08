/**
 * Phase 23 — self-service account deletion (tombstone) and data export.
 *
 * Founder-approved shape (see DELETE /api/me and GET /api/me/export):
 *   - Deletion is immediate, no grace period.
 *   - The `user` row is scrubbed (tombstoned), never actually deleted —
 *     content visible to others (DirectMessage, CommunityPost/Reply,
 *     CommunityDiscussion/Reply, Post/PostComment, Event) stays in place
 *     and is now attributed to the tombstone identity ("Deleted Planet").
 *   - The user's own private data (Session, Account, Profile, Planet,
 *     QuestionnaireResult, SavedPlanet, Follow, Block, CommunityMembership,
 *     XPEvent, Notification, and their own likes/Match rows) is genuinely
 *     deleted.
 *   - Data export never resolves another (non-consenting) user's name/email
 *     into the exporting user's payload — Follows/Blocks are userId+since
 *     only, mirroring GET /api/blocks/GET /api/follows's existing minimal
 *     shape (see lib/visibility.ts's "never disclosed to the blocked user"
 *     invariant).
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'
import { TEST_BASE_URL } from './environment'

let prisma: PrismaClient

const stamp = Date.now()
const deleterEmail = `gs_phase23_deleter_${stamp}@test.local`
const deleterPassword = 'Phase23Password!1'
const deleterName = 'Phase23 Deleter'
const recipientEmail = `gs_phase23_recipient_${stamp}@test.local`
const recipientPassword = 'Phase23Password!2'
const recipientName = 'Phase23 Recipient'
const dmContent = `phase23 dm content ${stamp}`
const communityPostContent = `phase23 community post content ${stamp}`
const discussionReplyContent = `phase23 discussion reply content ${stamp}`
const watcherName = 'Phase23 Watcher Real Name'
const watcherEmail = `gs_phase23_watcher_${stamp}@test.local`

let deleterId: string
let recipientId: string
let watcherId: string
// Captured once at sign-up and reused for every subsequent authenticated
// call (instead of signing in with a password each time) — better-auth's
// production rate limiter caps /sign-in and /sign-up at 3 requests per 10s
// per the default "special rule" for auth-adjacent paths (see
// node_modules/better-auth/dist/api/rate-limiter/index.mjs), and this
// suite's webServer runs a real `next build && next start` (production).
let deleterStorageState: Awaited<ReturnType<import('@playwright/test').APIRequestContext['storageState']>>
let recipientStorageState: Awaited<ReturnType<import('@playwright/test').APIRequestContext['storageState']>>
let communityId: string
let conversationId: string
let communityPostId: string
let discussionReplyId: string
let postId: string
let commentId: string
let deleterPlanetId: string
let recipientPlanetId: string
let matchId: string
let newOwnerUserId: string | null = null

async function signUp(request: APIRequestContext, name: string, email: string, password: string) {
  const res = await request.post('/api/auth/sign-up/email', { data: { name, email, password } })
  if (!res.ok()) throw new Error(`sign-up failed for ${email}: ${res.status()} ${await res.text()}`)
  const sessionRes = await request.get('/api/auth/get-session')
  const sessionData = await sessionRes.json()
  return sessionData.user.id as string
}

test.describe.serial('Phase 23 — account deletion (tombstone) and export', () => {
  test.beforeAll(async ({ playwright }) => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })

    const deleterCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL })
    const recipientCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL })

    deleterId = await signUp(deleterCtx, deleterName, deleterEmail, deleterPassword)
    recipientId = await signUp(recipientCtx, recipientName, recipientEmail, recipientPassword)
    deleterStorageState = await deleterCtx.storageState()
    recipientStorageState = await recipientCtx.storageState()

    // Mutual follow (required for a brand-new DM thread).
    expect((await deleterCtx.post('/api/follows', { data: { userId: recipientId } })).status()).toBe(201)
    expect((await recipientCtx.post('/api/follows', { data: { userId: deleterId } })).status()).toBe(201)

    // A real DM the deleter sends to the recipient.
    const convRes = await deleterCtx.post('/api/conversations', { data: { recipientId, message: dmContent } })
    expect(convRes.status()).toBe(201)
    conversationId = (await convRes.json()).conversationId

    // Own private data seeded directly (mirrors global-setup.ts's convention
    // of writing fixtures straight through Prisma rather than every UI flow).
    await prisma.profile.create({ data: { userId: deleterId, name: deleterName } })
    const deleterPlanet = await prisma.planet.create({ data: { userId: deleterId, name: 'Deleter World', active: true } })
    deleterPlanetId = deleterPlanet.id
    const recipientPlanet = await prisma.planet.create({ data: { userId: recipientId, name: 'Recipient World', active: true } })
    recipientPlanetId = recipientPlanet.id
    await prisma.questionnaireResult.create({ data: { userId: deleterId, answers: {} } })
    await prisma.savedPlanet.create({ data: { userId: deleterId, planetId: recipientPlanetId } })
    await prisma.xPEvent.create({ data: { userId: deleterId, type: 'PHASE23_TEST', xpGranted: 5 } })
    await prisma.notification.create({ data: { userId: deleterId, type: 'NEW_FOLLOWER', title: 'phase23', body: 'phase23 notification body' } })
    // Block created directly (bypassing POST /api/blocks, already covered
    // elsewhere) so both a Follow and a Block from the deleter exist
    // simultaneously to verify both get cleaned up.
    await prisma.block.create({ data: { blockerId: deleterId, blockedId: recipientId } })
    const match = await prisma.match.create({
      data: { userAId: deleterId, userBId: recipientId, planetAId: deleterPlanetId, planetBId: recipientPlanetId, score: 77 },
    })
    matchId = match.id

    // Own low-value interaction records + the denormalized counters they
    // contributed to (mirrors the state POST /api/posts/[id]/like and
    // POST /api/posts/[id]/comments/[commentId]/like would leave behind).
    const post = await prisma.post.create({ data: { authorId: recipientId, content: 'phase23 post to like', likeCount: 0 } })
    postId = post.id
    await prisma.postLike.create({ data: { postId, userId: deleterId } })
    await prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } })
    const comment = await prisma.postComment.create({ data: { postId, authorId: recipientId, content: 'phase23 comment to like', likeCount: 0 } })
    commentId = comment.id
    await prisma.postCommentLike.create({ data: { commentId, userId: deleterId } })
    await prisma.postComment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } })

    // Community content authored by the deleter (kept, re-attributed).
    const community = await prisma.community.create({ data: { slug: `phase23-galaxy-${stamp}`, name: 'Phase23 Test Galaxy' } })
    communityId = community.id
    await prisma.communityMembership.create({ data: { userId: deleterId, communityId } })
    const communityPost = await prisma.communityPost.create({ data: { communityId, authorId: deleterId, content: communityPostContent } })
    communityPostId = communityPost.id
    const discussion = await prisma.communityDiscussion.create({
      data: { communityId, authorId: deleterId, title: `Phase23 Discussion ${stamp}` },
    })
    // authorName is a point-in-time snapshot of the deleter's real display
    // name — this is exactly the leak DELETE /api/me must also scrub (see
    // app/api/communities/[id]/discussions/route.ts's serializeReply
    // fallback to `reply.authorName` once the author's active planet — just
    // deleted above — is gone).
    const discussionReply = await prisma.communityDiscussionReply.create({
      data: { discussionId: discussion.id, authorId: deleterId, authorName: deleterName, content: discussionReplyContent },
    })
    discussionReplyId = discussionReply.id

    // Third party the recipient has a real (non-anonymized) connection to —
    // used to verify the export never leaks another user's name/email.
    watcherId = `phase23_watcher_${stamp}`
    await prisma.user.create({ data: { id: watcherId, name: watcherName, email: watcherEmail } })
    await prisma.follow.create({ data: { followerId: recipientId, followingId: watcherId } })
    await prisma.block.create({ data: { blockerId: recipientId, blockedId: watcherId } })

    await deleterCtx.dispose()
    await recipientCtx.dispose()
  })

  test.afterAll(async () => {
    try {
      await prisma.community.deleteMany({ where: { id: communityId } })
      await prisma.user.deleteMany({ where: { id: { in: [deleterId, recipientId, watcherId, ...(newOwnerUserId ? [newOwnerUserId] : [])] } } })
    } finally {
      await prisma?.$disconnect()
    }
  })

  test('DELETE /api/me without {confirm:true} is rejected, not silently deleting', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: deleterStorageState })

    const noBody = await ctx.delete('/api/me', { data: {} })
    expect(noBody.status()).toBe(400)

    const falseConfirm = await ctx.delete('/api/me', { data: { confirm: false } })
    expect(falseConfirm.status()).toBe(400)

    const user = await prisma.user.findUniqueOrThrow({ where: { id: deleterId } })
    expect(user.deletedAt).toBeNull()
    expect(user.email).toBe(deleterEmail)

    await ctx.dispose()
  })

  test('DELETE /api/me with {confirm:true} tombstones the user row and genuinely deletes owned data', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: deleterStorageState })

    const res = await ctx.delete('/api/me', { data: { confirm: true } })
    expect(res.status()).toBe(200)
    expect((await res.json()).deleted).toBe(true)

    // Tombstoned, not removed.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: deleterId } })
    expect(user.deletedAt).not.toBeNull()
    expect(user.email).toBe(`deleted-${deleterId}@deleted.invalid`)
    expect(user.name).toBe('Deleted Planet')
    expect(user.image).toBeNull()
    expect(user.xp).toBe(0)
    expect(user.userLevel).toBe(1)
    expect(user.planetTexture).toBe('jupiter.jpg')
    expect(user.planetHasRing).toBe(false)

    // Own private data genuinely deleted.
    expect(await prisma.session.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.account.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.profile.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.planet.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.questionnaireResult.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.follow.count({ where: { OR: [{ followerId: deleterId }, { followingId: deleterId }] } })).toBe(0)
    expect(await prisma.block.count({ where: { OR: [{ blockerId: deleterId }, { blockedId: deleterId }] } })).toBe(0)
    expect(await prisma.savedPlanet.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.xPEvent.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.notification.count({ where: { userId: deleterId } })).toBe(0)
    expect(await prisma.match.count({ where: { id: matchId } })).toBe(0)

    // Own low-value interaction records deleted, counters correctly decremented.
    expect(await prisma.postLike.count({ where: { postId, userId: deleterId } })).toBe(0)
    expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).likeCount).toBe(0)
    expect(await prisma.postCommentLike.count({ where: { commentId, userId: deleterId } })).toBe(0)
    expect((await prisma.postComment.findUniqueOrThrow({ where: { id: commentId } })).likeCount).toBe(0)

    // Content visible to others is preserved.
    const dm = await prisma.directMessage.findFirst({ where: { conversationId, senderId: deleterId } })
    expect(dm?.content).toBe(dmContent)
    const thread = await prisma.conversationThread.findUniqueOrThrow({ where: { id: conversationId } })
    expect([thread.userAId, thread.userBId].sort()).toEqual([deleterId, recipientId].sort())
    const communityPost = await prisma.communityPost.findUniqueOrThrow({ where: { id: communityPostId } })
    expect(communityPost.content).toBe(communityPostContent)
    expect(communityPost.authorId).toBe(deleterId)

    // The CommunityDiscussionReply.authorName snapshot is scrubbed too, not
    // left holding the deleter's original real name.
    const discussionReply = await prisma.communityDiscussionReply.findUniqueOrThrow({ where: { id: discussionReplyId } })
    expect(discussionReply.authorName).toBe('Deleted Planet')
    expect(discussionReply.content).toBe(discussionReplyContent)

    // The now-deleted Session can no longer authenticate.
    const meAfter = await ctx.get('/api/me')
    expect(meAfter.status()).toBe(401)

    await ctx.dispose()
  })

  test('the recipient still sees the DM in their conversation view, attributed to the tombstone identity', async ({ browser }) => {
    const context = await browser.newContext({ storageState: recipientStorageState })
    const page = await context.newPage()
    try {
      await page.goto(`/messages/${conversationId}`, { waitUntil: 'networkidle' })
      await expect(page.getByText(dmContent)).toBeVisible()
      await expect(page.getByText('Deleted Planet')).toBeVisible()
      // The deleter's original real name must never resurface.
      await expect(page.getByText(deleterName, { exact: true })).toHaveCount(0)
    } finally {
      await context.close()
    }
  })

  test('a CommunityPost and CommunityDiscussionReply authored by the deleted user still exist and display the tombstone name', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: recipientStorageState })

    const postsRes = await ctx.get(`/api/communities/${communityId}/posts`)
    expect(postsRes.ok()).toBeTruthy()
    const postsBody = await postsRes.json()
    const post = postsBody.posts.find((p: { id: string }) => p.id === communityPostId)
    expect(post).toBeTruthy()
    expect(post.content).toBe(communityPostContent)
    expect(post.author.name).toBe('Deleted Planet')

    const discussionsRes = await ctx.get(`/api/communities/${communityId}/discussions`)
    expect(discussionsRes.ok()).toBeTruthy()
    const discussionsBody = await discussionsRes.json()
    const reply = discussionsBody.discussions
      .flatMap((d: { replyItems: { id: string }[] }) => d.replyItems)
      .find((r: { id: string }) => r.id === discussionReplyId)
    expect(reply).toBeTruthy()
    expect(reply.content).toBe(discussionReplyContent)
    expect(reply.author.name).toBe('Deleted Planet')

    await ctx.dispose()
  })

  test('the deleted account cannot sign back in with its old credentials', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: TEST_BASE_URL })
    const res = await ctx.post('/api/auth/sign-in/email', { data: { email: deleterEmail, password: deleterPassword } })
    // Must fail because the credential is gone, not because of an unrelated
    // rate limit — a 429 here would prove nothing about deletion.
    expect(res.status()).not.toBe(429)
    expect(res.ok()).toBeFalsy()
    const sessionRes = await ctx.get('/api/auth/get-session')
    expect(await sessionRes.json()).toBeNull()
    await ctx.dispose()
  })

  test('a fresh signup with the original real email succeeds as a distinct new account', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: TEST_BASE_URL })
    const newUserId = await signUp(ctx, 'Phase23 New Owner', deleterEmail, 'BrandNewPassword!3')
    expect(newUserId).not.toBe(deleterId)
    newOwnerUserId = newUserId

    const newUser = await prisma.user.findUniqueOrThrow({ where: { id: newUserId } })
    expect(newUser.email).toBe(deleterEmail)
    expect(newUser.deletedAt).toBeNull()

    await ctx.dispose()
  })

  test('GET /api/me/export returns the expected categories, no credential secrets, and no other user PII in Follows/Blocks', async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: recipientStorageState })

    const res = await ctx.get('/api/me/export')
    expect(res.ok()).toBeTruthy()
    expect(res.headers()['content-disposition']).toMatch(/attachment/)

    const raw = await res.text()
    const body = JSON.parse(raw)

    for (const key of [
      'account', 'sessions', 'linkedAccounts', 'profile', 'planets', 'questionnaireResults',
      'savedPlanets', 'follows', 'blocks', 'notifications', 'xpEvents', 'posts', 'postComments',
      'communityPosts', 'communityPostReplies', 'communityDiscussions', 'communityDiscussionReplies',
      'communityMemberships', 'matches', 'reportsFiled', 'directMessages',
    ]) {
      expect(body).toHaveProperty(key)
    }

    expect(body.account.id).toBe(recipientId)

    // Never credential material.
    expect(raw).not.toMatch(/"password"\s*:/)
    expect(raw).not.toMatch(/"accessToken"\s*:/)
    expect(raw).not.toMatch(/"refreshToken"\s*:/)
    expect(raw).not.toMatch(/"idToken"\s*:/)
    for (const s of body.sessions) expect(s).not.toHaveProperty('token')

    // Follows/Blocks are minimal (userId + since) — the watcher's real name
    // and email must never appear anywhere in the export payload.
    const following = body.follows.following.find((f: { userId: string }) => f.userId === watcherId)
    expect(following).toBeTruthy()
    const blocked = body.blocks.find((b: { userId: string }) => b.userId === watcherId)
    expect(blocked).toBeTruthy()
    expect(raw).not.toContain(watcherName)
    expect(raw).not.toContain(watcherEmail)

    await ctx.dispose()
  })
})
