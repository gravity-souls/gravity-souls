export interface ApiCommunityReply {
  likes: number
  likedByMe: boolean
  canDelete?: boolean
  id: string | null
  content: string
  createdAt: string
  author: {
    id: string | null
    name: string
    planet: { id: string; name: string } | null
  }
}

export interface ApiCommunityDiscussion {
  canDelete?: boolean
  id: string
  title: string
  heat: number
  replies: number
  replyItems?: ApiCommunityReply[]
  nextReplyCursor?: string | null
}
