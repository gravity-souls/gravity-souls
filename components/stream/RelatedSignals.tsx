'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { StreamPost } from '@/types/stream'
export default function RelatedSignals({ galaxyId, eventId }: { galaxyId: string; eventId?: string }) {
  const t = useTranslations('postContext')
  const [posts, setPosts] = useState<StreamPost[]>([]), [cursor, setCursor] = useState<string | null>(null), [error, setError] = useState(false), [busy, setBusy] = useState(true), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    const query = new URLSearchParams({ galaxyId, limit: '3' })
    if (eventId) query.set('eventId', eventId)
    fetch(`/api/posts?${query}`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('failed')
      const data = await response.json()
      if (!cancelled) { setPosts(data.posts); setCursor(data.nextCursor); setError(false) }
    }).catch(() => { if (!cancelled) setError(true) }).finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [galaxyId, eventId, revision])
  async function more() {
    setBusy(true)
    try {
      const query = new URLSearchParams({ galaxyId, limit: '3', cursor: cursor! })
      if (eventId) query.set('eventId', eventId)
      const response = await fetch(`/api/posts?${query}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('failed')
      const data = await response.json(); setPosts(previous => [...previous, ...data.posts]); setCursor(data.nextCursor); setError(false)
    } catch { setError(true) }
    finally { setBusy(false) }
  }
  return <section className="my-5 rounded-xl border border-white/10 p-4"><h3 className="mb-3 text-sm text-violet-200">{t('related')}</h3>
    {posts.map(post => <Link key={post.id} href={`/stream/${post.id}`} className="mb-2 block rounded-lg bg-white/5 p-3 text-sm text-white/70"><span className="line-clamp-2">{post.content}</span><span className="mt-1 block text-xs text-white/40">{post.author.name}</span></Link>)}
    {!busy && !error && !posts.length && <p className="text-xs text-white/40">{t('empty')}</p>}
    {error && <p role="alert" className="text-xs text-red-300">{t('failed')} <button type="button" className="underline" onClick={() => cursor ? void more() : setRevision(v => v + 1)}>{t('retry')}</button></p>}
    {cursor && <button type="button" disabled={busy} className="text-xs text-violet-200 underline" onClick={more}>{t('more')}</button>}
    {busy && <p role="status" className="text-xs text-white/40">{t('loading')}</p>}
  </section>
}
