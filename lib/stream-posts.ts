import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { PostCategory, type Post } from '@prisma/client'
import { getOptionalUserSession } from '@/lib/session'
import { planetConfigFromUser, planetConfigFromVisual } from '@/lib/user-planet-config'
import type { StreamComment } from '@/types/stream'

export const POST_PAGE_SIZE = 20
export const COMMENT_PAGE_SIZE = 20
export const MAX_POST_CONTENT_LENGTH = 2000
export const MAX_COMMENT_LENGTH = 500
export const MAX_MEDIA_ITEMS = 9
export const IMAGE_MAX_SIZE = 5 * 1024 * 1024
export const VIDEO_MAX_SIZE = 50 * 1024 * 1024

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'stream')
const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const VIDEO_MIME_TO_EXTENSION: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
}

export type StreamPostInclude = Post & {
  author: StreamAuthorInclude
  likes?: { userId: string }[]
  comments?: StreamCommentInclude[]
}

export type StreamAuthorInclude = {
  id: string
  name: string
  planetTexture: string | null
  planetTint: string
  planetAtmoColor: string
  planetAtmoDensity: number
  planetHasRing: boolean
  planetRingColor: string
  planetRotationSpeed: number
  planetCloudOpacity: number
  planetCustomTexture: string | null
  userLevel: number
  planets?: StreamActivePlanetInclude[]
}

export type StreamActivePlanetInclude = {
  id: string
  mood: string
  lifestyle: string
  coreThemes: string[]
  visual: unknown
}

export type StreamCommentInclude = {
  id: string
  postId: string
  parentId: string | null
  content: string
  likeCount: number
  createdAt: Date
  author: StreamAuthorInclude
  likes?: { userId: string }[]
  replies?: StreamCommentInclude[]
}

export async function getOptionalSession() {
  return getOptionalUserSession()
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

export function parsePostCategory(value: unknown) {
  if (typeof value !== 'string' || !value) return PostCategory.GENERAL
  const normalized = value.toUpperCase()
  if (Object.values(PostCategory).includes(normalized as PostCategory)) return normalized as PostCategory
  return PostCategory.GENERAL
}

export function normalizeTags(value: unknown, content = '') {
  const manualTags = typeof value === 'string'
    ? value.split(',').map((tag) => tag.trim())
    : []
  const contentTags = Array.from(content.matchAll(/#([\p{L}\p{N}_-]{1,32})/gu)).map((match) => match[1])

  return Array.from(new Set([...manualTags, ...contentTags]
    .map((tag) => tag.replace(/^#/, '').replace(/[^\p{L}\p{N}_-]/gu, '').trim())
    .filter(Boolean)
    .slice(0, 12)))
}

function shouldUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
}

async function storeMedia({ bytes, contentType, filename }: { bytes: Buffer; contentType: string; filename: string }) {
  if (shouldUseBlobStorage()) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`stream/${filename}`, bytes, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    })
    return blob.url
  }

  if (isProductionRuntime()) throw new Error('missing_blob_storage')

  const filePath = path.join(UPLOAD_DIR, filename)
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(filePath, bytes)
  return `/uploads/stream/${filename}`
}

export async function uploadStreamMedia(files: File[], userId: string) {
  if (files.length > MAX_MEDIA_ITEMS) throw new Error('too_many_files')

  const mediaUrls: string[] = []
  const mediaTypes: ('image' | 'video')[] = []

  for (const file of files) {
    const imageExtension = IMAGE_MIME_TO_EXTENSION[file.type]
    const videoExtension = VIDEO_MIME_TO_EXTENSION[file.type]
    const mediaType = imageExtension ? 'image' : videoExtension ? 'video' : null
    const extension = imageExtension ?? videoExtension

    if (!mediaType || !extension) throw new Error('invalid_media_type')
    if (mediaType === 'image' && file.size > IMAGE_MAX_SIZE) throw new Error('image_too_large')
    if (mediaType === 'video' && file.size > VIDEO_MAX_SIZE) throw new Error('video_too_large')
    // TODO Phase 8: add video transcoding for web optimization

    const bytes = Buffer.from(await file.arrayBuffer())
    const filename = `${userId}-${randomUUID()}.${extension}`
    mediaUrls.push(await storeMedia({ bytes, contentType: file.type, filename }))
    mediaTypes.push(mediaType)
  }

  return { mediaUrls, mediaTypes }
}

export function serializeComment(comment: StreamCommentInclude, userId?: string | null): StreamComment {
  const author = serializeAuthor(comment.author)

  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    content: comment.content,
    likeCount: comment.likeCount,
    createdAt: comment.createdAt.toISOString(),
    author,
    userHasLiked: userId ? (comment.likes?.some((like) => like.userId === userId) ?? false) : false,
    ...(comment.replies ? { replies: comment.replies.map((reply) => serializeComment(reply, userId)) } : {}),
  }
}

export function serializePost(post: StreamPostInclude, userId?: string | null) {
  const author = serializeAuthor(post.author)

  return {
    id: post.id,
    authorId: post.authorId,
    content: post.content,
    mediaUrls: post.mediaUrls,
    mediaTypes: post.mediaTypes,
    tags: post.tags,
    category: post.category,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author,
    userHasLiked: userId ? (post.likes?.some((like) => like.userId === userId) ?? false) : false,
    ...(post.comments ? { comments: post.comments.map((comment) => serializeComment(comment, userId)) } : {}),
  }
}

function serializeAuthor(author: StreamAuthorInclude) {
  const planetConfig = serializeAuthorPlanetConfig(author)

  return {
    id: author.id,
    name: author.name,
    planetId: author.planets?.[0]?.id ?? null,
    planetTexture: planetConfig.baseTexture,
    planetConfig,
    tintColor: planetConfig.tintColor,
    userLevel: author.userLevel,
  }
}

function serializeAuthorPlanetConfig(author: StreamAuthorInclude) {
  const userPlanetConfig = planetConfigFromUser(author)
  if (userPlanetConfig) return userPlanetConfig

  const activePlanet = author.planets?.[0]
  if (activePlanet) {
    return planetConfigFromVisual(activePlanet)
  }

  return {
    baseTexture: author.planetTexture ?? 'jupiter.jpg',
    tintColor: author.planetTint,
    atmosphereColor: author.planetAtmoColor,
    atmosphereDensity: author.planetAtmoDensity,
    hasRing: author.planetHasRing,
    ringColor: author.planetRingColor,
    rotationSpeed: author.planetRotationSpeed,
    cloudOpacity: author.planetCloudOpacity,
    customTextureUrl: getAvailableCustomTextureUrl(author.planetCustomTexture),
  }
}

function getAvailableCustomTextureUrl(customTextureUrl: string | null) {
  if (!customTextureUrl) return undefined
  if (/^https?:\/\//.test(customTextureUrl)) return customTextureUrl
  if (!customTextureUrl.startsWith('/')) return undefined

  const localPath = path.join(process.cwd(), 'public', customTextureUrl.replace(/^\/+/, ''))
  return existsSync(localPath) ? customTextureUrl : undefined
}