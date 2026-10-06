'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { withPostOrigin } from '@/lib/post-return'
import type { StreamPost } from '@/types/stream'

function RelatedSignalsContent({ galaxyId, eventId }: { galaxyId: string; eventId?: string }) {
  const t = useTranslations('postContext')
  const params = useSearchParams()
  const scope = `${galaxyId}:${eventId ?? ''}`
  const [result, setResult] = useState<{ scope: string; posts: StreamPost[]; cursor: string | null }>({ scope, posts: [], cursor: null })
  const [error, setError] = useState(false), [busy, setBusy] = useState(true), [revision, setRevision] = useState(0)
  const generation = useRef(0), paging = useRef(false)
  const posts = result.scope === scope ? result.posts : [], cursor = result.scope === scope ? result.cursor : null
  useEffect(() => {
    let controller: AbortController | undefined
    async function refresh() {
      const request = ++generation.current
      controller?.abort()
      controller = new AbortController()
      paging.current = false
      setResult({ scope, posts: [], cursor: null }); setBusy(true); setError(false)
      const query = new URLSearchParams({ galaxyId, limit: '3' })
      if (eventId) query.set('eventId', eventId)
      try {
        const response = await fetch(`/api/posts?${query}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('failed')
        const data = await response.json()
        if (request === generation.current) setResult({ scope, posts: data.posts, cursor: data.nextCursor ?? null })
      } catch {
        if (request === generation.current) { setResult({ scope, posts: [], cursor: null }); setError(true) }
      } finally { if (request === generation.current) setBusy(false) }
    }
    const foreground = () => { if (document.visibilityState !== 'hidden') void refresh() }
    void refresh()
    window.addEventListener('focus', foreground)
    document.addEventListener('visibilitychange', foreground)
    const invalidate = () => { ++generation.current }
    return () => { invalidate(); controller?.abort(); window.removeEventListener('focus', foreground); document.removeEventListener('visibilitychange', foreground) }
  }, [galaxyId, eventId, scope, revision])

  async function more() {
    if (!cursor || busy || paging.current) return
    paging.current = true
    const request = generation.current
    setBusy(true)
    try {
      const query = new URLSearchParams({ galaxyId, limit: '3', cursor })
      if (eventId) query.set('eventId', eventId)
      const response = await fetch(`/api/posts?${query}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('failed')
      const data = await response.json()
      if (request !== generation.current) return
      setResult(previous => ({ scope, posts: [...new Map([...previous.posts, ...data.posts].map(post => [post.id, post])).values()], cursor: data.nextCursor ?? null })); setError(false)
    } catch {
      if (request === generation.current) { setResult({ scope, posts: [], cursor: null }); setError(true) }
    } finally { if (request === generation.current) { paging.current = false; setBusy(false) } }
  }
  return <section className="my-5 rounded-xl border border-white/10 p-4"><h3 className="mb-3 text-sm text-violet-200">{t('related')}</h3>
    {posts.map(post => {
      const context = post.context?.galaxy.id === galaxyId ? (eventId ? post.context.event?.id === eventId ? post.context.event.href : null : post.context.galaxy.href) : null
      return <Link key={post.id} href={withPostOrigin(post.id, context, params?.get('fromStream'))} className="mb-2 block rounded-lg bg-white/5 p-3 text-sm text-white/70"><span className="line-clamp-2">{post.content}</span><span className="mt-1 block text-xs text-white/40">{post.author.name}</span></Link>
    })}
    {!busy && !error && !posts.length && <p className="text-xs text-white/40">{t('empty')}</p>}
    {error && <p role="alert" className="text-xs text-red-300">{t('readFailed')} <button type="button" className="underline" onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></p>}
    {cursor && <button type="button" disabled={busy} className="text-xs text-violet-200 underline" onClick={more}>{t('more')}</button>}
    {busy && <p role="status" className="text-xs text-white/40">{t('loading')}</p>}
  </section>
}
export default function RelatedSignals(props: { galaxyId: string; eventId?: string }) {
  return <Suspense><RelatedSignalsContent {...props} /></Suspense>
}
