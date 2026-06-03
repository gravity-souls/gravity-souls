'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bell } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import NotificationItem, { type SerializedNotification } from '@/components/ui/NotificationItem'

interface NotificationResponse {
  notifications: SerializedNotification[]
  unreadCount: number
}

export default function NotificationBell() {
  const router = useRouter()
  const tTopbar = useTranslations('topbar')
  const tCommon = useTranslations('common')
  const tAuth = useTranslations('auth')
  const { data: session } = authClient.useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<SerializedNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return null

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/notifications', { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('Unable to load notifications')
      }

      const data = (await response.json()) as NotificationResponse
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [session?.user])

  const markAllRead = useCallback(async () => {
    await fetch('/api/notifications/read', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })

    setUnreadCount(0)
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
  }, [])

  useEffect(() => {
    if (!session?.user || isOpen) return

    void fetchNotifications()
    // TODO: replace polling with SSE/WebSocket when realtime infrastructure exists.
    const intervalId = window.setInterval(() => {
      void fetchNotifications()
    }, 60000)

    return () => window.clearInterval(intervalId)
  }, [fetchNotifications, isOpen, session?.user])

  useEffect(() => {
    if (!isOpen || !session?.user) return

    let cancelled = false

    async function loadAndMarkRead() {
      const data = await fetchNotifications()
      if (!cancelled && data && data.unreadCount > 0) {
        await markAllRead()
      }
    }

    void loadAndMarkRead()

    return () => {
      cancelled = true
    }
  }, [fetchNotifications, isOpen, markAllRead, session?.user])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleSelect = async (notification: SerializedNotification) => {
    if (!notification.read) {
      await fetch('/api/notifications/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [notification.id] }),
      })

      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read: true } : item)),
      )
      setUnreadCount((current) => Math.max(0, current - 1))
    }

    setIsOpen(false)
    if (notification.actionUrl) router.push(notification.actionUrl)
  }

  const handleDelete = async (id: string) => {
    const notification = notifications.find((item) => item.id === id)

    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })

    setNotifications((current) => current.filter((item) => item.id !== id))
    if (notification && !notification.read) {
      setUnreadCount((current) => Math.max(0, current - 1))
    }
  }

  if (!session?.user) {
    return (
      <Link
        href="/sign-in"
        aria-label={tAuth('signIn')}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/4 text-white/60 transition hover:bg-white/8 hover:text-white"
      >
        <Bell className="h-4.5 w-4.5" />
      </Link>
    )
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={tTopbar('notifications')}
        aria-expanded={isOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/4 text-white/72 transition hover:bg-white/8 hover:text-white"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-violet-400 px-1 text-[10px] font-bold leading-4 text-slate-950 shadow-[0_0_16px_rgba(167,139,250,0.65)]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-white/10 bg-[#090d18]/95 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">{tTopbar('notifications')}</p>
              <p className="text-[11px] text-white/42">{tTopbar('signals')}</p>
            </div>
            {unreadCount > 0 && <span className="rounded-full bg-violet-400/16 px-2 py-1 text-[11px] font-semibold text-violet-200">{unreadCount} new</span>}
          </div>

          <div className="max-h-120 overflow-y-auto py-1">
            {isLoading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/48">{tCommon('loading')}</div>
            ) : error ? (
              <div className="px-4 py-8 text-center text-sm text-red-200/80">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/48">{tTopbar('noNotifications')}</div>
            ) : (
              <ul className="divide-y divide-white/6">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onSelect={handleSelect}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
