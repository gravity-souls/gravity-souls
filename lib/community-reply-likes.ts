import { readJson, safeApiError } from '@/lib/api-input'
import { deny, galaxyAccess } from '@/lib/galaxy-workflow'
import { communityReplyLikeIds, communityReplyLikeSchema } from '@/lib/input-schemas'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'
import { requireUser } from '@/lib/session'
import { canViewProfile } from '@/lib/visibility'

export async function setCommunityReplyLiked(
  request: Request,
  kind: 'posts' | 'discussions',
  ids: { id: string; parentId: string; replyId: string },
) {
  try {
    const { user } = await requireUser()
    const scoped = communityReplyLikeIds.safeParse(ids)
    if (!scoped.success) deny('invalidInput', 400)
    const { id, parentId, replyId } = scoped.data
    const input = await readJson(request, communityReplyLikeSchema)
    if (!input.ok) return input.response
    const limit = RATE_LIMITS.MESSAGE_REACTION
    if (!await checkRateLimit(rateLimitKey('MESSAGE_REACTION', user.id), limit.limit, limit.windowMs)) deny('rateLimited', 429)
    const result = await prisma.$transaction(async tx => {
      // Account deletion takes the user lock before community locks as well.
      await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${user.id} FOR NO KEY UPDATE`
      const actor = await tx.user.findUnique({ where: { id: user.id }, select: { deletedAt: true } })
      if (!actor || actor.deletedAt) deny('Unauthorized', 401)
      const access = await galaxyAccess(tx, id, user, true)
      if (!access.membership) deny('joinFirst')
      const reply = kind === 'posts'
        ? await tx.communityPostReply.findFirst({
          where: { id: replyId, postId: parentId, post: { communityId: id } },
          select: { authorId: true, post: { select: { authorId: true } } },
        })
        : await tx.communityDiscussionReply.findFirst({
          where: { id: replyId, discussionId: parentId, discussion: { communityId: id } },
          select: { authorId: true, discussion: { select: { authorId: true } } },
        })
      if (!reply) deny('notFound', 404)
      const parentAuthorId = 'post' in reply ? reply.post.authorId : reply.discussion.authorId
      for (const authorId of new Set([parentAuthorId, reply.authorId])) {
        if (authorId && !await canViewProfile(user.id, authorId, tx)) deny('notFound', 404)
      }
      const data = { replyId, userId: user.id }
      // The community lock serializes like mutations with reply/parent deletion.
      if (kind === 'posts') {
        if (input.data.liked) await tx.communityPostReplyLike.upsert({ where: { replyId_userId: data }, create: data, update: {} })
        else await tx.communityPostReplyLike.deleteMany({ where: data })
        return { liked: input.data.liked, likes: await tx.communityPostReplyLike.count({ where: { replyId } }) }
      }
      if (input.data.liked) await tx.communityDiscussionReplyLike.upsert({ where: { replyId_userId: data }, create: data, update: {} })
      else await tx.communityDiscussionReplyLike.deleteMany({ where: data })
      return { liked: input.data.liked, likes: await tx.communityDiscussionReplyLike.count({ where: { replyId } }) }
    })
    return Response.json(result)
  } catch (error) { return safeApiError(error) }
}
