import type { PlanetConfig } from '@/types/planet'

export type StreamMediaType = 'image' | 'video'

export type StreamPostCategory = 'GENERAL' | 'NATURE' | 'NIGHT' | 'TRAVEL' | 'THOUGHTS' | 'MUSIC' | 'ART' | 'COSMIC'

export interface StreamAuthor {
  id: string
  name: string
  planetId: string | null
  planetTexture: string | null
  planetConfig: PlanetConfig | null
  tintColor: string
  userLevel: number
}

export interface StreamComment {
  id: string
  postId: string
  parentId: string | null
  content: string
  likeCount: number
  createdAt: string
  author: StreamAuthor
  userHasLiked: boolean
  replies?: StreamComment[]
}

export interface StreamPost {
  id: string
  authorId: string
  content: string
  mediaUrls: string[]
  mediaTypes: StreamMediaType[]
  tags: string[]
  category: StreamPostCategory
  likeCount: number
  commentCount: number
  createdAt: string
  updatedAt: string
  author: StreamAuthor
  userHasLiked: boolean
  comments?: StreamComment[]
  contextRestricted?: boolean
  editableContext?: { galaxyId: string | null; eventId: string | null }
  context?: { galaxy: { id: string; name: string; slug: string; href: string }; event: { id: string; title: string; date: string; status: string; href: string } | null } | null
}