'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import GlowButton from '@/components/ui/GlowButton'
import OrbitCard from '@/components/ui/OrbitCard'

// --- Types for API response ---

interface ConvPlanet {
  id: string
  name: string
  avatarSymbol: string
  visual: { coreColor: string; accentColor: string }
  mood: string
}

interface ConvLastMessage {
  id: string
  content: string
  type: string
  senderId: string
  createdAt: string
}

interface ConversationItem {
  id: string
  otherUser: { id: string; name: string }
  otherPlanet: ConvPlanet | null
  lastMessage: ConvLastMessage | null
  unreadCount: number
  lastMessageAt: string | null
  createdAt: string
}

// --- Conversation card -------------------------------------------------------

function ConversationCard({ conv }: { conv: ConversationItem }) {
  const planet = conv.otherPlanet
  const color = planet?.visual?.coreColor ?? '#a78bfa'
  const preview = conv.lastMessage?.content ?? 'No messages yet'

  return (
    <Link href={`/messages/${conv.id}`}>
      <OrbitCard hoverable glowColor={color} className="flex items-center gap-4 p-4">
        {/* Planet avatar */}
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
          style={{
            background: `radial-gradient(circle at 38% 32%, ${color}38, ${color}10)`,
            boxShadow: `0 0 0 1px ${color}28`,
          }}
        >
          {planet?.avatarSymbol ?? '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
              {planet?.name ?? conv.otherUser.name}
            </h3>
            {conv.unreadCount > 0 && (
              <span
                className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: color, color: '#000' }}
              >
                {conv.unreadCount}
              </span>
            )}
          </div>
          <p
            className="text-xs truncate mt-0.5"
            style={{ color: 'var(--ink)', opacity: 0.6 }}
          >
            {preview}
          </p>
        </div>

        {conv.lastMessageAt && (
          <span className="shrink-0 text-[10px]" style={{ color: 'var(--ghost)' }}>
            {new Date(conv.lastMessageAt).toLocaleDateString()}
          </span>
        )}
      </OrbitCard>
    </Link>
  )
}

// --- MessagesPage -------------------------------------------------------------

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/conversations')
        if (res.ok) {
          const data = await res.json()
          setConversations(data)
        } else if (res.status === 401) {
          setAuthed(false)
        }
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
        <SectionHeader
          eyebrow="Signals"
          level={1}
          title="Messages"
          subtitle="Communication beams between planets. Signals sent, signals received."
        />

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--star)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {!loading && !authed && (
          <EmptyState
            symbol="&#9676;"
            title="Sign in required"
            subtitle="Sign in to view your messages."
            action={<GlowButton href="/sign-in" variant="primary">Sign in</GlowButton>}
            className="mt-8"
          />
        )}

        {!loading && authed && conversations.length === 0 && (
          <EmptyState
            symbol="&#8599;"
            title="No beams yet"
            subtitle="Find a planet that resonates and send it a first signal."
            action={<GlowButton href="/discover" variant="secondary">Explore the cosmos</GlowButton>}
            className="mt-8"
          />
        )}

        {!loading && authed && conversations.length > 0 && (
          <div className="mt-8 flex flex-col gap-2">
            {conversations.map((conv) => (
              <ConversationCard key={conv.id} conv={conv} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
