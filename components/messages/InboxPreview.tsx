'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ConversationPreview {
  id: string
  otherUser: { name: string | null }
  otherPlanet: { name: string } | null
  lastMessage: { content: string } | null
  unreadCount: number
}

export default function InboxPreview() {
  const t = useTranslations('messagesPage')
  const tNav = useTranslations('nav')
  const tHome = useTranslations('home')
  const [conversations, setConversations] = useState<ConversationPreview[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/conversations', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Inbox unavailable')
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid inbox')
        if (!controller.signal.aborted) setConversations(data.slice(0, 3))
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  }, [])

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/3 p-5" data-testid="my-planet-messages">
      <div className="flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-white"><MessageCircle size={18} />{tNav('messages')}</h2>
        <Link href="/messages" className="rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-sm text-violet-100 no-underline">{tHome('viewAll')} →</Link>
      </div>
      {failed ? <p role="status" className="mt-3 text-sm text-white/60">{t('loadError')}</p> : conversations === null ? (
        <div className="mt-4 h-10 animate-pulse rounded-lg bg-white/5" aria-busy="true" />
      ) : conversations.length === 0 ? <p className="mt-3 text-sm text-white/60">{t('noMessagesYet')}</p> : (
        <div className="mt-3 divide-y divide-white/5">
          {conversations.map(conversation => (
            <Link key={conversation.id} href={`/messages/${conversation.id}`} className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-3 no-underline transition hover:bg-white/5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">{conversation.otherPlanet?.name ?? conversation.otherUser.name ?? t('unknown')}</p>
                <p className="mt-1 truncate text-xs text-white/50">{conversation.lastMessage?.content ?? t('noMessagesYet')}</p>
              </div>
              {conversation.unreadCount > 0 && <span className="rounded-full bg-violet-400/20 px-2 py-1 text-xs font-semibold text-violet-100">{conversation.unreadCount}</span>}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
