import { z } from 'zod'
import { readJson, safeApiError } from '@/lib/api-input'
import { bindPostContext, postReadDenial, serializeContextPost, POST_CONTEXT_INCLUDE } from '@/lib/post-context'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { getOptionalSession, jsonError } from '@/lib/stream-posts'

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
  try {
  const session = await getOptionalSession()
  const userId = session?.user.id ?? null
  const { id } = await params

  const denied = await postReadDenial(id, userId)
  if (denied) return denied
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      ...POST_CONTEXT_INCLUDE,
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

  return Response.json({ post: await serializeContextPost(post, userId) }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
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
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const input = await readJson(request, z.object({ content: z.string().trim().min(1).max(2000), galaxyId: z.string().min(1).max(100).nullable().optional(), eventId: z.string().min(1).max(100).nullable().optional() }).strict())
    if (!input.ok) return input.response
    const post = await prisma.$transaction(async tx => {
      const existing = await tx.post.findUnique({ where: { id } })
      if (!existing) throw Response.json({ error: 'notFound' }, { status: 404 })
      if (existing.authorId !== user.id) throw Response.json({ error: 'authorOnly' }, { status: 403 })
      const context = await bindPostContext(tx, user, { galaxyId: input.data.galaxyId === undefined ? existing.galaxyId : input.data.galaxyId, eventId: input.data.eventId === undefined ? existing.eventId : input.data.eventId }, existing.eventId)
      if (existing.contextRestricted && input.data.galaxyId === undefined && input.data.eventId === undefined && !existing.galaxyId) context.contextRestricted = true
      return tx.post.update({ where: { id }, data: { content: input.data.content, ...context }, include: { ...POST_CONTEXT_INCLUDE, author: { select: AUTHOR_SELECT }, likes: { where: { userId: user.id }, select: { userId: true } } } })
    })
    return Response.json({ post: await serializeContextPost(post, user.id) })
  } catch (error) { return safeApiError(error) }
}
