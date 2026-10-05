export const REACTION_CHOICES = [['thumbsUp', '👍'], ['heart', '❤️'], ['joy', '😂'], ['surprised', '😮'], ['sad', '😢'], ['sparkles', '✨']] as const
export const REACTION_EMOJI = ['👍', '❤️', '😂', '😮', '😢', '✨'] as const
export type ReactionEmoji = typeof REACTION_EMOJI[number]
export type ReactionSummary = { emoji: ReactionEmoji; count: number; mine: boolean }
export type MessageQuote = { available: false } | { available: true; id: string; fromId: string; type: 'text' | 'image' | 'share'; excerpt?: string }
export type InteractionState = { id: string; reactionVersion?: number; reactions?: ReactionSummary[] }
// Preserve newer confirmed reactions against a response captured before a mutation.
export function preserveReactionState<T extends InteractionState>(previous: T | undefined, incoming: T): T {
  return previous && (previous.reactionVersion ?? 0) > (incoming.reactionVersion ?? 0) ? { ...incoming, reactionVersion: previous.reactionVersion, reactions: previous.reactions } : incoming
}

export function quotePreview(message: { id: string; fromId: string; type: string; content: string; image?: unknown; share?: { available: boolean } } | undefined): MessageQuote {
  if (!message) return { available: false }
  if (message.type === 'text') return { available: true, id: message.id, fromId: message.fromId, type: 'text', excerpt: [...message.content].slice(0,160).join('') }
  if (message.type === 'image' && message.image) return { available: true, id: message.id, fromId: message.fromId, type: 'image' }
  if (message.type === 'share' && message.share?.available) return { available: true, id: message.id, fromId: message.fromId, type: 'share' }
  return { available: false }
}
