import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { jsonError } from '@/lib/stream-posts'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id } = await params
  const userId = session.user.id
  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } })
  if (!post) return jsonError('Post not found', 404)

  const existing = await prisma.postLike.findUnique({ where: { postId_userId: { postId: id, userId } } })

  const [, updatedPost] = existing
    ? await prisma.$transaction([
        prisma.postLike.delete({ where: { postId_userId: { postId: id, userId } } }),
        prisma.post.update({ where: { id }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } }),
      ])
    : await prisma.$transaction([
        prisma.postLike.create({ data: { postId: id, userId } }),
        prisma.post.update({ where: { id }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } }),
      ])

  return Response.json({ liked: !existing, likeCount: Math.max(0, updatedPost.likeCount) })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id } = await params
  const userId = session.user.id
  const deleted = await prisma.postLike.deleteMany({ where: { postId: id, userId } })
  const post = deleted.count > 0
    ? await prisma.post.update({ where: { id }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } })
    : await prisma.post.findUnique({ where: { id }, select: { likeCount: true } })

  if (!post) return jsonError('Post not found', 404)
  return Response.json({ liked: false, likeCount: Math.max(0, post.likeCount) })
}