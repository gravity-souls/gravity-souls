import type { PlanetConfig } from '@/types/planet'

export type StreamMediaType = 'image' | 'video'

export type StreamPostCategory = 'GENERAL' | 'NATURE' | 'NIGHT' | 'TRAVEL' | 'THOUGHTS' | 'MUSIC' | 'ART' | 'COSMIC'

export interface StreamAuthor {
  id: string
  name: string
  planetId: string | null
  planetTexture: string | null
  planetConfig: PlanetConfig
  tintColor: string
  userLevel: number
}

export interface StreamComment {
  id: string
  postId: string
  content: string
  createdAt: string
  author: StreamAuthor
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
}