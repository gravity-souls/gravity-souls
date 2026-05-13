import { NotificationTemplates, createNotification } from '@/lib/createNotification'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { COMMENT_PAGE_SIZE, MAX_COMMENT_LENGTH, getOptionalSession, jsonError, serializeComment } from '@/lib/stream-posts'

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
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getOptionalSession()
  const userId = session?.user.id ?? null
  const { id } = await params
  const url = new URL(request.url)
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? COMMENT_PAGE_SIZE) || COMMENT_PAGE_SIZE))

  const comments = await prisma.postComment.findMany({
    where: { postId: id, parentId: null },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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
  })

  const nextComment = comments.length > limit ? comments.pop() : null

  return Response.json({
    comments: comments.map((comment) => serializeComment(comment, userId)),
    nextCursor: nextComment?.id ?? null,
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id } = await params
  const body = await request.json().catch(() => null) as { content?: unknown; parentId?: unknown } | null
  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  const requestedParentId = typeof body?.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : null

  if (!content) return jsonError('Comment content is required', 400)
  if (content.length > MAX_COMMENT_LENGTH) return jsonError('Comments must be 500 characters or fewer', 400)

  const post = await prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } })
  if (!post) return jsonError('Post not found', 404)

  const parentComment = requestedParentId
    ? await prisma.postComment.findUnique({ where: { id: requestedParentId }, select: { id: true, postId: true, authorId: true, parentId: true } })
    : null
  if (requestedParentId && (!parentComment || parentComment.postId !== id)) return jsonError('Comment not found', 404)
  const parentId = parentComment?.parentId ?? parentComment?.id ?? null

  const [, comment] = await prisma.$transaction([
    prisma.post.update({ where: { id }, data: { commentCount: { increment: 1 } }, select: { id: true } }),
    prisma.postComment.create({
      data: { postId: id, authorId: session.user.id, parentId, content },
      include: {
        author: { select: AUTHOR_SELECT },
        likes: { take: 0, select: { userId: true } },
        replies: {
          include: {
            author: { select: AUTHOR_SELECT },
            likes: { take: 0, select: { userId: true } },
          },
        },
      },
    }),
  ])

  if (parentComment && parentComment.authorId !== session.user.id) {
    await createNotification({
      userId: parentComment.authorId,
      ...NotificationTemplates.commentReplyReceived(session.user.name ?? 'Someone', `/stream/${id}`),
    })
  } else if (!parentComment && post.authorId !== session.user.id) {
    await createNotification({
      userId: post.authorId,
      ...NotificationTemplates.commentReceived(session.user.name ?? 'Someone', `/stream/${id}`),
    })
  }

  return Response.json({ comment: serializeComment(comment, session.user.id) }, { status: 201 })
}