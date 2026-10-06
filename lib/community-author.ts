import { canViewProfile } from '@/lib/visibility'
import type { Prisma } from '@prisma/client'

export function communityReplyInclude(viewerId: string | null) {
  return {
    author: { select: { id: true, name: true, planets: { where: { active: true }, take: 1, select: { id: true, name: true } } } },
    likes: { where: { userId: viewerId ?? '' }, select: { userId: true } },
    _count: { select: { likes: true } },
  } satisfies Prisma.CommunityPostReplyInclude & Prisma.CommunityDiscussionReplyInclude
}

export async function serializeCommunityReply(reply: {
  id: string
  content: string
  createdAt: Date
  updatedAt: Date
  authorName?: string
  author: { id: string; name: string; planets: { id: string; name: string }[] } | null
  likes: { userId: string }[]
  _count: { likes: number }
}, viewerId: string | null) {
  return {
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    canDelete: !!viewerId && reply.author?.id === viewerId,
    author: await communityAuthor(reply.author, viewerId, reply.authorName),
    likes: reply._count.likes,
    likedByMe: reply.likes.length > 0,
  }
}

export async function communityAuthor<T extends { id: string; name: string }>(
  author: { id: string; name: string; planets: T[] } | null,
  viewerId: string | null,
  storedName = '',
) {
  const planet = author && await canViewProfile(viewerId, author.id) ? author.planets[0] ?? null : null
  return {
    id: author?.id ?? null,
    name: author?.name ?? storedName,
    planet,
  }
}
