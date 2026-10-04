import { PostCategory, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { safeApiError } from '@/lib/api-input'
import { bindPostContext, visiblePostWhere, serializeContextPost, POST_CONTEXT_INCLUDE } from '@/lib/post-context'
import { reward } from '@/lib/galaxy-workflow'
import { NotificationTemplates } from '@/lib/createNotification'
import { resolveLocale } from '@/lib/i18n-locales'
import { LEVEL_NAMES, clampLevel } from '@/lib/xp'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'
import { requireUser } from '@/lib/session'
import {
  MAX_POST_CONTENT_LENGTH,
  POST_PAGE_SIZE,
  getOptionalSession,
  jsonError,
  normalizeTags,
  parsePostCategory,
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
  try {
  const session = await getOptionalSession()
  const userId = session?.user.id ?? null
  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const tag = url.searchParams.get('tag')?.replace(/^#/, '').trim()
  const search = url.searchParams.get('search')?.trim()
  const authorId = url.searchParams.get('authorId')?.trim()
  const cursor = url.searchParams.get('cursor')
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? POST_PAGE_SIZE) || POST_PAGE_SIZE))

  const parsed = z.object({ category: z.string().max(20).optional(), tag: z.string().max(32).optional(), search: z.string().max(80).optional(), authorId: z.string().max(100).optional(), cursor: z.string().max(100).optional(), limit: z.coerce.number().int().min(1).max(50).optional(), galaxyId: z.string().min(1).max(100).optional(), eventId: z.string().min(1).max(100).optional() }).strict().safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
  const where: Prisma.PostWhereInput = { AND: [await visiblePostWhere(userId)] }
  if (parsed.data.galaxyId) where.galaxyId = parsed.data.galaxyId
  if (parsed.data.eventId) where.eventId = parsed.data.eventId
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

  if (cursor && !await prisma.post.findFirst({ where: { AND: [where, { id: cursor }] }, select: { id: true } })) return Response.json({ error: 'invalidCursor' }, { status: 400 })
  const posts = await prisma.post.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      ...POST_CONTEXT_INCLUDE,
      author: { select: AUTHOR_SELECT },
      likes: userId ? { where: { userId }, select: { userId: true } } : { take: 0, select: { userId: true } },
    },
  })

  const nextPost = posts.length > limit ? posts.pop() : null

  return Response.json({
    posts: await Promise.all(posts.map((post) => serializeContextPost(post, userId))),
    nextCursor: nextPost ? posts.at(-1)?.id ?? null : null,
  }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}

export async function POST(request: Request) {
  try {
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

  const allowed = new Set(['content', 'category', 'tags', 'media', 'galaxyId', 'eventId'])
  if ([...formData.keys()].some(key => !allowed.has(key))) return jsonError('invalidFields', 400)
  const contextInput = z.object({ galaxyId: z.string().min(1).max(100).nullable(), eventId: z.string().min(1).max(100).nullable() }).safeParse({ galaxyId: formData.get('galaxyId') || null, eventId: formData.get('eventId') || null })
  if (!contextInput.success) return jsonError('invalidFields', 400)
  const rate = RATE_LIMITS.POST_CREATE
  if (!await checkRateLimit(rateLimitKey('POST_CREATE', session.user.id), rate.limit, rate.windowMs)) return jsonError('rateLimited', 429)
  await prisma.$transaction(tx => bindPostContext(tx, session.user, contextInput.data))

  const content = String(formData.get('content') ?? '').trim()
  const categoryInput = z.enum(PostCategory).safeParse(formData.get('category') ?? 'GENERAL')
  if (!categoryInput.success) return jsonError('invalidFields', 400)
  const category = categoryInput.data
  const rawTags = formData.get('tags')
  if (rawTags !== null && (typeof rawTags !== 'string' || rawTags.length > 2000)) return jsonError('invalidFields', 400)
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

  const post = await prisma.$transaction(async tx => {
  const context = await bindPostContext(tx, session.user, contextInput.data)
  const created = await tx.post.create({
    data: {
      ...context,
      authorId: session.user.id,
      content,
      mediaUrls,
      mediaTypes,
      tags,
      category,
    },
    include: {
      ...POST_CONTEXT_INCLUDE,
      author: { select: AUTHOR_SELECT },
      likes: { where: { userId: session.user.id }, select: { userId: true } },
    },
  })

  const beforeReward = await tx.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { userLevel: true, language: true } })
  await reward(tx, session.user.id, 'POST_CREATED')
  const afterReward = await tx.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { userLevel: true } })
  if (afterReward.userLevel > beforeReward.userLevel) await tx.notification.create({ data: { userId: session.user.id, ...await NotificationTemplates.levelUp(afterReward.userLevel, LEVEL_NAMES[clampLevel(afterReward.userLevel)], resolveLocale(beforeReward.language)) } })
  return created
  })

  return Response.json({ post: await serializeContextPost(post, session.user.id) }, { status: 201 })
  } catch (error) { return safeApiError(error) }
}