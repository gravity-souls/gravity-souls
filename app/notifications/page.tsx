'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import GlowButton from '@/components/ui/GlowButton'
import LightCone from '@/components/fx/LightCone'

// --- Types -------------------------------------------------------------------

interface NotificationItem {
  id:        string
  type:      string
  title:     string
  body:      string
  read:      boolean
  actionUrl: string | null
  createdAt: string
}

// --- Icon map (no external import) -------------------------------------------

const TYPE_ICON: Record<string, string> = {
  RESONANCE_RECEIVED: '◎',
  RESONANCE_ACCEPTED: '✦',
  GALAXY_NEW_POST:    '◈',
  GALAXY_NEW_EVENT:   '◇',
  EVENT_REMINDER:     '◬',
  LEVEL_UP:           '▲',
  NEW_MATCH:          '⊛',
  COMMENT_RECEIVED:   '◌',
}

// --- Relative time helper ----------------------------------------------------

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days  = Math.floor(hours / 24)
  if (days < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

// --- Page --------------------------------------------------------------------

export default function NotificationsPage() {
  const [items, setItems]             = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(async (res) => {
        if (res.status === 401) {
          window.location.href = '/sign-in?next=/notifications'
          return
        }
        if (!res.ok) { setLoading(false); return }
        const data = await res.json() as { notifications: NotificationItem[]; unreadCount: number }
        setItems(data.notifications)
        setUnreadCount(data.unreadCount)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function markRead(ids: string[]) {
    await fetch('/api/notifications/read', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ids }),
    })
    setItems((prev) => prev.map((n) => ids.includes(n.id) ? { ...n, read: true } : n))
    setUnreadCount((prev) => Math.max(0, prev - ids.length))
  }

  async function markAllRead() {
    await fetch('/api/notifications/read', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ all: true }),
    })
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function deleteOne(id: string) {
    const wasUnread = items.find((n) => n.id === id)?.read === false
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    setItems((prev) => prev.filter((n) => n.id !== id))
    if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return (
    <AppShell>
      <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.06} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-20 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="flex flex-col gap-1.5">
            <span
              className="text-xs uppercase tracking-[0.25em] font-medium"
              style={{ color: 'var(--star)', opacity: 0.65 }}
            >
              Inbox
            </span>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              Notifications
            </h1>
          </div>

          {unreadCount > 0 && (
            <GlowButton
              variant="ghost"
              className="shrink-0 mt-1 text-xs px-3 py-2"
              onClick={markAllRead}
            >
              Mark all as read
            </GlowButton>
          )}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-2xl animate-pulse"
                style={{
                  height: 76,
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(167,139,250,0.08)',
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center gap-5 text-center py-20">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl"
              style={{
                background: 'rgba(167,139,250,0.06)',
                border: '1px solid rgba(167,139,250,0.12)',
              }}
              aria-hidden="true"
            >
              ◌
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                No notifications yet
              </p>
              <p
                className="text-xs leading-relaxed max-w-xs"
                style={{ color: 'var(--ghost)', opacity: 0.55 }}
              >
                Signals from your orbit will appear here — resonances, replies, and galaxy activity.
              </p>
            </div>
          </div>
        )}

        {/* Notification list */}
        {!loading && items.length > 0 && (
          <ol className="flex flex-col gap-2" aria-label="Notifications">
            {items.map((n) => {
              const icon = TYPE_ICON[n.type] ?? '◌'
              return (
                <li
                  key={n.id}
                  className="group relative flex items-start gap-3 px-4 py-4 rounded-2xl transition-colors duration-200"
                  style={{
                    background: n.read
                      ? 'rgba(255,255,255,0.015)'
                      : 'rgba(167,139,250,0.07)',
                    border: n.read
                      ? '1px solid rgba(167,139,250,0.06)'
                      : '1px solid rgba(167,139,250,0.2)',
                  }}
                >
                  {/* Unread indicator */}
                  {!n.read && (
                    <div
                      className="absolute top-4 right-10 w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--star)' }}
                      aria-label="Unread"
                    />
                  )}

                  {/* Type icon */}
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base mt-0.5"
                    style={{
                      background: 'rgba(167,139,250,0.08)',
                      border: '1px solid rgba(167,139,250,0.15)',
                      color: 'var(--star)',
                    }}
                    aria-hidden="true"
                  >
                    {icon}
                  </div>

                  {/* Content — link if actionUrl, div otherwise */}
                  {n.actionUrl ? (
                    <Link
                      href={n.actionUrl}
                      prefetch={false}
                      className="flex-1 min-w-0"
                      onClick={() => { if (!n.read) markRead([n.id]) }}
                    >
                      <NotificationBody title={n.title} body={n.body} createdAt={n.createdAt} />
                    </Link>
                  ) : (
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => { if (!n.read) markRead([n.id]) }}
                    >
                      <NotificationBody title={n.title} body={n.body} createdAt={n.createdAt} />
                    </div>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteOne(n.id) }}
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-60 focus:opacity-60 transition-opacity duration-150"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--ghost)',
                    }}
                    aria-label="Delete notification"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </AppShell>
  )
}

// --- Shared notification body ------------------------------------------------

function NotificationBody({
  title,
  body,
  createdAt,
}: {
  title: string
  body: string
  createdAt: string
}) {
  return (
    <>
      <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
        {title}
      </p>
      <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--ink)', opacity: 0.7 }}>
        {body}
      </p>
      <p
        className="text-[10px] mt-1.5 tabular-nums"
        style={{ color: 'var(--ghost)', opacity: 0.45 }}
      >
        {formatRelativeTime(createdAt)}
      </p>
    </>
  )
}
