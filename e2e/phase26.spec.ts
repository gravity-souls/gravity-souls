/**
 * Phase 26 — content CRUD gap: author-scoped edit/delete for comments, replies,
 * community posts, and discussions (see docs/beta-execution.md's "Remaining
 * launch gates" — "content CRUD/media lifecycle").
 *
 * Scope (see the scoping investigation this implements):
 *   - PostComment: PATCH (edit) + DELETE, author-only.
 *   - CommunityPost: DELETE, author-only.
 *   - CommunityPostReply: DELETE, author-only.
 *   - CommunityDiscussion: DELETE, author-only (no edit — out of scope).
 *   - CommunityDiscussionReply: DELETE, author-only.
 *
 * Explicitly not covered here: blob/media garbage collection on delete
 * (separate, lower-priority, already-tracked gap) and admin/moderator removal
 * via the report queue (trust-safety-moderation scope).
 */

import { test, expect, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { testDatabaseUrl } from '../lib/database-safety'
import { TEST_BASE_URL } from './environment'

let prisma: PrismaClient

const stamp = Date.now()
const authorEmail = `gs_phase26_author_${stamp}@test.local`
const authorPassword = 'Phase26Password!1'
const authorName = 'Phase26 Author'
const otherEmail = `gs_phase26_other_${stamp}@test.local`
const otherPassword = 'Phase26Password!2'
const otherName = 'Phase26 Other'

let authorId: string
let otherId: string
let authorStorageState: Awaited<ReturnType<APIRequestContext['storageState']>>
let otherStorageState: Awaited<ReturnType<APIRequestContext['storageState']>>

let postId: string
let communityId: string

async function signUp(request: APIRequestContext, name: string, email: string, password: string) {
  const res = await request.post('/api/auth/sign-up/email', { data: { name, email, password } })
  if (!res.ok()) throw new Error(`sign-up failed for ${email}: ${res.status()} ${await res.text()}`)
  const sessionRes = await request.get('/api/auth/get-session')
  const sessionData = await sessionRes.json()
  return sessionData.user.id as string
}

test.describe.serial('Phase 26 — content CRUD gap: comment/reply/community-post edit+delete', () => {
  test.beforeAll(async ({ playwright }) => {
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: testDatabaseUrl() }) })

    const authorCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL })
    const otherCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL })

    authorId = await signUp(authorCtx, authorName, authorEmail, authorPassword)
    otherId = await signUp(otherCtx, otherName, otherEmail, otherPassword)
    authorStorageState = await authorCtx.storageState()
    otherStorageState = await otherCtx.storageState()

    // Seeded directly through Prisma (mirrors global-setup.ts / phase23's
    // convention) — a top-level post the "author" fixture owns.
    const post = await prisma.post.create({ data: { authorId, content: `phase26 post ${stamp}`, commentCount: 0 } })
    postId = post.id

    const community = await prisma.community.create({ data: { slug: `phase26-galaxy-${stamp}`, name: 'Phase26 Test Galaxy' } })
    communityId = community.id
    await prisma.communityMembership.create({ data: { userId: authorId, communityId } })
    await prisma.communityMembership.create({ data: { userId: otherId, communityId } })

    await authorCtx.dispose()
    await otherCtx.dispose()
  })

  test.afterAll(async () => {
    try {
      await prisma.community.deleteMany({ where: { id: communityId } })
      await prisma.post.deleteMany({ where: { id: postId } })
      await prisma.user.deleteMany({ where: { id: { in: [authorId, otherId] } } })
    } finally {
      await prisma?.$disconnect()
    }
  })

  test('PATCH /api/posts/[id]/comments/[commentId]: author can edit, non-author gets 403, unknown id gets 404', async ({ playwright }) => {
    const authorCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: authorStorageState })
    const otherCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: otherStorageState })

    const createRes = await authorCtx.post(`/api/posts/${postId}/comments`, { data: { content: `phase26 comment ${stamp}` } })
    expect(createRes.status()).toBe(201)
    const commentId = (await createRes.json()).comment.id as string

    const forbidden = await otherCtx.patch(`/api/posts/${postId}/comments/${commentId}`, { data: { content: 'hijacked edit' } })
    expect(forbidden.status()).toBe(403)

    const notFound = await authorCtx.patch(`/api/posts/${postId}/comments/does-not-exist`, { data: { content: 'edit' } })
    expect(notFound.status()).toBe(404)

    const badBody = await authorCtx.patch(`/api/posts/${postId}/comments/${commentId}`, { data: { content: '' } })
    expect(badBody.status()).toBe(400)

    const editedContent = `phase26 comment EDITED ${stamp}`
    const ok = await authorCtx.patch(`/api/posts/${postId}/comments/${commentId}`, { data: { content: editedContent } })
    expect(ok.status()).toBe(200)
    const okBody = await ok.json()
    expect(okBody.comment.content).toBe(editedContent)

    const persisted = await prisma.postComment.findUniqueOrThrow({ where: { id: commentId } })
    expect(persisted.content).toBe(editedContent)

    await authorCtx.dispose()
    await otherCtx.dispose()
  })

  test('DELETE /api/posts/[id]/comments/[commentId]: non-author gets 403, author delete cascades replies and decrements Post.commentCount correctly', async ({ playwright }) => {
    const authorCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: authorStorageState })
    const otherCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: otherStorageState })

    const beforeCommentCount = (await prisma.post.findUniqueOrThrow({ where: { id: postId } })).commentCount

    const topRes = await authorCtx.post(`/api/posts/${postId}/comments`, { data: { content: `phase26 parent comment ${stamp}` } })
    expect(topRes.status()).toBe(201)
    const topCommentId = (await topRes.json()).comment.id as string

    const replyRes = await otherCtx.post(`/api/posts/${postId}/comments`, { data: { content: `phase26 reply ${stamp}`, parentId: topCommentId } })
    expect(replyRes.status()).toBe(201)

    // commentCount increments for both the top-level comment and its reply.
    expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(beforeCommentCount + 2)

    const forbidden = await otherCtx.delete(`/api/posts/${postId}/comments/${topCommentId}`)
    expect(forbidden.status()).toBe(403)

    const ok = await authorCtx.delete(`/api/posts/${postId}/comments/${topCommentId}`)
    expect(ok.status()).toBe(200)
    expect((await ok.json()).success).toBe(true)

    expect(await prisma.postComment.count({ where: { id: topCommentId } })).toBe(0)
    // The DB-level cascade (PostComment.parent onDelete: Cascade) removes
    // replies too, and the route must decrement commentCount for both.
    expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).commentCount).toBe(beforeCommentCount)

    const notFound = await authorCtx.delete(`/api/posts/${postId}/comments/${topCommentId}`)
    expect(notFound.status()).toBe(404)

    await authorCtx.dispose()
    await otherCtx.dispose()
  })

  test('DELETE /api/communities/[id]/posts/[postId]: author-only, 404 for unknown post', async ({ playwright }) => {
    const authorCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: authorStorageState })
    const otherCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: otherStorageState })

    const createRes = await authorCtx.post(`/api/communities/${communityId}/posts`, { data: { content: `phase26 community post ${stamp}` } })
    expect(createRes.status()).toBe(201)
    const communityPostId = (await createRes.json()).post.id as string

    const forbidden = await otherCtx.delete(`/api/communities/${communityId}/posts/${communityPostId}`)
    expect(forbidden.status()).toBe(403)
    expect(await prisma.communityPost.count({ where: { id: communityPostId } })).toBe(1)

    const notFound = await authorCtx.delete(`/api/communities/${communityId}/posts/does-not-exist`)
    expect(notFound.status()).toBe(404)

    const ok = await authorCtx.delete(`/api/communities/${communityId}/posts/${communityPostId}`)
    expect(ok.status()).toBe(200)
    expect(await prisma.communityPost.count({ where: { id: communityPostId } })).toBe(0)

    await authorCtx.dispose()
    await otherCtx.dispose()
  })

  test('DELETE /api/communities/[id]/posts/[postId]/replies/[replyId]: author-only', async ({ playwright }) => {
    const authorCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: authorStorageState })
    const otherCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: otherStorageState })

    const postRes = await authorCtx.post(`/api/communities/${communityId}/posts`, { data: { content: `phase26 reply-host post ${stamp}` } })
    expect(postRes.status()).toBe(201)
    const communityPostId = (await postRes.json()).post.id as string

    const replyRes = await otherCtx.post(`/api/communities/${communityId}/posts/${communityPostId}/replies`, { data: { content: `phase26 community reply ${stamp}` } })
    expect(replyRes.status()).toBe(201)
    const replyId = (await replyRes.json()).reply.id as string

    const forbidden = await authorCtx.delete(`/api/communities/${communityId}/posts/${communityPostId}/replies/${replyId}`)
    expect(forbidden.status()).toBe(403)

    const ok = await otherCtx.delete(`/api/communities/${communityId}/posts/${communityPostId}/replies/${replyId}`)
    expect(ok.status()).toBe(200)
    expect(await prisma.communityPostReply.count({ where: { id: replyId } })).toBe(0)

    await authorCtx.delete(`/api/communities/${communityId}/posts/${communityPostId}`)
    await authorCtx.dispose()
    await otherCtx.dispose()
  })

  test('DELETE /api/communities/[id]/discussions/[discussionId]: author-only, null-author discussions are never deletable', async ({ playwright }) => {
    const authorCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: authorStorageState })
    const otherCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: otherStorageState })

    // No creation API exists for CommunityDiscussion — seeded directly
    // through Prisma, same as phase23's convention.
    const discussion = await prisma.communityDiscussion.create({
      data: { communityId, authorId, title: `Phase26 Discussion ${stamp}` },
    })
    const systemDiscussion = await prisma.communityDiscussion.create({
      data: { communityId, authorId: null, title: `Phase26 System Discussion ${stamp}` },
    })

    const forbidden = await otherCtx.delete(`/api/communities/${communityId}/discussions/${discussion.id}`)
    expect(forbidden.status()).toBe(403)

    // A discussion with no author (null) can never be deleted through this
    // route — strict inequality correctly rejects everyone, not just non-owners.
    const noOwner = await authorCtx.delete(`/api/communities/${communityId}/discussions/${systemDiscussion.id}`)
    expect(noOwner.status()).toBe(403)

    const notFound = await authorCtx.delete(`/api/communities/${communityId}/discussions/does-not-exist`)
    expect(notFound.status()).toBe(404)

    const ok = await authorCtx.delete(`/api/communities/${communityId}/discussions/${discussion.id}`)
    expect(ok.status()).toBe(200)
    expect(await prisma.communityDiscussion.count({ where: { id: discussion.id } })).toBe(0)

    await prisma.communityDiscussion.deleteMany({ where: { id: systemDiscussion.id } })
    await authorCtx.dispose()
    await otherCtx.dispose()
  })

  test('DELETE /api/communities/[id]/discussions/[discussionId]/replies/[replyId]: author-only, and reply-delete does not remove the parent discussion', async ({ playwright }) => {
    const authorCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: authorStorageState })
    const otherCtx = await playwright.request.newContext({ baseURL: TEST_BASE_URL, storageState: otherStorageState })

    const discussion = await prisma.communityDiscussion.create({
      data: { communityId, authorId, title: `Phase26 Reply-Host Discussion ${stamp}` },
    })

    const replyRes = await otherCtx.post(`/api/communities/${communityId}/discussions/${discussion.id}/replies`, { data: { content: `phase26 discussion reply ${stamp}` } })
    expect(replyRes.status()).toBe(201)
    const replyId = (await replyRes.json()).reply.id as string

    const forbidden = await authorCtx.delete(`/api/communities/${communityId}/discussions/${discussion.id}/replies/${replyId}`)
    expect(forbidden.status()).toBe(403)

    const ok = await otherCtx.delete(`/api/communities/${communityId}/discussions/${discussion.id}/replies/${replyId}`)
    expect(ok.status()).toBe(200)
    expect(await prisma.communityDiscussionReply.count({ where: { id: replyId } })).toBe(0)
    expect(await prisma.communityDiscussion.count({ where: { id: discussion.id } })).toBe(1)

    await prisma.communityDiscussion.deleteMany({ where: { id: discussion.id } })
    await authorCtx.dispose()
    await otherCtx.dispose()
  })
})
