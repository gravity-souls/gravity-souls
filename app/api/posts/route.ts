import { type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { grantXP } from '@/lib/grantXP'
import { requireUser } from '@/lib/session'
import {
  MAX_POST_CONTENT_LENGTH,
  POST_PAGE_SIZE,
  getOptionalSession,
  jsonError,
  normalizeTags,
  parsePostCategory,
  serializePost,
  uploadStreamMedia,
} from '@/lib/stream-posts'

export const runtime = 'nodejs'

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

export async function GET(request: Request) {
  const session = await getOptionalSession()
  const userId = session?.user.id ?? null
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const tag = url.searchParams.get('tag')?.replace(/^#/, '').trim()
  const search = url.searchParams.get('search')?.trim()
  const authorId = url.searchParams.get('authorId')?.trim()
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? POST_PAGE_SIZE) || POST_PAGE_SIZE))

  const where: Prisma.PostWhereInput = {}
  if (category && category !== 'ALL') where.category = parsePostCategory(category)
  if (tag) where.tags = { has: tag }
  if (authorId) where.authorId = authorId
  if (search) {
    const normalizedSearchTag = search.replace(/^#/, '').trim()
    where.OR = [
      { content: { contains: search, mode: 'insensitive' } },
      { tags: { has: normalizedSearchTag } },
    ]
  }

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      author: { select: AUTHOR_SELECT },
      likes: userId ? { where: { userId }, select: { userId: true } } : { take: 0, select: { userId: true } },
    },
  })

  const nextPost = posts.length > limit ? posts.pop() : null

  return Response.json({
    posts: posts.map((post) => serializePost(post, userId)),
    nextCursor: nextPost?.id ?? null,
  })
}

export async function POST(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return jsonError('Post request could not be read', 400)
  }

  const content = String(formData.get('content') ?? '').trim()
  const category = parsePostCategory(formData.get('category'))
  const tags = normalizeTags(formData.get('tags'), content)
  const files = formData.getAll('media').filter((item): item is File => item instanceof File && item.size > 0)

  if (!content) return jsonError('Post content is required', 400)
  if (content.length > MAX_POST_CONTENT_LENGTH) return jsonError('Post content must be 2000 characters or fewer', 400)

  let mediaUrls: string[] = []
  let mediaTypes: ('image' | 'video')[] = []
  try {
    const uploaded = await uploadStreamMedia(files, session.user.id)
    mediaUrls = uploaded.mediaUrls
    mediaTypes = uploaded.mediaTypes
  } catch (error) {
    if (error instanceof Error && error.message === 'too_many_files') return jsonError('Posts can include up to 9 media items', 400)
    if (error instanceof Error && error.message === 'invalid_media_type') return jsonError('Media must be JPG, PNG, WEBP, MP4, or WEBM', 400)
    if (error instanceof Error && error.message === 'image_too_large') return jsonError('Images must be 5MB or smaller', 400)
    if (error instanceof Error && error.message === 'video_too_large') return jsonError('Videos must be 50MB or smaller', 400)
    if (error instanceof Error && error.message === 'missing_blob_storage') return jsonError('Production uploads need Vercel Blob storage. Add BLOB_READ_WRITE_TOKEN in your deployment.', 500)
    return jsonError('Media upload failed', 500)
  }

  const post = await prisma.post.create({
    data: {
      authorId: session.user.id,
      content,
      mediaUrls,
      mediaTypes,
      tags,
      category,
    },
    include: {
      author: { select: AUTHOR_SELECT },
      likes: { where: { userId: session.user.id }, select: { userId: true } },
    },
  })

  await grantXP(session.user.id, 'POST_CREATED')

  return Response.json({ post: serializePost(post, session.user.id) }, { status: 201 })
}