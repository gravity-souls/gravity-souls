import type { SharedCard } from './chat-share-types'
import type { ChatImageCard } from './chat-image-types'
import type { MessageQuote, ReactionSummary } from './chat-interaction-types'
export type ChatMessage = {
  id: string; fromId: string; content: string; type: string; sentAt: string; readAt?: string
  image?: ChatImageCard | null; share?: SharedCard; quote?: MessageQuote | null
  reactionVersion?: number; reactions?: ReactionSummary[]
}
