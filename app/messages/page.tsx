'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import GlowButton from '@/components/ui/GlowButton'
import OrbitCard from '@/components/ui/OrbitCard'
import { getConversation } from '@/lib/mock-conversations'
import { getPlanetById } from '@/lib/mock-planets'

// --- Types for API response ---

interface ConvPlanet {
  id: string
  name: string
  avatarSymbol: string
  visual: { coreColor: string; accentColor: string }
  mood: string
}

interface PlanetTarget {
  id: string
  name?: string
  userId?: string
  user?: { id?: string; name?: string }
}

interface OpenErrorState {
  message: string
  actionHref: string
  actionLabel: string
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
  return (
    <Suspense fallback={<MessagesLoading />}> 
      <MessagesInner />
    </Suspense>
  )
}

function MessagesLoading() {
  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
        <SectionHeader
          eyebrow="Signals"
          level={1}
          title="Messages"
          subtitle="Communication beams between planets. Signals sent, signals received."
        />
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--star)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    </AppShell>
  )
}

function MessagesInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetPlanetId = searchParams.get('to')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(true)
  const [openError, setOpenError] = useState<OpenErrorState | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setOpenError(null)

        if (targetPlanetId) {
          const planetRes = await fetch(`/api/planets/${encodeURIComponent(targetPlanetId)}`)
          if (cancelled) return

          if (!planetRes.ok) {
            const demoPlanet = getPlanetById(targetPlanetId)
            if (demoPlanet && getConversation(demoPlanet.id)) {
              router.replace(`/messages/${demoPlanet.id}`)
              return
            }

            setOpenError(demoPlanet
              ? {
                  message: `${demoPlanet.name} is demo data, so it has a profile but no real inbox yet. Use a planet from Discover to start a real conversation.`,
                  actionHref: `/planet/${demoPlanet.id}`,
                  actionLabel: 'View demo planet',
                }
              : {
                  message: 'This planet could not be found anymore.',
                  actionHref: '/discover',
                  actionLabel: 'Explore planets',
                })
            setLoading(false)
            return
          }

          const planet = await planetRes.json() as PlanetTarget
          const recipientId = planet.user?.id ?? planet.userId

          if (!recipientId) {
            setOpenError({
              message: 'This planet is missing a message recipient.',
              actionHref: '/discover',
              actionLabel: 'Explore planets',
            })
            setLoading(false)
            return
          }

          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientId,
              message: `First signal to ${planet.name ?? 'this planet'}`,
            }),
          })
          if (cancelled) return

          if (res.status === 401) {
            setAuthed(false)
            setLoading(false)
            return
          }

          if (res.ok) {
            const data = await res.json()
            router.replace(`/messages/${data.conversationId}`)
            return
          }

          setOpenError({
            message: 'This signal could not be opened yet.',
            actionHref: '/discover',
            actionLabel: 'Explore planets',
          })
          setLoading(false)
          return
        }

        const res = await fetch('/api/conversations')
        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          setConversations(data)
        } else if (res.status === 401) {
          setAuthed(false)
        }
      } catch {
        if (!cancelled) {
          setOpenError({
            message: 'Messages could not be loaded right now.',
            actionHref: '/discover',
            actionLabel: 'Explore planets',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    Promise.resolve().then(() => {
      if (!cancelled) void load()
    })

    return () => { cancelled = true }
  }, [router, targetPlanetId])

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

        {!loading && authed && openError && (
          <EmptyState
            symbol="&#9676;"
            title="Signal unavailable"
            subtitle={openError.message}
            action={<GlowButton href={openError.actionHref} variant="secondary">{openError.actionLabel}</GlowButton>}
            className="mt-8"
          />
        )}

        {!loading && authed && !openError && conversations.length === 0 && (
          <EmptyState
            symbol="&#8599;"
            title="No beams yet"
            subtitle="Find a planet that resonates and send it a first signal."
            action={<GlowButton href="/discover" variant="secondary">Explore the cosmos</GlowButton>}
            className="mt-8"
          />
        )}

        {!loading && authed && !openError && conversations.length > 0 && (
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
