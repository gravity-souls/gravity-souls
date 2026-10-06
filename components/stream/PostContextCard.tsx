'use client'
import Link from 'next/link'
import { withPostReturn } from '@/lib/post-return'
import { useLocale, useTranslations } from 'next-intl'
import { CalendarDays, Orbit } from 'lucide-react'
import type { StreamPost } from '@/types/stream'
export default function PostContextCard({ post, origin, disabled = false }: { post: StreamPost; origin?: string | null; disabled?: boolean }) {
  const t = useTranslations('postContext'), locale = useLocale()
  if (!post.context) return post.contextRestricted ? <p className="px-4 py-2 text-xs text-white/40">{t('unavailable')}</p> : null
  const { galaxy, event } = post.context
  return <div className="flex min-w-0 flex-col gap-2 px-4 py-3 text-xs" onClick={e => { if (e.target instanceof Element && e.target.closest('a')) e.stopPropagation() }}>
    <Link href={withPostReturn(galaxy.href, post.id, origin)} aria-disabled={disabled} onClick={e => { if (disabled) e.preventDefault(); else window.dispatchEvent(new Event('stream-leave')) }} className="inline-flex max-w-full self-start items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/5 px-3 py-1.5 text-violet-200 no-underline transition-colors hover:border-violet-300/30 hover:bg-violet-300/10 focus-visible:outline-2 focus-visible:outline-violet-300">
      <Orbit size={13} aria-hidden="true" className="shrink-0" /><span className="sr-only">{t('galaxy')}: </span><span className="truncate">{galaxy.name}</span>
    </Link>
    {event && <div className="flex min-w-0 items-start gap-2 pl-1 text-white/50">
      <CalendarDays size={13} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <Link href={withPostReturn(event.href, post.id, origin)} aria-disabled={disabled} onClick={e => { if (disabled) e.preventDefault(); else window.dispatchEvent(new Event('stream-leave')) }} className="block break-words text-white/75 no-underline transition-colors hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-violet-300">{event.title}</Link>
        <span className="mt-1 block text-[10px] leading-relaxed">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.date))} · {t(event.status.toLowerCase())}</span>
      </div>
    </div>}
  </div>
}
