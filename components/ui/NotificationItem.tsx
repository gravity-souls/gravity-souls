'use client'

import type { Notification } from '@prisma/client'
import { useTranslations } from 'next-intl'
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  MessageCircle,
  Orbit,
  Sparkles,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'

export type SerializedNotification = Omit<Notification, 'createdAt'> & {
  createdAt: string
}

interface Props {
  notification: SerializedNotification
  onSelect: (notification: SerializedNotification) => void
  onDelete: (id: string) => void
}

function formatNotificationTime(value: string) {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMinutes < 1) return 'now'
  if (diffMinutes < 60) return `${diffMinutes}m`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function IconForType({ type }: { type: SerializedNotification['type'] }) {
  const className = 'h-4 w-4'

  switch (type) {
    case 'RESONANCE_RECEIVED':
      return <Orbit className={className} />
    case 'RESONANCE_ACCEPTED':
      return <MessageCircle className={className} />
    case 'GALAXY_NEW_POST':
    case 'GALAXY_NEW_EVENT':
      return <Users className={className} />
    case 'EVENT_REMINDER':
      return <CalendarClock className={className} />
    case 'LEVEL_UP':
      return <Trophy className={className} />
    case 'NEW_MATCH':
      return <Sparkles className={className} />
    default:
      return <Bell className={className} />
  }
}

export default function NotificationItem({ notification, onSelect, onDelete }: Props) {
  const tA11y = useTranslations('a11y')
  return (
    <li className="group grid grid-cols-[minmax(0,1fr)_28px] gap-0 hover:bg-white/6">
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className="grid w-full grid-cols-[32px_minmax(0,1fr)] gap-3 px-3 py-3 text-left"
      >
        <span
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border"
          style={{
            background: notification.read ? 'rgba(255,255,255,0.04)' : 'rgba(167,139,250,0.16)',
            borderColor: notification.read ? 'rgba(255,255,255,0.08)' : 'rgba(167,139,250,0.32)',
            color: notification.read ? 'rgba(255,255,255,0.52)' : '#c4b5fd',
          }}
        >
          <IconForType type={notification.type} />
        </span>

        <span className="min-w-0">
          <span className="flex items-start gap-2">
            <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-white">
              {notification.title}
            </span>
            {!notification.read && (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-300" aria-label={tA11y('unread')} />
            )}
          </span>
          <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-white/56">
            {notification.body}
          </span>
          <span className="mt-1.5 block text-[11px] text-white/34">
            {formatNotificationTime(notification.createdAt)}
          </span>
        </span>
      </button>

      <button
        type="button"
        aria-label={tA11y('deleteNotification')}
        onClick={() => onDelete(notification.id)}
        className="mr-3 mt-3 flex h-7 w-7 items-center justify-center rounded-lg text-white/30 opacity-0 transition hover:bg-white/7 hover:text-white/70 group-hover:opacity-100 focus:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  )
}
