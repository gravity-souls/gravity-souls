import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { getOptionalSession, jsonError, serializePost } from '@/lib/stream-posts'

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getOptionalSession()
  const userId = session?.user.id ?? null
  const { id } = await params

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: AUTHOR_SELECT },
      likes: userId ? { where: { userId }, select: { userId: true } } : { take: 0, select: { userId: true } },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          author: { select: AUTHOR_SELECT },
          likes: userId ? { where: { userId }, select: { userId: true } } : { take: 0, select: { userId: true } },
          replies: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: AUTHOR_SELECT },
              likes: userId ? { where: { userId }, select: { userId: true } } : { take: 0, select: { userId: true } },
            },
          },
        },
      },
    },
  })

  if (!post) return jsonError('Post not found', 404)

  return Response.json({ post: serializePost(post, userId) })
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
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } })
  if (!post) return jsonError('Post not found', 404)
  if (post.authorId !== session.user.id) return jsonError('Only the author can delete this post', 403)

  await prisma.post.delete({ where: { id } })
  return Response.json({ success: true })
}