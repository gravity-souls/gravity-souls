'use client'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import type { StreamPost } from '@/types/stream'
export default function PostContextCard({ post }: { post: StreamPost }) {
  const t = useTranslations('postContext'), locale = useLocale()
  if (!post.context) return post.contextRestricted ? <p className="p-3 text-xs text-white/40">{t('unavailable')}</p> : null
  const { galaxy, event } = post.context
  return <div className="m-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs" onClick={e => e.stopPropagation()}>
    <Link href={galaxy.href} className="text-violet-200">{t('galaxy')}: {galaxy.name}</Link>
    {event && <div className="mt-2 flex flex-col gap-1"><Link href={event.href} className="font-semibold text-white/80">{event.title}</Link><span className="text-white/50">{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.date))} · {t(event.status.toLowerCase())}</span></div>}
  </div>
}
