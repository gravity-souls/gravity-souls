import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { jsonError } from '@/lib/stream-posts'

export async function POST(
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
  const userId = session.user.id
  const comment = await prisma.postComment.findUnique({ where: { id: commentId }, select: { id: true, postId: true } })
  if (!comment || comment.postId !== id) return jsonError('Comment not found', 404)

  const existing = await prisma.postCommentLike.findUnique({ where: { commentId_userId: { commentId, userId } } })

  const [, updatedComment] = existing
    ? await prisma.$transaction([
        prisma.postCommentLike.delete({ where: { commentId_userId: { commentId, userId } } }),
        prisma.postComment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } }),
      ])
    : await prisma.$transaction([
        prisma.postCommentLike.create({ data: { commentId, userId } }),
        prisma.postComment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
      ])

  return Response.json({ liked: !existing, likeCount: Math.max(0, updatedComment.likeCount) })
}
