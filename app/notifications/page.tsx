'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { notificationCopy } from '@/lib/notification-copy'
import AppShell from '@/components/layout/AppShell'
import { notifyInboxChanged } from '@/lib/inbox-client'

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  actionUrl: string | null
  createdAt: string
}
export default function NotificationsPage() {
  const t = useTranslations('inboxWorkflow')
  const formatter = useFormatter()
  const locale = useLocale()
  const router = useRouter()
  const [items, setItems] = useState<NotificationItem[]>([])
  const displayItems = useMemo(() => items.map(item => ({ ...item, ...notificationCopy(item, locale) })), [items, locale])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true)
      try {
        const response = await fetch(
          `/api/notifications${cursor ? '?cursor=' + encodeURIComponent(cursor) : ''}`,
          { cache: 'no-store' },
        )
        if (response.status === 401) {
          router.replace('/sign-in?next=/notifications')
          return
        }
        if (!response.ok) throw new Error('failed')
        const result = await response.json()
        setItems((previous) =>
          cursor
            ? [
                ...new Map(
                  [...previous, ...result.notifications].map(
                    (item: NotificationItem) => [item.id, item],
                  ),
                ).values(),
              ]
            : result.notifications,
        )
        setNextCursor(result.nextCursor)
        setUnreadCount(result.unreadCount)
        setError('')
      } catch {
        setError(t('loadError'))
      } finally {
        setLoading(false)
      }
    },
    [router, t],
  )
  useEffect(() => {
    let alive = true
    queueMicrotask(() => {
      if (alive) void load()
    })
    // Mutation actions update this page directly. Focus catches changes elsewhere.
    const focus = () => {
      if (!document.hidden) void load()
    }
    window.addEventListener('focus', focus)
    return () => {
      alive = false
      window.removeEventListener('focus', focus)
    }
  }, [load])
  async function markRead(ids?: string[]) {
    setBusy(true)
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids ? { ids } : { all: true }),
      })
      if (!response.ok) throw new Error('failed')
      const result = await response.json()
      setItems((previous) =>
        previous.map((item) =>
          !ids || ids.includes(item.id) ? { ...item, read: true } : item,
        ),
      )
      setUnreadCount(result.unreadCount)
      setError('')
      notifyInboxChanged()
      return true
    } catch {
      setError(t('updateError'))
      return false
    } finally {
      setBusy(false)
    }
  }
  async function remove(id: string) {
    setBusy(true)
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('failed')
      setItems((previous) => previous.filter((item) => item.id !== id))
      await load()
      notifyInboxChanged()
    } catch {
      setError(t('updateError'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8 sm:px-6">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-violet-300">
              {t('systemAndInteractions')}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {t('notifications')}
            </h1>
            <Link
              href="/messages"
              className="mt-3 inline-block text-sm text-violet-200"
            >
              {t('openMessages')} →
            </Link>
          </div>
          {unreadCount > 0 && (
            <button
              disabled={busy}
              onClick={() => void markRead()}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-violet-200"
            >
              {t('markAll')}
            </button>
          )}
        </header>
        {error && (
          <p role="alert" className="mb-4 text-sm text-rose-200">
            {error}
          </p>
        )}
        {loading && (
          <p role="status" className="py-5 text-sm text-slate-400">
            {t('loading')}
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <p>{t('empty')}</p>
            <p className="mt-3 text-sm">{t('emptyHint')}</p>
          </div>
        )}
        <ol className="space-y-3" aria-label={t('notifications')}>
          {displayItems.map((item) => (
            <li
              key={item.id}
              className={`rounded-xl border p-4 ${item.read ? 'border-white/5 bg-white/2' : 'border-violet-400/25 bg-violet-400/5'}`}
            >
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  {item.actionUrl ? (
                    <Link
                      href={item.actionUrl}
                      onClick={(event) => {
                        event.preventDefault()
                        void (async () => {
                          if (!item.read) await markRead([item.id])
                          router.push(item.actionUrl!)
                        })()
                      }}
                      className="block text-sm font-medium text-white"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-white">
                      {item.title}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-slate-400">{item.body}</p>
                  <time
                    dateTime={item.createdAt}
                    className="mt-2 block text-xs text-slate-500"
                  >
                    {formatter.relativeTime(
                      new Date(item.createdAt),
                      new Date(),
                    )}
                  </time>
                </div>
                <button
                  disabled={busy}
                  onClick={() => void remove(item.id)}
                  aria-label={t('delete')}
                  className="min-h-10 min-w-10 text-slate-400"
                >
                  ×
                </button>
              </div>
              {!item.read && (
                <button
                  disabled={busy}
                  onClick={() => void markRead([item.id])}
                  className="mt-3 text-xs text-violet-200"
                >
                  {t('markRead')}
                </button>
              )}
            </li>
          ))}
        </ol>
        {nextCursor && (
          <button
            disabled={loading}
            onClick={() => void load(nextCursor)}
            className="mt-5 rounded-lg border border-white/10 px-4 py-2 text-sm text-violet-200"
          >
            {t('loadMore')}
          </button>
        )}
      </main>
    </AppShell>
  )
}
