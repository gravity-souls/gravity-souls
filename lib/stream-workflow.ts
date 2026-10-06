import { z } from 'zod'
import type { StreamPost } from '@/types/stream'

const planetConfig = z.object({
  name: z.string().optional(), desc: z.string().optional(), baseTexture: z.string(),
  tintColor: z.string(), atmosphereColor: z.string(), atmosphereDensity: z.number(),
  hasRing: z.boolean(), ringColor: z.string(), rotationSpeed: z.number(),
  cloudOpacity: z.number(), customTextureUrl: z.string().optional(),
})
const author = z.object({
  id: z.string(), name: z.string(), planetId: z.string().nullable(),
  planetTexture: z.string().nullable(), planetConfig: planetConfig.nullable(),
  tintColor: z.string(), userLevel: z.number(),
})
const comment = z.object({
  id: z.string(), postId: z.string(), parentId: z.string().nullable(), content: z.string(),
  likeCount: z.number(), createdAt: z.string(), author, userHasLiked: z.boolean(),
})
export const streamPostSchema: z.ZodType<StreamPost> = z.object({
  id: z.string().min(1), authorId: z.string(), content: z.string(),
  mediaUrls: z.array(z.string()), mediaTypes: z.array(z.enum(['image', 'video'])),
  tags: z.array(z.string()), category: z.enum(['GENERAL', 'NATURE', 'NIGHT', 'TRAVEL', 'THOUGHTS', 'MUSIC', 'ART', 'COSMIC']),
  likeCount: z.number(), commentCount: z.number(), createdAt: z.string(),
  updatedAt: z.string(), author, userHasLiked: z.boolean(),
  comments: z.array(comment.extend({ replies: z.array(comment).optional() })).optional(),
  contextRestricted: z.boolean().optional(),
  editableContext: z.object({ galaxyId: z.string().nullable(), eventId: z.string().nullable() }).optional(),
  context: z.object({
    galaxy: z.object({ id: z.string(), name: z.string(), slug: z.string(), href: z.string() }),
    event: z.object({ id: z.string(), title: z.string(), date: z.string(), status: z.string(), href: z.string() }).nullable(),
  }).nullable().optional(),
})
export const streamPageSchema = z.object({ posts: z.array(streamPostSchema), nextCursor: z.string().nullable() })

export function postErrorKey(status: number, error: unknown) {
  if (status === 401) return 'authError'
  if (status === 429 || error === 'rateLimited') return 'rateError'
  if (['contextUnavailable', 'contextMismatch', 'notFound'].includes(String(error))) return 'contextError'
  if (status === 403) return 'permissionError'
  if (error === 'Post content is required') return 'validationRequired'
  if (error === 'Post content must be 2000 characters or fewer') return 'validationMax'
  if (error === 'Posts can include up to 9 media items') return 'mediaCountError'
  if (error === 'Media must be JPG, PNG, WEBP, MP4, or WEBM') return 'mediaTypeError'
  if (error === 'Images must be 5MB or smaller') return 'imageSizeError'
  if (error === 'Videos must be 50MB or smaller') return 'videoSizeError'
  if (status === 400 || status === 413) return 'validationError'
  return 'sendError'
}

export function matchesPost(post: StreamPost, filters: { category?: string; tag?: string; search?: string; authorId?: string }) {
  const search = filters.search?.trim()
  return (!filters.category || filters.category === 'ALL' || post.category === filters.category)
    && (!filters.authorId || post.authorId === filters.authorId)
    && (!filters.tag || post.tags.includes(filters.tag.replace(/^#/, '').trim()))
    && (!search || post.content.toLowerCase().includes(search.toLowerCase()) || post.tags.includes(search.replace(/^#/, '').trim()))
}
