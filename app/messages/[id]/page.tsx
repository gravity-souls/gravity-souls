'use client'

import { use, useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { notifyInboxChanged } from '@/lib/inbox-client'
import SignalComposer from '@/components/social/SignalComposer'
import MessageContent from '@/components/messages/MessageContent'
import FirstTimeHint from '@/components/hints/FirstTimeHint'
import ExplorationReturnLink from '@/components/social/ExplorationReturnLink'
import { explorationOrigin } from '@/lib/exploration-return'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { PlanetConfig } from '@/types/planet'
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
  planetConfig?: PlanetConfig | null
}

function mergeMessages(previous: MsgData[], incoming: MsgData[]) {
  return [
    ...new Map(
      [...previous, ...incoming].map((message) => [message.id, message]),
    ).values(),
  ].sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id))
}

// --- Message bubble ----------------------------------------------------------

function MessageBubble({
  msg,
  isOwn,
  color,
}: {
  msg: MsgData
  isOwn: boolean
  color: string
}) {
  const t = useTranslations('inboxWorkflow')
  const locale = useLocale()
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className="min-w-0 max-w-[85%] rounded-2xl px-4 py-2.5 sm:max-w-[75%]"
        style={{
          background: isOwn ? `${color}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isOwn ? `${color}33` : 'rgba(255,255,255,0.06)'}`,
        }}
      >
        <MessageContent content={msg.content} />
        <span
          className="block text-[10px] mt-1 text-right"
          style={{ color: 'var(--ghost)', opacity: 0.5 }}
        >
          {isOwn && msg.readAt && <span>{t('read')} · </span>}
          {new Date(msg.sentAt).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

// --- Conversation header -----------------------------------------------------

function ConvHeader({
  planet,
  fallbackName,
  onBack,
}: {
  planet: PlanetData | null
  fallbackName: string
  onBack: () => void
}) {
  const t = useTranslations('messagesPage')
  const color =
    planet?.planetConfig?.tintColor ?? planet?.visual?.coreColor ?? '#a78bfa'
  return (
    <div
      className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'rgba(8,6,28,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <button
        onClick={onBack}
        className="text-sm"
        style={{ color: 'var(--ghost)' }}
      >
        &#8592;
      </button>
      {planet ? (
        <PlanetAvatar
          planetConfig={planet.planetConfig ?? undefined}
          size={32}
          glowColor={color}
        />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
          style={{ color, background: `${color}20` }}
        >
          ?
        </div>
      )}
      <div className="flex flex-col">
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--foreground)' }}
        >
          {planet?.name ?? fallbackName ?? t('unknown')}
        </span>
      </div>
      {planet && (
        <Link
          href={`/planet/${planet.id}`}
          className="ml-auto text-xs"
          style={{ color: color, opacity: 0.7 }}
        >
          {t('viewPlanet')}
        </Link>
      )}
    </div>
  )
}

// --- ConversationPage ---------------------------------------------------------

interface Props {
  params: Promise<{ id: string }>
}

function ConversationPageInner({ params }: Props) {
  const origin = explorationOrigin(useSearchParams().get('from'))
  const t = useTranslations('messagesPage')
  const tCommon = useTranslations('common')
  const tw = useTranslations('inboxWorkflow')
  const { id } = use(params)
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const historyScroll = useRef<HTMLDivElement>(null)
  const olderAnchor = useRef<{ height: number; top: number } | null>(null)
  const followingLatest = useRef(true)
  const historyLoaded = useRef(false)
  const pendingSendRef = useRef<{
    content: string
    clientMessageId: string
  } | null>(null)

  const [messages, setMessages] = useState<MsgData[]>([])
  const [otherPlanet, setOtherPlanet] = useState<PlanetData | null>(null)
  // Fallback display name when the other participant has no active planet —
  // notably a self-deleted account, whose Planet[] rows are gone but whose
  // (now tombstoned) user.name still resolves via the API's `otherUser`.
  const [otherUserName, setOtherUserName] = useState('')
  const [myUserId, setMyUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [olderCursor, setOlderCursor] = useState<string | null>(null)
  const [canSend, setCanSend] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [readError, setReadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let inFlight = false
    async function load() {
      if (inFlight || document.hidden) return
      inFlight = true
      try {
        const response = await fetch(`/api/conversations/${id}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (response.status === 401) {
          router.replace(
            '/sign-in?next=' + encodeURIComponent('/messages/' + id),
          )
          return
        }
        if (!response.ok) throw new Error('unavailable')
        const result = await response.json()
        if (controller.signal.aborted) return
        setMessages((previous) => mergeMessages(previous, result.messages))
        setOtherPlanet(result.otherPlanet)
        setOtherUserName(result.otherUser?.name ?? '')
        setMyUserId(result.viewerId)
        setCanSend(result.canSend)
        setOlderCursor((previous) =>
          historyLoaded.current ? previous : result.olderCursor,
        )
        setLoadError('')
        const unread = result.messages
          .filter(
            (message: MsgData) =>
              message.fromId !== result.viewerId && !message.readAt,
          )
          .map((message: MsgData) => message.id)
        if (unread.length && !document.hidden) {
          const read = await fetch(`/api/conversations/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: unread }),
            signal: controller.signal,
          })
          if (!controller.signal.aborted) {
            setReadError(!read.ok)
            if (read.ok) notifyInboxChanged()
          }
        }
      } catch {
        if (!controller.signal.aborted)
          setLoadError(tw('conversationUnavailable'))
      } finally {
        inFlight = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    const sync = () => void load()
    const interval = window.setInterval(sync, 10000)
    window.addEventListener('focus', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      controller.abort()
      window.clearInterval(interval)
      window.removeEventListener('focus', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [id, router, tw])

  async function loadOlder() {
    if (!olderCursor || loadingOlder) return
    setLoadingOlder(true)
    followingLatest.current = false
    historyLoaded.current = true
    try {
      const response = await fetch(
        `/api/conversations/${id}?before=${encodeURIComponent(olderCursor)}`,
        { cache: 'no-store' },
      )
      if (!response.ok) throw new Error('failed')
      const result = await response.json()
      if (historyScroll.current)
        olderAnchor.current = {
          height: historyScroll.current.scrollHeight,
          top: historyScroll.current.scrollTop,
        }
      setMessages((previous) => mergeMessages(previous, result.messages))
      setOlderCursor(result.olderCursor)
      const unread = result.messages
        .filter(
          (message: MsgData) => message.fromId !== myUserId && !message.readAt,
        )
        .map((message: MsgData) => message.id)
      if (unread.length) {
        const read = await fetch(`/api/conversations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: unread }),
        })
        setReadError(!read.ok)
        if (read.ok) notifyInboxChanged()
      }
    } catch {
      setLoadError(tw('loadError'))
    } finally {
      setLoadingOlder(false)
    }
  }

  useEffect(() => {
    if (olderAnchor.current && historyScroll.current) {
      const saved = olderAnchor.current
      historyScroll.current.scrollTop =
        saved.top + historyScroll.current.scrollHeight - saved.height
      olderAnchor.current = null
      return
    }
    if (followingLatest.current)
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages])

  async function handleSend(content: string) {
    if (sending) return false
    setSending(true)
    setSendError('')

    // Reuse the same clientMessageId across retries of the same draft (the
    // composer only clears its text on success), so a resend after a
    // dropped response can't create a duplicate message server-side.
    if (pendingSendRef.current?.content !== content) {
      pendingSendRef.current = { content, clientMessageId: crypto.randomUUID() }
    }
    const clientMessageId = pendingSendRef.current.clientMessageId

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, clientMessageId }),
      })
      if (!res.ok) throw new Error('delivery-unconfirmed')
      const real = (await res.json()) as MsgData
      followingLatest.current = true
      setMessages((prev) => mergeMessages(prev, [real]))
      notifyInboxChanged()
      pendingSendRef.current = null
      return true
    } catch {
      setSendError(t('deliveryUnconfirmed'))
      return false
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--background)' }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: 'var(--star)', borderTopColor: 'transparent' }}
        />
      </div>
    )
  }

  const accentColor =
    otherPlanet?.planetConfig?.tintColor ??
    otherPlanet?.visual?.coreColor ??
    '#a78bfa'

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        background: 'var(--background)',
      }}
    >
      <ConvHeader
        planet={otherPlanet}
        fallbackName={otherUserName}
        onBack={() => router.push('/messages')}
      />
      <ExplorationReturnLink origin={origin} />

      {loadError && (
        <p role="alert" className="px-4 py-3 text-sm text-rose-200">
          {loadError}
          <Link href="/messages" className="ml-3 text-violet-200">
            {tw('backInbox')}
          </Link>
        </p>
      )}
      {readError && (
        <p role="status" className="px-4 py-2 text-xs text-amber-200">
          {tw('readError')}
        </p>
      )}
      {/* Message list */}
      <div
        ref={historyScroll}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-3"
        onScroll={(event) => {
          const element = event.currentTarget
          followingLatest.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < 80
        }}
      >
        {olderCursor && (
          <button
            disabled={loadingOlder}
            onClick={() => void loadOlder()}
            className="py-2 text-xs text-violet-200"
          >
            {tw('olderMessages')}
          </button>
        )}
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
            {t('sendFirstSignal')}
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {myUserId && messages.some(message => message.fromId === myUserId) && (
        <div className="px-4 pb-2">
          <FirstTimeHint
            hintKey="messages-first-dm"
            title={tCommon('firstDmHintTitle')}
            body={tCommon('firstDmHintBody')}
          />
        </div>
      )}

      {/* Composer */}
      {sendError && (
        <p role="alert" className="px-4 py-2 text-sm text-red-300">
          {sendError}
        </p>
      )}
      {sending && (
        <p role="status" className="px-4 py-2 text-sm">
          {t('sendingMessage')}
        </p>
      )}
      {!canSend && (
        <p className="px-4 py-3 text-xs text-slate-400">{tw('archived')}</p>
      )}
      <SignalComposer
        onSend={handleSend}
        disabled={sending || !canSend || !!loadError}
        accentColor={accentColor}
        placeholder={t('transmitTo', {
          name: otherPlanet?.name ?? otherUserName ?? t('unknown'),
        })}
      />
    </div>
  )
}

export default function ConversationPage(props: Props) {
  return <Suspense><ConversationPageInner {...props} /></Suspense>
}
