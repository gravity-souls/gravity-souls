'use client'

/* eslint-disable @next/next/no-img-element */

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Heart, LoaderCircle, Share2, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import LevelBadge from '@/components/planet/LevelBadge'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { StreamComment, StreamPost } from '@/types/stream'

const PlanetGlobe = dynamic(() => import('@/components/planet/PlanetGlobe'), { ssr: false })

interface PostDetailProps {
  post: StreamPost | null
  open: boolean
  currentUserId?: string | null
  onClose: () => void
  onDeleted?: (postId: string) => void
  onTagClick?: (tag: string) => void
  onPostUpdated?: (post: StreamPost) => void
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function PostDetail({ post, open, currentUserId, onClose, onDeleted, onTagClick, onPostUpdated }: PostDetailProps) {
  const [detail, setDetail] = useState<StreamPost | null>(post)
  const [commentText, setCommentText] = useState('')
  const [commentCursor, setCommentCursor] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    if (!open || !post) return
    setDetail(post)
    fetch(`/api/posts/${post.id}`)
      .then((res) => res.ok ? res.json() : { post })
      .then((data: { post?: StreamPost }) => {
        setDetail(data.post ?? post)
        const comments = data.post?.comments ?? []
        setCommentCursor(comments.length === 20 ? comments[comments.length - 1]?.id ?? null : null)
      })
  }, [open, post])

  if (!open || !detail) return null

  const ownPost = currentUserId === detail.authorId
  const accent = detail.author.tintColor || '#a78bfa'

  async function toggleLike() {
    if (!detail) return
    if (!currentUserId) {
      window.location.href = `/sign-in?next=/stream/${detail.id}`
      return
    }
    const previous = detail
    const optimistic = { ...detail, userHasLiked: !detail.userHasLiked, likeCount: Math.max(0, detail.likeCount + (detail.userHasLiked ? -1 : 1)) }
    setDetail(optimistic)
    onPostUpdated?.(optimistic)
    try {
      const res = await fetch(`/api/posts/${detail.id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('like failed')
      const data = await res.json() as { liked: boolean; likeCount: number }
      const updated = { ...detail, userHasLiked: data.liked, likeCount: data.likeCount }
      setDetail(updated)
      onPostUpdated?.(updated)
    } catch {
      setDetail(previous)
      onPostUpdated?.(previous)
    }
  }

  async function submitComment() {
    if (!detail || !commentText.trim()) return
    setSubmittingComment(true)
    try {
      const res = await fetch(`/api/posts/${detail.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      })
      const data = await res.json() as { comment?: StreamComment }
      if (!res.ok || !data.comment) return
      const updated = { ...detail, comments: [data.comment, ...(detail.comments ?? [])], commentCount: detail.commentCount + 1 }
      setDetail(updated)
      setCommentText('')
      onPostUpdated?.(updated)
    } finally {
      setSubmittingComment(false)
    }
  }

  async function loadMoreComments() {
    if (!detail || !commentCursor) return
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/posts/${detail.id}/comments?cursor=${commentCursor}`)
      const data = await res.json() as { comments?: StreamComment[]; nextCursor?: string | null }
      const comments = data.comments ?? []
      setDetail({ ...detail, comments: [...(detail.comments ?? []), ...comments] })
      setCommentCursor(data.nextCursor ?? null)
    } finally {
      setLoadingMore(false)
    }
  }

  async function deletePost() {
    if (!detail) return
    const res = await fetch(`/api/posts/${detail.id}`, { method: 'DELETE' })
    if (!res.ok) return
    onDeleted?.(detail.id)
    onClose()
  }

  async function sharePost() {
    if (!detail) return
    const url = `${window.location.origin}/stream/${detail.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'Gravity Souls signal', text: detail.content.slice(0, 120), url })
      else await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 1400)
    } catch {
      setShared(false)
    }
  }

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/72 px-0 backdrop-blur-md sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-label="Post detail">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close post" />
      <article className="relative grid max-h-[94vh] w-full overflow-y-auto rounded-t-2xl sm:max-w-5xl sm:grid-cols-[minmax(0,1.1fr)_420px] sm:rounded-2xl" style={{ background: 'rgba(8,10,28,0.98)', border: '1px solid var(--border-soft)', boxShadow: '0 28px 80px rgba(0,0,0,0.45)' }}>
        <button type="button" onClick={onClose} className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)' }} aria-label="Close">
          <X size={16} />
        </button>

        <div className="min-h-80 bg-black/20 p-3 sm:p-5">
          {detail.mediaUrls.length === 0 ? (
            <div className="flex min-h-96 items-center rounded-2xl p-8" style={{ background: `linear-gradient(145deg, ${accent}38, rgba(8,10,28,0.96))` }}>
              <p className="text-xl font-semibold leading-relaxed" style={{ color: 'var(--foreground)' }}>{detail.content}</p>
            </div>
          ) : detail.mediaUrls.length === 1 ? (
            detail.mediaTypes[0] === 'image'
              ? <img src={detail.mediaUrls[0]} alt="" className="max-h-[78vh] w-full rounded-2xl object-contain" />
              : <video src={detail.mediaUrls[0]} controls className="max-h-[78vh] w-full rounded-2xl" />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {detail.mediaUrls.map((url, index) => detail.mediaTypes[index] === 'image'
                ? <img key={url} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
                : <video key={url} src={url} controls className="aspect-square w-full rounded-xl object-cover" />)}
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col p-5">
          <div className="flex items-center gap-3">
            <div className="relative -ml-2 grid h-[72px] w-[72px] place-items-center overflow-hidden">
              <PlanetGlobe planetConfig={detail.author.planetConfig} size={72} framing="avatar" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{detail.author.name}</p>
              <div className="mt-1"><LevelBadge level={detail.author.userLevel} size="md" /></div>
            </div>
            {detail.author.planetId && <Link href={`/planet/${detail.author.planetId}`} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', textDecoration: 'none' }}>View Planet</Link>}
          </div>

          <p className="mt-5 whitespace-pre-wrap text-sm leading-7" style={{ color: 'var(--ink)' }}>{detail.content}</p>
          {detail.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{detail.tags.map((tag) => <button key={tag} type="button" onClick={() => onTagClick?.(tag)} className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: `${accent}14`, border: `1px solid ${accent}28`, color: accent }}>#{tag}</button>)}</div>}

          <div className="mt-5 flex items-center justify-between border-y border-white/8 py-3">
            <button type="button" onClick={toggleLike} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: detail.userHasLiked ? '#fb7185' : 'var(--foreground)' }}>
              <Heart size={18} fill={detail.userHasLiked ? 'currentColor' : 'none'} className={detail.userHasLiked ? 'scale-110 transition-transform duration-200' : 'transition-transform duration-200'} /> {detail.likeCount}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={sharePost} className="inline-flex items-center gap-1 text-xs" style={{ color: shared ? 'var(--star)' : 'var(--ghost)' }}><Share2 size={14} /> {shared ? 'Copied' : 'Share'}</button>
              {ownPost && <button type="button" onClick={deletePost} className="inline-flex items-center gap-1 text-xs" style={{ color: '#fca5a5' }}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            <p className="text-data-label mb-3">Comments</p>
            <div className="grid gap-3">
              {(detail.comments ?? []).map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <PlanetAvatar planetConfig={comment.author.planetConfig} size={32} glowColor={comment.author.tintColor} showBadge level={comment.author.userLevel} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>{comment.author.name} <span style={{ color: 'var(--ghost)', fontWeight: 400 }}>{timeAgo(comment.createdAt)}</span></p>
                    <p className="text-sm leading-6" style={{ color: 'var(--ink)' }}>{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
            {commentCursor && <button type="button" onClick={loadMoreComments} disabled={loadingMore} className="mt-4 text-xs font-semibold" style={{ color: 'var(--star)' }}>{loadingMore ? 'Loading...' : 'Load more comments'}</button>}
          </div>

          {currentUserId ? (
            <div className="mt-4 flex gap-2 border-t border-white/8 pt-4">
              <textarea value={commentText} onChange={(event) => setCommentText(event.target.value.slice(0, 500))} placeholder="Send a signal..." rows={2} className="min-w-0 flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
              <button type="button" onClick={submitComment} disabled={submittingComment || !commentText.trim()} className="grid h-12 w-12 place-items-center rounded-xl" style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)', opacity: submittingComment || !commentText.trim() ? 0.55 : 1 }}>
                {submittingComment ? <LoaderCircle size={16} className="animate-spin" /> : '↗'}
              </button>
            </div>
          ) : (
            <Link href={`/sign-in?next=/stream/${detail.id}`} className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', textDecoration: 'none' }}>
              Sign in to send a signal
            </Link>
          )}
        </div>
      </article>
    </div>
  )
}