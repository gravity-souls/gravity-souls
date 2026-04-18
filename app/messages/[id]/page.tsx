'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import GlowButton from '@/components/ui/GlowButton'
import SignalComposer from '@/components/social/SignalComposer'

// --- Types ---

interface MsgData {
  id: string
  fromId: string
  content: string
  type: string
  sentAt: string
  readAt?: string
}

interface PlanetData {
  id: string
  name: string
  avatarSymbol: string
  visual: { coreColor: string; accentColor: string }
}

// --- Message bubble ----------------------------------------------------------

function MessageBubble({ msg, isOwn, color }: { msg: MsgData; isOwn: boolean; color: string }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[75%] rounded-2xl px-4 py-2.5"
        style={{
          background: isOwn ? `${color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isOwn ? `${color}33` : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <p className="text-sm leading-relaxed" style={{ color: 'var(--foreground)' }}>
          {msg.content}
        </p>
        <span
          className="block text-[10px] mt-1 text-right"
          style={{ color: 'var(--ghost)', opacity: 0.5 }}
        >
          {new Date(msg.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

// --- Conversation header -----------------------------------------------------

function ConvHeader({ planet, onBack }: { planet: PlanetData | null; onBack: () => void }) {
  const color = planet?.visual?.coreColor ?? '#a78bfa'
  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(8,6,28,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <button onClick={onBack} className="text-sm" style={{ color: 'var(--ghost)' }}>
        &#8592;
      </button>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
        style={{
          background: `${color}20`,
          border: `1px solid ${color}30`,
        }}
      >
        {planet?.avatarSymbol ?? '?'}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          {planet?.name ?? 'Unknown'}
        </span>
      </div>
      {planet && (
        <Link
          href={`/planet/${planet.id}`}
          className="ml-auto text-xs"
          style={{ color: color, opacity: 0.7 }}
        >
          View planet
        </Link>
      )}
    </div>
  )
}

// --- ConversationPage ---------------------------------------------------------

interface Props {
  params: Promise<{ id: string }>
}

export default function ConversationPage({ params }: Props) {
  const { id }     = use(params)
  const router     = useRouter()
  const bottomRef  = useRef<HTMLDivElement>(null)

  const [messages, setMessages]       = useState<MsgData[]>([])
  const [myPlanet, setMyPlanet]       = useState<PlanetData | null>(null)
  const [otherPlanet, setOtherPlanet] = useState<PlanetData | null>(null)
  const [myUserId, setMyUserId]       = useState('')
  const [loading, setLoading]         = useState(true)
  const [sending, setSending]         = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/conversations/${id}`)
        if (!res.ok) {
          router.replace('/messages')
          return
        }
        const data = await res.json()
        setMessages(data.messages)
        setMyPlanet(data.myPlanet)
        setOtherPlanet(data.otherPlanet)

        // Get my user ID from /api/me
        const meRes = await fetch('/api/me')
        if (meRes.ok) {
          const meData = await meRes.json()
          setMyUserId(meData.user.id)
        }
      } catch {
        router.replace('/messages')
        return
      }
      setLoading(false)
    }
    load()
  }, [id, router])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(content: string) {
    if (sending) return
    setSending(true)

    // Optimistic update
    const tempMsg: MsgData = {
      id: `temp-${Date.now()}`,
      fromId: myUserId,
      content,
      type: 'text',
      sentAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        const real = await res.json()
        setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? real : m)))
      }
    } catch { /* ignore */ }
    setSending(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--background)' }}>
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--star)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const accentColor = otherPlanet?.visual?.coreColor ?? '#a78bfa'

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100dvh', background: 'var(--background)' }}
    >
      <ConvHeader planet={otherPlanet} onBack={() => router.push('/messages')} />

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-3">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isOwn={msg.fromId === myUserId}
            color={accentColor}
          />
        ))}

        {messages.length === 0 && (
          <p
            className="text-center text-xs italic mt-8"
            style={{ color: 'var(--ghost)', opacity: 0.45 }}
          >
            Send the first signal...
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <SignalComposer
        onSend={handleSend}
        accentColor={accentColor}
        placeholder={`Transmit to ${otherPlanet?.name ?? 'unknown'}...`}
      />
    </div>
  )
}
