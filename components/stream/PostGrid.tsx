'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import PostCard from '@/components/stream/PostCard'
import PlanetLoadingState from '@/components/planet/PlanetLoadingState'
import { matchesPost, streamPageSchema } from '@/lib/stream-workflow'
import type { StreamPost, StreamPostCategory } from '@/types/stream'

interface PostGridProps {
  category?: StreamPostCategory | 'ALL'
  tag?: string
  search?: string
  authorId?: string
  refreshKey?: number
  prependPost?: StreamPost | null
  updatedPost?: StreamPost | null
  deletedPostId?: string | null
  emptyMessage?: string
  onPostOpen?: (post: StreamPost) => void
  onPostsChange?: (posts: StreamPost[]) => void
  origin?: string
}

export default function PostGrid({ category = 'ALL', tag, search, authorId, refreshKey = 0, prependPost, updatedPost, deletedPostId, emptyMessage, onPostOpen, onPostsChange, origin }: PostGridProps) {
  const t = useTranslations('stream'), tc = useTranslations('postContext')
  const [posts, setPosts] = useState<StreamPost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true), [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<'initial' | 'more' | null>(null)
  const [revision, setRevision] = useState(0)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const callback = useRef(onPostsChange)
  useEffect(() => { callback.current = onPostsChange }, [onPostsChange])
  const mutations = useRef(new Map<string, StreamPost | null>())
  const createdIds = useRef(new Set<string>())
  const seenPrepend = useRef<StreamPost | null>(null)
  const generation = useRef(0)
  const paging = useRef(false)
  const pagingController = useRef<AbortController | null>(null)
  const hasPaged = useRef(false)
  const cursorRef = useRef(nextCursor)
  useEffect(() => { cursorRef.current = nextCursor }, [nextCursor])
  const filterKey = JSON.stringify([category, tag, search, authorId])
  const loadedFilter = useRef<string | null>(null)
  const displayPosts = useMemo(() => posts.filter(post => matchesPost(post, { category, tag, search, authorId })), [posts, category, tag, search, authorId])

  useEffect(() => {
    if (prependPost && prependPost !== seenPrepend.current) {
      seenPrepend.current = prependPost
      createdIds.current.add(prependPost.id)
      mutations.current.set(prependPost.id, prependPost)
      setPosts(previous => matchesPost(prependPost, { category, tag, search, authorId })
        ? [prependPost, ...previous.filter(post => post.id !== prependPost.id)] : previous)
    }
    if (updatedPost && mutations.current.get(updatedPost.id) !== null) {
      mutations.current.set(updatedPost.id, updatedPost)
      setPosts(previous => previous.map(post => post.id === updatedPost.id ? updatedPost : post).filter(post => matchesPost(post, { category, tag, search, authorId })))
    }
    if (deletedPostId) {
      mutations.current.set(deletedPostId, null)
      setPosts(previous => previous.filter(post => post.id !== deletedPostId))
    }
  }, [prependPost, updatedPost, deletedPostId, category, tag, search, authorId])

  useEffect(() => { callback.current?.(displayPosts) }, [displayPosts])
  useEffect(() => { if (!loading && !error) window.dispatchEvent(new Event('stream-ready')) }, [posts, loading, error])

  useEffect(() => {
    const request = ++generation.current
    const controller = new AbortController()
    pagingController.current?.abort(); paging.current = false
    const sameFilter = loadedFilter.current === filterKey
    const params = new URLSearchParams({ limit: '20' })
    if (category !== 'ALL') params.set('category', category)
    if (tag) params.set('tag', tag)
    if (search) params.set('search', search)
    if (authorId) params.set('authorId', authorId)
    async function load() {
      setLoading(true); setLoadingMore(false); setError(null)
      if (!sameFilter) { setPosts([]); setNextCursor(null); hasPaged.current = false }
      try {
        const response = await fetch(`/api/posts?${params}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Post list failed')
        const data = streamPageSchema.parse(await response.json())
        if (request !== generation.current || controller.signal.aborted) return
        setPosts(previous => {
          const merged = new Map([...data.posts, ...(sameFilter ? previous.filter(post => !data.posts.some(next => next.id === post.id)) : [])].map(post => [post.id, post]))
          for (const [id, post] of mutations.current) {
            if (!post || !matchesPost(post, { category, tag, search, authorId })) merged.delete(id)
            else merged.set(id, post)
          }
          const created = [...createdIds.current].reverse().map(id => merged.get(id)).filter((post): post is StreamPost => !!post)
          return [...created, ...[...merged.values()].filter(post => !createdIds.current.has(post.id))]
            .filter(post => matchesPost(post, { category, tag, search, authorId }))
        })
        // Retain the paging boundary when refreshing an already paged list.
        if (!sameFilter || !hasPaged.current || (cursorRef.current && mutations.current.get(cursorRef.current) === null)) {
          setNextCursor(data.nextCursor)
          hasPaged.current = false
        }
        loadedFilter.current = filterKey
      } catch {
        if (request === generation.current && !controller.signal.aborted) setError('initial')
      } finally {
        if (request === generation.current && !controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => { controller.abort(); pagingController.current?.abort(); generation.current = request + 1 }
  }, [authorId, category, filterKey, refreshKey, revision, search, tag])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !nextCursor || loading || loadingMore || error) return
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting || paging.current) return
      paging.current = true
      const request = generation.current
      const controller = new AbortController()
      pagingController.current = controller
      const params = new URLSearchParams({ limit: '20', cursor: nextCursor })
      if (category !== 'ALL') params.set('category', category)
      if (tag) params.set('tag', tag)
      if (search) params.set('search', search)
      if (authorId) params.set('authorId', authorId)
      async function loadMore() {
        setLoadingMore(true)
        try {
          const response = await fetch(`/api/posts?${params}`, { signal: controller.signal, cache: 'no-store' })
          if (!response.ok) throw new Error('Post page failed')
          const data = streamPageSchema.parse(await response.json())
          if (request !== generation.current || controller.signal.aborted) return
          setPosts(previous => [...new Map([...previous, ...data.posts].map(post => [post.id, mutations.current.has(post.id) ? mutations.current.get(post.id) : post])).values()]
            .filter((post): post is StreamPost => !!post && matchesPost(post, { category, tag, search, authorId })))
          setNextCursor(data.nextCursor)
          hasPaged.current = true
        } catch {
          if (request === generation.current && !controller.signal.aborted) setError('more')
        } finally {
          if (request === generation.current && !controller.signal.aborted) { paging.current = false; setLoadingMore(false) }
        }
      }
      void loadMore()
    }, { rootMargin: '700px' })
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [authorId, category, error, loading, loadingMore, nextCursor, search, tag])

  return <>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-300/20 p-4 text-sm text-red-200">
      {t('listError')} <button type="button" className="underline" onClick={() => { if (error === 'more') setError(null); else setRevision(value => value + 1) }}>{tc('retry')}</button>
    </div>}
    {loading && displayPosts.length === 0 ? <PlanetLoadingState label={tc('loading')} />
      : <div className="stream-masonry">{displayPosts.map(post => <PostCard key={post.id} post={post} onOpen={onPostOpen} origin={origin} />)}</div>}
    {!loading && !error && displayPosts.length === 0 && <div className="rounded-2xl bg-white/5 p-10 text-center text-white/40">{emptyMessage ?? t('noResults')}</div>}
    <div ref={sentinelRef} className="h-8" />
    {(loadingMore || (loading && displayPosts.length > 0)) && <div className="mx-auto w-20 py-4"><PlanetLoadingState compact label={tc('loading')} /></div>}
  </>
}
