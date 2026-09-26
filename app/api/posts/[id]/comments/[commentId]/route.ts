import { readJson } from '@/lib/api-input'
import { postCommentEditSchema } from '@/lib/input-schemas'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { jsonError, serializeComment } from '@/lib/stream-posts'

const AUTHOR_SELECT = {
  id: true,
  name: true,
  planetTexture: true,
  planetTint: true,
  planetAtmoColor: true,
  planetAtmoDensity: true,
  planetHasRing: true,
  planetRingColor: true,
  planetRotationSpeed: true,
  planetCloudOpacity: true,
  planetCustomTexture: true,
  userLevel: true,
  planets: { where: { active: true }, select: { id: true, mood: true, lifestyle: true, coreThemes: true, visual: true }, take: 1 },
} as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id, commentId } = await params

  const input = await readJson(request, postCommentEditSchema)
  if (!input.ok) return input.response

  const comment = await prisma.postComment.findUnique({ where: { id: commentId }, select: { id: true, postId: true, authorId: true } })
  if (!comment || comment.postId !== id) return jsonError('Comment not found', 404)
  if (comment.authorId !== session.user.id) return jsonError('Only the author can edit this comment', 403)

  const updated = await prisma.postComment.update({
    where: { id: commentId },
    data: { content: input.data.content },
    include: {
      author: { select: AUTHOR_SELECT },
      likes: { where: { userId: session.user.id }, select: { userId: true } },
    },
  })

  return Response.json({ comment: serializeComment(updated, session.user.id) })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id, commentId } = await params
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true, authorId: true, parentId: true },
  })
  if (!comment || comment.postId !== id) return jsonError('Comment not found', 404)
  if (comment.authorId !== session.user.id) return jsonError('Only the author can delete this comment', 403)

  // Deleting a top-level comment cascades its replies at the DB level
  // (PostComment.parent has onDelete: Cascade) — decrement Post.commentCount
  // for the comment itself plus every reply that cascades away with it, since
  // POST /api/posts/[id]/comments increments commentCount for both.
  const replyCount = comment.parentId === null
    ? await prisma.postComment.count({ where: { parentId: commentId } })
    : 0

  await prisma.$transaction([
    prisma.postComment.delete({ where: { id: commentId } }),
    prisma.post.update({ where: { id }, data: { commentCount: { decrement: 1 + replyCount } } }),
  ])

  return Response.json({ success: true })
}
