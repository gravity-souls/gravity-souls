'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { withPostOrigin } from '@/lib/post-return'
import RelatedSignalMedia from '@/components/stream/RelatedSignalMedia'
import HorizontalCarousel from '@/components/ui/HorizontalCarousel'
import { ArrowUpRight, Orbit } from 'lucide-react'
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
        if (request === generation.current) setError(true)
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
    if (!cursor || busy || paging.current || error) return
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
      if (request === generation.current) setError(true)
    } finally { if (request === generation.current) { paging.current = false; setBusy(false) } }
  }
  return <section className="my-6 min-w-0">
    <div className="mb-4 flex items-center gap-3">
      <h3 className="flex shrink-0 items-center gap-2 text-xs font-medium tracking-wide text-violet-200/75"><Orbit size={14} aria-hidden="true" />{t('related')}</h3>
      <span aria-hidden="true" className="h-px min-w-0 flex-1 bg-gradient-to-r from-violet-300/15 to-transparent" />
    </div>
    {posts.length > 0 && <HorizontalCarousel key={scope} label={t('related')} previousLabel={t('previousSignals')} nextLabel={t('nextSignals')} onReachEnd={() => { if (cursor) void more() }}>
    {posts.map(post => {
      const context = post.context?.galaxy.id === galaxyId ? (eventId ? post.context.event?.id === eventId ? post.context.event.href : null : post.context.galaxy.href) : null
      const media = post.mediaUrls[0], mediaType = post.mediaTypes[0]
      return <Link key={post.id} href={withPostOrigin(post.id, context, params?.get('fromStream'))} className="group flex w-[85%] min-w-0 max-w-72 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] text-sm text-white/75 no-underline transition-colors hover:border-violet-300/25 hover:bg-violet-300/5 focus-visible:outline-2 focus-visible:outline-violet-300">
        <span className="flex min-w-0 items-center gap-2.5 px-4 py-3">
          <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-violet-300/15 bg-violet-300/5 text-[10px] text-violet-200">{Array.from(post.author.name)[0]}</span>
          <span className="min-w-0 flex-1 truncate text-xs text-white/60">{post.author.name}</span>
          <ArrowUpRight size={13} aria-hidden="true" className="shrink-0 text-white/25 transition-colors group-hover:text-violet-200" />
        </span>
        {media && mediaType && <RelatedSignalMedia key={`${media}:${mediaType}`} url={media} type={mediaType} count={post.mediaUrls.length} />}
        <span className={`block min-w-0 flex-1 px-4 py-4 ${media && mediaType ? '' : 'min-h-32 bg-[radial-gradient(ellipse_at_top_left,rgba(167,139,250,0.08),transparent_80%)]'}`}>
          <span className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-7">{post.content}</span>
        </span>
      </Link>
    })}
    </HorizontalCarousel>}
    {!busy && !error && !posts.length && <p className="text-xs text-white/40">{t('empty')}</p>}
    {error && <p role="alert" className="text-xs text-red-300">{t('readFailed')} <button type="button" className="underline" onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></p>}
    {cursor && <button type="button" disabled={busy} className="mt-4 rounded-full border border-violet-300/15 px-4 py-2 text-xs text-violet-200/75 transition-colors hover:bg-violet-300/5 disabled:opacity-50" onClick={more}>{t('more')}</button>}
    {busy && <p role="status" className="mt-3 text-xs text-white/40">{t('loading')}</p>}
  </section>
}
export default function RelatedSignals(props: { galaxyId: string; eventId?: string }) {
  return <Suspense><RelatedSignalsContent {...props} /></Suspense>
}
