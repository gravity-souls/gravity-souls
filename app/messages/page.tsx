'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { INBOX_CHANGED } from '@/lib/inbox-client'
import { useLocale, useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import GlowButton from '@/components/ui/GlowButton'
import OrbitCard from '@/components/ui/OrbitCard'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import BeamInvitations from '@/components/social/BeamInvitations'
import ExplorationReturnLink from '@/components/social/ExplorationReturnLink'
import { explorationOrigin } from '@/lib/exploration-return'
import type { PlanetConfig } from '@/types/planet'
// --- Types for API response ---

interface ConvPlanet {
  id: string
  name: string
  avatarSymbol: string
  visual: { coreColor: string; accentColor: string }
  mood: string
  planetConfig?: PlanetConfig | null
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
  const t = useTranslations('messagesPage')
  const locale = useLocale()
  const planet = conv.otherPlanet
  const color =
    planet?.planetConfig?.tintColor ?? planet?.visual?.coreColor ?? '#a78bfa'
  const ts = useTranslations('chatShares')
  const ti = useTranslations('chatImages')
  const preview = conv.lastMessage?.type === 'image' ? ti('photo') : conv.lastMessage?.type === 'share' ? ts('messagePreview') : conv.lastMessage?.content ?? t('noMessagesYet')

  return (
    <Link href={`/messages/${conv.id}`}>
      <OrbitCard
        hoverable
        glowColor={color}
        className="flex items-center gap-4 p-4"
      >
        {/* Planet avatar */}
        {planet ? (
          <PlanetAvatar
            planetConfig={planet.planetConfig ?? undefined}
            size={40}
            glowColor={color}
          />
        ) : (
          <div
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ color, background: `${color}20` }}
          >
            ?
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--foreground)' }}
            >
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
          <span
            className="shrink-0 text-[10px]"
            style={{ color: 'var(--ghost)' }}
          >
            {new Date(conv.lastMessageAt).toLocaleDateString(locale)}
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
  const t = useTranslations('messagesPage')

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
        <SectionHeader
          eyebrow={t('eyebrow')}
          level={1}
          title={t('title')}
          subtitle={t('subtitle')}
        />
        <div className="flex items-center justify-center py-20">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: 'var(--star)',
              borderTopColor: 'transparent',
            }}
          />
        </div>
      </div>
    </AppShell>
  )
}

function MessagesInner() {
  const t = useTranslations('messagesPage')
  const tw = useTranslations('inboxWorkflow')
  const ta = useTranslations('planetActions')
  const tAuth = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const origin = explorationOrigin(searchParams.get('from'))
  const targetPlanetId = searchParams.get('to')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
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
          const planetRes = await fetch(
            `/api/planets/${encodeURIComponent(targetPlanetId)}`,
          )
          if (cancelled) return

          if (!planetRes.ok) {
            setOpenError({
              message: t('planetMissing'),
              actionHref: '/discover',
              actionLabel: t('explorePlanets'),
            })
            setLoading(false)
            return
          }

          const planet = (await planetRes.json()) as PlanetTarget
          const recipientId = planet.user?.id ?? planet.userId

          if (!recipientId) {
            setOpenError({
              message: t('recipientMissing'),
              actionHref: '/discover',
              actionLabel: t('explorePlanets'),
            })
            setLoading(false)
            return
          }

          const res = await fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId }),
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

          const errorBody = (await res.json().catch(() => null)) as {
            error?: string
            code?: string
          } | null
          const needsMutual = res.status === 403 && (errorBody?.code === 'mutualFollowRequired' || errorBody?.error?.includes('follow each other'))
          setOpenError({
            message: needsMutual ? tw('mutualRequired') : t('openSignalError'),
            actionHref: needsMutual ? `/planet/${encodeURIComponent(targetPlanetId)}` : '/discover',
            actionLabel: needsMutual ? ta('viewPlanet') : t('explorePlanets'),
          })
          setLoading(false)
          return
        }

        const res = await fetch('/api/conversations')
        if (cancelled) return

        if (res.ok) {
          const data = await res.json()
          setConversations(data)
          setNextCursor(res.headers.get('X-Next-Cursor') || null)
        } else if (res.status === 401) {
          setAuthed(false)
        } else {
          throw new Error('unavailable')
        }
      } catch {
        if (!cancelled) {
          setOpenError({
            message: t('loadError'),
            actionHref: '/discover',
            actionLabel: t('explorePlanets'),
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    Promise.resolve().then(() => {
      if (!cancelled) void load()
    })

    return () => {
      cancelled = true
    }
  }, [router, targetPlanetId, t, tw, ta])

  useEffect(() => {
    if (targetPlanetId) return
    const sync = async () => {
      if (document.hidden) return
      try {
        const response = await fetch('/api/conversations', {
          cache: 'no-store',
        })
        if (!response.ok) return
        setConversations(await response.json())
        setNextCursor(response.headers.get('X-Next-Cursor') || null)
      } catch {
        /* Keep previously loaded inbox on a transient poll failure. */
      }
    }
    window.addEventListener(INBOX_CHANGED, sync)
    window.addEventListener('focus', sync)
    const interval = window.setInterval(sync, 15000)
    return () => {
      window.removeEventListener(INBOX_CHANGED, sync)
      window.removeEventListener('focus', sync)
      window.clearInterval(interval)
    }
  }, [targetPlanetId])
  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const response = await fetch(
        '/api/conversations?cursor=' + encodeURIComponent(nextCursor),
        { cache: 'no-store' },
      )
      if (!response.ok) throw new Error('failed')
      const rows = await response.json()
      setConversations((previous) => [
        ...new Map(
          [...previous, ...rows].map((row: ConversationItem) => [row.id, row]),
        ).values(),
      ])
      setNextCursor(response.headers.get('X-Next-Cursor') || null)
    } catch {
      setOpenError({
        message: tw('loadError'),
        actionHref: '/messages',
        actionLabel: tw('backInbox'),
      })
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
        <SectionHeader
          eyebrow={t('eyebrow')}
          level={1}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <Link
          href="/notifications"
          className="mt-4 inline-block text-sm text-violet-200"
        >
          {tw('notifications')} →
        </Link>
        <ExplorationReturnLink origin={origin} />
        {!loading && authed && <BeamInvitations key={searchParams.get('invitations') === 'sent' ? 'sent' : 'received'} initialDirection={searchParams.get('invitations') === 'sent' ? 'sent' : 'received'} selectedId={searchParams.get('invite')} origin={origin} />}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor: 'var(--star)',
                borderTopColor: 'transparent',
              }}
            />
          </div>
        )}

        {!loading && !authed && (
          <EmptyState
            symbol="&#9676;"
            title={t('signInRequiredTitle')}
            subtitle={t('signInRequiredSubtitle')}
            action={
              <GlowButton href="/sign-in" variant="primary">
                {tAuth('signIn')}
              </GlowButton>
            }
            className="mt-8"
          />
        )}

        {!loading && authed && openError && (
          <EmptyState
            symbol="&#9676;"
            title={t('signalUnavailable')}
            subtitle={openError.message}
            action={
              <GlowButton href={openError.actionHref} variant="secondary">
                {openError.actionLabel}
              </GlowButton>
            }
            className="mt-8"
          />
        )}

        {!loading && authed && !openError && conversations.length === 0 && (
          <EmptyState
            symbol="&#8599;"
            title={t('emptyTitle')}
            subtitle={t('emptySubtitle')}
            action={
              <GlowButton href="/discover" variant="secondary">
                {t('exploreCosmos')}
              </GlowButton>
            }
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
        {nextCursor && !openError && (
          <button
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="mt-5 rounded-lg border border-white/10 px-4 py-2 text-sm text-violet-200"
          >
            {tw('loadMore')}
          </button>
        )}
      </div>
    </AppShell>
  )
}
