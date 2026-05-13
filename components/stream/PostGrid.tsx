'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import PostCard from '@/components/stream/PostCard'
import type { StreamPost, StreamPostCategory } from '@/types/stream'

interface PostGridProps {
  category?: StreamPostCategory | 'ALL'
  tag?: string
  search?: string
  authorId?: string
  refreshKey?: number
  prependPost?: StreamPost | null
  emptyMessage?: string
  onPostOpen?: (post: StreamPost) => void
  onPostsChange?: (posts: StreamPost[]) => void
}

function SkeletonCard({ index }: { index: number }) {
  return <div className="mb-3 h-48 w-full animate-pulse rounded-2xl" style={{ height: 180 + (index % 4) * 42, background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)' }} />
}

export default function PostGrid({ category = 'ALL', tag, search, authorId, refreshKey = 0, prependPost, emptyMessage = 'The cosmos is quiet. Be the first signal.', onPostOpen, onPostsChange }: PostGridProps) {
  const [posts, setPosts] = useState<StreamPost[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const displayPosts = useMemo(() => {
    if (!prependPost || posts.some((post) => post.id === prependPost.id)) return posts
    return [prependPost, ...posts]
  }, [posts, prependPost])

  useEffect(() => {
    const params = new URLSearchParams({ limit: '20' })
    if (category !== 'ALL') params.set('category', category)
    if (tag) params.set('tag', tag)
    if (search) params.set('search', search)
    if (authorId) params.set('authorId', authorId)

    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true)
    })

    fetch(`/api/posts?${params}`)
      .then((res) => res.ok ? res.json() : { posts: [], nextCursor: null })
      .then((data: { posts?: StreamPost[]; nextCursor?: string | null }) => {
        if (cancelled) return
        const nextPosts = data.posts ?? []
        setPosts(nextPosts)
        setNextCursor(data.nextCursor ?? null)
        setLoadedOnce(true)
        onPostsChange?.(nextPosts)
      })
      .catch(() => {
        if (!cancelled) setPosts([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [authorId, category, onPostsChange, refreshKey, search, tag])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !nextCursor || loading || loadingMore) return

    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || !nextCursor) return

      const params = new URLSearchParams({ limit: '20', cursor: nextCursor })
      if (category !== 'ALL') params.set('category', category)
      if (tag) params.set('tag', tag)
      if (search) params.set('search', search)
      if (authorId) params.set('authorId', authorId)

      setLoadingMore(true)
      fetch(`/api/posts?${params}`)
        .then((res) => res.ok ? res.json() : { posts: [], nextCursor: null })
        .then((data: { posts?: StreamPost[]; nextCursor?: string | null }) => {
          const morePosts = data.posts ?? []
          setPosts((prev) => {
            const merged = [...prev, ...morePosts]
            onPostsChange?.(merged)
            return merged
          })
          setNextCursor(data.nextCursor ?? null)
        })
        .finally(() => setLoadingMore(false))
    }, { rootMargin: '700px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [authorId, category, loading, loadingMore, nextCursor, onPostsChange, search, tag])

  if (loading && !loadedOnce) {
    return <div className="stream-masonry">{Array.from({ length: 10 }).map((_, index) => <SkeletonCard key={index} index={index} />)}</div>
  }

  if (!loading && displayPosts.length === 0) {
    return <div className="rounded-2xl p-10 text-center" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid var(--border-soft)', color: 'var(--ghost)' }}>{emptyMessage}</div>
  }

  return (
    <>
      <div className="stream-masonry">
        {displayPosts.map((post) => <PostCard key={post.id} post={post} onOpen={onPostOpen} />)}
      </div>
      <div ref={sentinelRef} className="h-8" />
      {loadingMore && <p className="py-4 text-center text-xs" style={{ color: 'var(--ghost)' }}>Loading more signals...</p>}
    </>
  )
}