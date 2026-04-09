import type { Conversation, Message } from '@/types/social'

// ─── Mock conversation pool ───────────────────────────────────────────────────
// Source planet: p-aelion (the demo user).
// Conversation ID = other planet's ID (used as route param in /messages/[id]).

export const mockConversations: Conversation[] = [
  {
    id:             'p-driftan',
    participantIds: ['p-aelion', 'p-driftan'],
    lastMessage: {
      id:      'msg-d4',
      fromId:  'p-driftan',
      toId:    'p-aelion',
      content: "There's a quality of light in Taipei right now that I keep trying to describe and failing.",
      type:    'text',
      sentAt:  '2026-03-30T04:00:00Z',
    },
    unreadCount:        0,
    orbitColor:         'purple',
    connectionStrength: 74,
    startedAt:  '2026-03-08T22:00:00Z',
    updatedAt:  '2026-03-30T04:00:00Z',
  },
  {
    id:             'p-lumira',
    participantIds: ['p-aelion', 'p-lumira'],
    lastMessage: {
      id:      'msg-l3',
      fromId:  'p-lumira',
      toId:    'p-aelion',
      content: "Sent you a fragment from something I'm working on.",
      type:    'text',
      sentAt:  '2026-03-29T09:15:00Z',
    },
    unreadCount:        1,
    orbitColor:         'green',
    connectionStrength: 52,
    startedAt:  '2026-03-22T14:00:00Z',
    updatedAt:  '2026-03-29T09:15:00Z',
  },
  {
    id:             'p-vaelith',
    participantIds: ['p-aelion', 'p-vaelith'],
    lastMessage: {
      id:      'msg-v1',
      fromId:  'p-aelion',
      toId:    'p-vaelith',
      content: 'Your planet has a quality of stillness I recognize. Sending a first signal.',
      type:    'beam',
      sentAt:  '2026-03-27T16:30:00Z',
    },
    unreadCount:        0,
    orbitColor:         'red',
    connectionStrength: 20,
    startedAt:  '2026-03-27T16:30:00Z',
    updatedAt:  '2026-03-27T16:30:00Z',
  },
]

// ─── Per-conversation message sets ────────────────────────────────────────────

export const mockMessageSets: Record<string, Message[]> = {
  'p-driftan': [
    {
      id: 'msg-d1', fromId: 'p-aelion', toId: 'p-driftan', type: 'text',
      content: "I've been thinking about the W.G. Sebald thing you mentioned — the way he folds photographs into prose without ever explaining them.",
      sentAt: '2026-03-26T22:00:00Z', readAt: '2026-03-27T01:10:00Z',
    },
    {
      id: 'msg-d2', fromId: 'p-driftan', toId: 'p-aelion', type: 'text',
      content: "Yes — the photographs that are almost the wrong size. Never quite filling the page. Like memory itself: almost right, but not quite.",
      sentAt: '2026-03-27T02:15:00Z', readAt: '2026-03-27T08:00:00Z',
    },
    {
      id: 'msg-d3', fromId: 'p-aelion', toId: 'p-driftan', type: 'text',
      content: "There's a particular quality to things that don't fit their containers. The meaning lives in the gap.",
      sentAt: '2026-03-27T20:40:00Z', readAt: '2026-03-28T03:00:00Z',
    },
    {
      id: 'msg-d4', fromId: 'p-driftan', toId: 'p-aelion', type: 'text',
      content: "There's a quality of light in Taipei right now that I keep trying to describe and failing.",
      sentAt: '2026-03-30T04:00:00Z',
    },
  ],

  'p-lumira': [
    {
      id: 'msg-l1', fromId: 'p-lumira', toId: 'p-aelion', type: 'beam',
      content: 'Your planet and mine share something in the orbit. Sending a first signal.',
      sentAt: '2026-03-22T14:00:00Z', readAt: '2026-03-22T18:00:00Z',
    },
    {
      id: 'msg-l2', fromId: 'p-aelion', toId: 'p-lumira', type: 'text',
      content: "Received. I've been reading your exploration traces — the warm nomads cluster is something.",
      sentAt: '2026-03-23T09:30:00Z', readAt: '2026-03-23T14:00:00Z',
    },
    {
      id: 'msg-l3', fromId: 'p-lumira', toId: 'p-aelion', type: 'text',
      content: "Sent you a fragment from something I'm working on.",
      sentAt: '2026-03-29T09:15:00Z',
    },
  ],

  'p-vaelith': [
    {
      id: 'msg-v1', fromId: 'p-aelion', toId: 'p-vaelith', type: 'beam',
      content: 'Your planet has a quality of stillness I recognize. Sending a first signal.',
      sentAt: '2026-03-27T16:30:00Z',
    },
  ],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getConversation(id: string): Conversation | undefined {
  return mockConversations.find((c) => c.id === id)
}

export function getMessages(conversationId: string): Message[] {
  return mockMessageSets[conversationId] ?? []
}

/** Other participant ID given current user and conversation */
export function getOtherPlanetId(conv: Conversation, myId: string): string {
  return conv.participantIds.find((id) => id !== myId) ?? conv.participantIds[1]
}
