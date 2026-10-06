'use client'

/* eslint-disable @next/next/no-img-element */

import PostContextCard from '@/components/stream/PostContextCard'
import PostEditor from '@/components/stream/PostEditor'
import PostDetailSkeleton from '@/components/stream/PostDetailSkeleton'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Heart, LoaderCircle, Reply, Share2, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import LevelBadge from '@/components/planet/LevelBadge'
import { LEVEL_NAMES, clampLevel } from '@/lib/xp'
import type { StreamComment, StreamPost } from '@/types/stream'
import { streamPostSchema } from '@/lib/stream-workflow'

const PlanetGlobe = dynamic(() => import('@/components/planet/PlanetGlobe'), { ssr: false })

interface PostDetailProps {
  post: StreamPost | null
  open: boolean
  currentUserId?: string | null
  onClose: () => void
  onDeleted?: (postId: string) => void
  onTagClick?: (tag: string) => void
  onPostUpdated?: (post: StreamPost) => void
  returnHref?: string | null
  origin?: string | null
}

function countCommentTree(comments: StreamComment[] = []) {
  return comments.reduce((total, comment) => total + 1 + (comment.replies?.length ?? 0), 0)
}

export default function PostDetail({ post, open, currentUserId, onClose, onDeleted, onTagClick, onPostUpdated, returnHref, origin }: PostDetailProps) {
  const t = useTranslations('stream')
  const router = useRouter()
  const tc = useTranslations('postContext')
  const [readError, setReadError] = useState(false), [unavailable, setUnavailable] = useState(false), [revision, setRevision] = useState(0)
  const tCommon = useTranslations('common')
  const [detail, setDetail] = useState<StreamPost | null>(null)
  const detailRef = useRef(detail)
  useEffect(() => { detailRef.current = detail }, [detail])
  const [commentText, setCommentText] = useState('')
  const [replyTarget, setReplyTarget] = useState<{ id: string; authorName: string } | null>(null)
  const [commentCursor, setCommentCursor] = useState<string | null>(null)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [shared, setShared] = useState(false)
  const [expandedReplyThreads, setExpandedReplyThreads] = useState<Record<string, boolean>>({})
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [savedPostId, setSavedPostId] = useState<string | null>(null)
  function close() { if (!savingRef.current) onClose() }

  const onPostUpdatedRef = useRef(onPostUpdated)
  useEffect(() => { onPostUpdatedRef.current = onPostUpdated }, [onPostUpdated])
  const requestGeneration = useRef(0)
  const [verifiedScope, setVerifiedScope] = useState('')
  const postId = post?.id
  const scope = `${postId ?? ''}:${currentUserId ?? 'guest'}`
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => { if (!cancelled) { setCommentText(''); setSubmittingComment(false) } })
    return () => { cancelled = true }
  }, [scope])

  useEffect(() => {
    if (!open || !postId) return
    let controller: AbortController | undefined
    async function refresh() {
      const request = ++requestGeneration.current
      controller?.abort()
      controller = new AbortController()
      setReadError(false); setUnavailable(false); setLoadingMore(false)
      try {
        const response = await fetch(`/api/posts/${encodeURIComponent(postId!)}`, { cache: 'no-store', signal: controller.signal })
        if (request !== requestGeneration.current) return
        if ([401, 403, 404].includes(response.status)) {
          setDetail(null); setVerifiedScope(scope); setUnavailable(true); setCommentCursor(null); setReplyTarget(null); return
        }
        if (!response.ok) throw new Error('failed')
        const data = await response.json()
        const verifiedPost = streamPostSchema.parse(data.post)
        if (verifiedPost.id !== postId) throw new Error('failed')
        if (request !== requestGeneration.current) return
        setDetail(verifiedPost); setVerifiedScope(scope); onPostUpdatedRef.current?.(verifiedPost)
        const comments = verifiedPost.comments ?? []
        setCommentCursor(comments.length === 20 ? comments.at(-1)?.id ?? null : null)
      } catch {
        if (request === requestGeneration.current) { setDetail(null); setVerifiedScope(scope); setReadError(true); setCommentCursor(null); setReplyTarget(null) }
      }
    }
    const foreground = () => { if (document.visibilityState !== 'hidden' && !savingRef.current) void refresh() }
    Promise.resolve().then(() => { if (controller?.signal.aborted) return; setReplyTarget(null); setExpandedReplyThreads({}) })
    void refresh()
    window.addEventListener('focus', foreground)
    document.addEventListener('visibilitychange', foreground)
    const invalidate = () => { ++requestGeneration.current }
    return () => { invalidate(); setVerifiedScope(''); controller?.abort(); window.removeEventListener('focus', foreground); document.removeEventListener('visibilitychange', foreground) }
  }, [open, postId, currentUserId, scope, revision])

  if (!open) return null
  if (verifiedScope !== scope || (!detail && !readError && !unavailable)) return (
    <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/72 px-0 backdrop-blur-md sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-label={t('postDetail')}>
      <button type="button" className="absolute inset-0 cursor-default" onClick={close} aria-label={t('closePost')} />
      <div className="relative max-h-[94vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#080a1c] sm:max-w-5xl sm:rounded-2xl">
        <button type="button" onClick={close} className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/45 text-white" aria-label={t('close')}>
          <X size={16} />
        </button>
        <PostDetailSkeleton />
        {returnHref && <Link href={returnHref} className="mb-5 ml-5 inline-block text-sm text-violet-200 underline">← {tc(returnHref.includes('?event=') ? 'backEvent' : 'backGalaxy')}</Link>}
      </div>
    </div>
  )
  if (verifiedScope !== scope || !detail || unavailable) return <div role="dialog" aria-modal="true" aria-label={t('postDetail')} className="fixed inset-0 z-80 grid place-items-center bg-black/80 p-6"><div className="rounded-xl bg-[#11152a] p-6 text-white/70">
    <p role={readError ? 'alert' : 'status'}>{tc(verifiedScope !== scope ? 'loading' : unavailable ? 'unavailable' : readError ? 'readFailed' : 'loading')}</p>
    {verifiedScope === scope && (readError || unavailable) && <button type="button" onClick={() => setRevision(v => v + 1)} className="mt-3 mr-4 underline">{tc('retry')}</button>}
    {returnHref && <Link href={returnHref} className="mt-3 mr-4 inline-block underline">← {tc(returnHref.includes('?event=') ? 'backEvent' : 'backGalaxy')}</Link>}
    <button type="button" disabled={saving} onClick={close} className="mt-3 underline">{tc('close')}</button>
  </div></div>

  const ownPost = currentUserId === detail.authorId
  const accent = detail.author.tintColor || '#a78bfa'
  const visibleCommentCount = countCommentTree(detail.comments)

  function timeAgo(value: string) {
    const diff = Date.now() - new Date(value).getTime()
    const minutes = Math.max(1, Math.floor(diff / 60000))
    if (minutes < 60) return t('minutesAgo', { count: minutes })
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return t('hoursAgo', { count: hours })
    return t('daysAgo', { count: Math.floor(hours / 24) })
  }

  function denied(response: Response) {
    if (![401, 403, 404].includes(response.status)) return false
    ++requestGeneration.current
    setDetail(null); setUnavailable(true); setReadError(false); setReplyTarget(null); setCommentCursor(null)
    return true
  }

  async function toggleLike() {
    if (!detail) return
    if (!currentUserId) {
      router.push(`/sign-in?next=/stream/${detail.id}`)
      return
    }
    const request = requestGeneration.current
    const previous = detail
    const optimistic = { ...detail, userHasLiked: !detail.userHasLiked, likeCount: Math.max(0, detail.likeCount + (detail.userHasLiked ? -1 : 1)) }
    setDetail(optimistic)
    onPostUpdated?.(optimistic)
    try {
      const res = await fetch(`/api/posts/${detail.id}/like`, { method: 'POST' })
      if (request !== requestGeneration.current) return
      if (denied(res)) return
      if (!res.ok) throw new Error('like failed')
      const data = await res.json() as { liked: boolean; likeCount: number }
      if (request !== requestGeneration.current) return
      const updated = { ...detail, userHasLiked: data.liked, likeCount: data.likeCount }
      setDetail(updated)
      onPostUpdated?.(updated)
    } catch {
      if (request !== requestGeneration.current) return
      setDetail(previous)
      onPostUpdated?.(previous)
    }
  }

  async function submitComment() {
    if (!detail || !commentText.trim()) return
    const request = requestGeneration.current
    setSubmittingComment(true)
    try {
      const parentId = replyTarget?.id ?? null
      const res = await fetch(`/api/posts/${detail.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parentId ? { content: commentText.trim(), parentId } : { content: commentText.trim() }),
      })
      if (request !== requestGeneration.current || denied(res)) return
      const data = await res.json() as { comment?: StreamComment }
      if (request !== requestGeneration.current || !res.ok || !data.comment) return
      const updatedComments = data.comment.parentId
        ? (detail.comments ?? []).map((comment) => (
          comment.id === data.comment?.parentId
            ? { ...comment, replies: [...(comment.replies ?? []), data.comment] }
            : comment
        ))
        : [data.comment, ...(detail.comments ?? [])]
      const updated = { ...detail, comments: updatedComments, commentCount: detail.commentCount + 1 }
      setDetail(updated)
      setCommentText('')
      setReplyTarget(null)
      onPostUpdated?.(updated)
    } finally {
      setSubmittingComment(false)
    }
  }

  function startReply(comment: StreamComment) {
    setReplyTarget({ id: comment.id, authorName: comment.author.name })
    window.requestAnimationFrame(() => commentInputRef.current?.focus())
  }

  function updateCommentById(comments: StreamComment[], commentId: string, updater: (comment: StreamComment) => StreamComment) {
    return comments.map((comment) => {
      if (comment.id === commentId) return updater(comment)
      if (!comment.replies?.length) return comment

      return {
        ...comment,
        replies: comment.replies.map((reply) => reply.id === commentId ? updater(reply) : reply),
      }
    })
  }

  async function toggleCommentLike(comment: StreamComment) {
    if (!detail) return
    if (!currentUserId) {
      router.push(`/sign-in?next=/stream/${detail.id}`)
      return
    }

    const request = requestGeneration.current
    const previous = detail
    const optimisticComments = updateCommentById(detail.comments ?? [], comment.id, (targetComment) => ({
      ...targetComment,
      userHasLiked: !targetComment.userHasLiked,
      likeCount: Math.max(0, targetComment.likeCount + (targetComment.userHasLiked ? -1 : 1)),
    }))
    const optimistic = { ...detail, comments: optimisticComments }
    setDetail(optimistic)
    onPostUpdated?.(optimistic)

    try {
      const res = await fetch(`/api/posts/${detail.id}/comments/${comment.id}/like`, { method: 'POST' })
      if (request !== requestGeneration.current) return
      if (denied(res)) return
      if (!res.ok) throw new Error('comment like failed')
      const data = await res.json() as { liked: boolean; likeCount: number }
      if (request !== requestGeneration.current) return
      const updated = {
        ...optimistic,
        comments: updateCommentById(optimistic.comments ?? [], comment.id, (targetComment) => ({
          ...targetComment,
          userHasLiked: data.liked,
          likeCount: data.likeCount,
        })),
      }
      setDetail(updated)
      onPostUpdated?.(updated)
    } catch {
      if (request !== requestGeneration.current) return
      setDetail(previous)
      onPostUpdated?.(previous)
    }
  }

  function renderCommentAvatar(comment: StreamComment, size: number) {
    const avatar = (
      <div className="relative grid shrink-0 place-items-center overflow-hidden rounded-full" style={{ width: size, height: size }}>
        {comment.author.planetConfig ? <PlanetGlobe planetConfig={comment.author.planetConfig} size={size} framing="avatar" /> : <span aria-hidden="true">✦</span>}
      </div>
    )

    return comment.author.planetId ? (
      <Link href={`/planet/${comment.author.planetId}`} aria-label={t('visitPlanet', { name: comment.author.name })}>
        {avatar}
      </Link>
    ) : avatar
  }

  function renderCommentMeta(comment: StreamComment) {
    const level = clampLevel(comment.author.userLevel)

    return (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-semibold">
        {comment.author.planetId ? (
          <Link href={`/planet/${comment.author.planetId}`} style={{ color: 'var(--foreground)', textDecoration: 'none' }}>{comment.author.name}</Link>
        ) : <span style={{ color: 'var(--foreground)' }}>{comment.author.name}</span>}
        <span style={{ color: 'var(--ghost)', fontWeight: 400 }}>{level} {LEVEL_NAMES[level]}</span>
        <span style={{ color: 'var(--ghost)', fontWeight: 400 }}>{timeAgo(comment.createdAt)}</span>
      </p>
    )
  }

  function renderCommentActions(comment: StreamComment) {
    return (
      <div className="mt-1 flex items-center gap-3">
        <button type="button" onClick={() => toggleCommentLike(comment)} className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: comment.userHasLiked ? '#fb7185' : 'var(--ghost)' }}>
          <Heart size={12} fill={comment.userHasLiked ? 'currentColor' : 'none'} /> {comment.likeCount}
        </button>
        {currentUserId && (
          <button type="button" onClick={() => startReply(comment)} className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: replyTarget?.id === comment.id ? '#fff' : 'var(--star)' }}>
            <Reply size={12} /> {t('reply')}
          </button>
        )}
      </div>
    )
  }

  async function loadMoreComments() {
    if (!detail || !commentCursor || loadingMore) return
    const request = requestGeneration.current
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/posts/${encodeURIComponent(detail.id)}/comments?${new URLSearchParams({ cursor: commentCursor })}`, { cache: 'no-store' })
      if (request !== requestGeneration.current || denied(res)) return
      if (!res.ok) throw new Error('failed')
      const data = await res.json() as { comments?: StreamComment[]; nextCursor?: string | null }
      if (request !== requestGeneration.current) return
      setDetail(previous => previous ? { ...previous, comments: [...new Map([...(previous.comments ?? []), ...(data.comments ?? [])].map(comment => [comment.id, comment])).values()] } : null)
      setCommentCursor(data.nextCursor ?? null)
    } catch {
      if (request === requestGeneration.current) { setDetail(null); setReadError(true); setCommentCursor(null); setRevision(v => v + 1) }
    } finally { if (request === requestGeneration.current) setLoadingMore(false) }
  }

  async function deletePost() {
    if (!detail) return
    const request = requestGeneration.current
    const res = await fetch(`/api/posts/${detail.id}`, { method: 'DELETE' })
    if (request !== requestGeneration.current || denied(res) || !res.ok) return
    onDeleted?.(detail.id)
    onClose()
  }

  async function sharePost() {
    if (!detail) return
    const url = `${window.location.origin}/stream/${detail.id}`
    try {
      if (navigator.share) await navigator.share({ title: 'Gravity Souls signal', text: detail.contextRestricted ? tc('memberAudience') : detail.content.slice(0, 120), url })
      else await navigator.clipboard.writeText(url)
      setShared(true)
      setTimeout(() => setShared(false), 1400)
    } catch {
      setShared(false)
    }
  }

  return (
    <div className="fixed inset-0 z-80 flex items-end justify-center bg-black/72 px-0 backdrop-blur-md sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-label={t('postDetail')}>
      <button type="button" disabled={saving} className="absolute inset-0 cursor-default" onClick={close} aria-label={t('closePost')} />
      <article className={`relative grid max-h-[94vh] w-full overflow-y-auto rounded-t-2xl sm:rounded-2xl ${detail.mediaUrls.length ? 'sm:max-w-5xl sm:grid-cols-[minmax(0,1.1fr)_420px]' : 'sm:max-w-2xl'}`} style={{ background: 'rgba(8,10,28,0.98)', border: '1px solid var(--border-soft)', boxShadow: '0 28px 80px rgba(0,0,0,0.45)' }}>
        <button type="button" disabled={saving} onClick={close} className="absolute right-4 top-4 z-10 grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.10)' }} aria-label={t('close')}>
          <X size={16} />
        </button>

        {detail.mediaUrls.length > 0 && <div className="min-h-80 bg-black/20 p-3 sm:p-5">
          {detail.mediaUrls.length === 1 ? (
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
        </div>}

        <fieldset disabled={saving} className="flex min-h-0 min-w-0 flex-col p-5" onClickCapture={event => {
          if (savingRef.current && event.target instanceof Element && event.target.closest('a')) { event.preventDefault(); event.stopPropagation() }
        }}>
          <div className="flex items-center gap-3 pr-9">
            <div className="relative -ml-2 grid h-18 w-18 place-items-center overflow-hidden">
              {detail.author.planetConfig ? <PlanetGlobe planetConfig={detail.author.planetConfig} size={72} framing="avatar" /> : <span aria-hidden="true">✦</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{detail.author.name}</p>
              <div className="mt-1"><LevelBadge level={detail.author.userLevel} size="md" /></div>
            </div>
            {detail.author.planetId && <Link href={`/planet/${detail.author.planetId}`} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', textDecoration: 'none' }}>{t('viewPlanet')}</Link>}
          </div>

          {returnHref && <Link href={returnHref} className="mt-3 text-sm text-violet-200 underline">← {tc(returnHref.includes('?event=') ? 'backEvent' : 'backGalaxy')}</Link>}
          {savedPostId === detail.id && <p role="status" className="my-3 text-xs text-violet-200">{t('postSaved')}</p>}
          {ownPost && <PostEditor key={`${detail.id}:${detail.updatedAt}`} post={detail} onPendingChange={pending => { if (pending) ++requestGeneration.current; savingRef.current = pending; setSaving(pending) }} onUpdated={updated => {
            ++requestGeneration.current
            const merged = { ...updated, comments: detailRef.current?.comments ?? detail.comments }
            setDetail(merged)
            setSavedPostId(updated.id)
            onPostUpdatedRef.current?.(merged)
          }} />}
          <p className="mt-5 whitespace-pre-wrap break-words text-base leading-8" style={{ color: 'var(--ink)' }}>{detail.content}</p>
          <div className="-mx-4 mt-2"><PostContextCard post={detail} origin={origin} disabled={saving} /></div>
          {detail.tags.length > 0 && <div className="mt-4 flex flex-wrap gap-1.5">{detail.tags.map((tag) => <button key={tag} type="button" onClick={() => onTagClick?.(tag)} className="rounded-full px-2.5 py-1 text-[11px]" style={{ background: `${accent}14`, border: `1px solid ${accent}28`, color: accent }}>#{tag}</button>)}</div>}

          <div className="mt-5 flex items-center justify-between border-y border-white/8 py-3">
            <button type="button" onClick={toggleLike} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: detail.userHasLiked ? '#fb7185' : 'var(--foreground)' }}>
              <Heart size={18} fill={detail.userHasLiked ? 'currentColor' : 'none'} className={detail.userHasLiked ? 'scale-110 transition-transform duration-200' : 'transition-transform duration-200'} /> {detail.likeCount}
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={sharePost} className="inline-flex items-center gap-1 text-xs" style={{ color: shared ? 'var(--star)' : 'var(--ghost)' }}><Share2 size={14} /> {shared ? t('copied') : t('share')}</button>
              {ownPost && <button type="button" onClick={deletePost} className="inline-flex items-center gap-1 text-xs" style={{ color: '#fca5a5' }}><Trash2 size={14} /> {tCommon('delete')}</button>}
            </div>
          </div>

          <div className="mt-4 flex-1 overflow-y-auto">
            <p className="text-data-label mb-3">{t('commentsCount', { count: visibleCommentCount })}</p>
            <div className="grid gap-3">
              {(detail.comments ?? []).map((comment) => {
                const replies = comment.replies ?? []
                const repliesExpanded = Boolean(expandedReplyThreads[comment.id])
                const visibleReplies = repliesExpanded ? replies : replies.slice(0, 2)
                const hiddenReplyCount = Math.max(0, replies.length - visibleReplies.length)

                return (
                  <div key={comment.id} className="flex gap-3">
                    {renderCommentAvatar(comment, 36)}
                    <div className="min-w-0">
                      {renderCommentMeta(comment)}
                      <p className="text-sm leading-6" style={{ color: 'var(--ink)' }}>{comment.content}</p>
                      {renderCommentActions(comment)}
                      {replies.length > 0 && (
                        <div className="mt-3 grid gap-2 border-l border-white/10 pl-3">
                          {visibleReplies.map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              {renderCommentAvatar(reply, 28)}
                              <div className="min-w-0">
                                {renderCommentMeta(reply)}
                                <p className="text-sm leading-6" style={{ color: 'var(--ink)' }}>{reply.content}</p>
                                {renderCommentActions(reply)}
                              </div>
                            </div>
                          ))}
                          {replies.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setExpandedReplyThreads((current) => ({ ...current, [comment.id]: !repliesExpanded }))}
                              className="justify-self-start text-[11px] font-semibold"
                              style={{ color: 'var(--star)' }}
                            >
                              {repliesExpanded ? t('hideReplies') : t('viewMoreReplies', { count: hiddenReplyCount })}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {commentCursor && <button type="button" onClick={loadMoreComments} disabled={loadingMore} className="mt-4 text-xs font-semibold" style={{ color: 'var(--star)' }}>{loadingMore ? tCommon('loading') : t('loadMoreComments')}</button>}
          </div>

          {currentUserId ? (
            <div className="mt-4 border-t border-white/8 pt-4">
              {replyTarget && (
                <div className="mb-2 flex items-center justify-between gap-3 px-1" style={{ color: 'var(--ink)' }}>
                  <span className="min-w-0 truncate text-xs">{t('replyingTo')} <span style={{ color: 'var(--foreground)', fontWeight: 600 }}>{replyTarget.authorName}</span></span>
                  <button type="button" onClick={() => setReplyTarget(null)} className="grid h-6 w-6 shrink-0 place-items-center rounded-full" style={{ color: 'var(--ghost)' }} aria-label={t('cancelReply')}>
                    <X size={13} />
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <textarea ref={commentInputRef} value={commentText} onChange={(event) => setCommentText(event.target.value.slice(0, 500))} placeholder={replyTarget ? t('replyPlaceholder', { name: replyTarget.authorName }) : t('commentPlaceholder')} rows={2} className="min-w-0 flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
                <button type="button" onClick={submitComment} disabled={submittingComment || !commentText.trim()} className="grid h-12 w-12 place-items-center rounded-xl" style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)', opacity: submittingComment || !commentText.trim() ? 0.55 : 1 }}>
                  {submittingComment ? <LoaderCircle size={16} className="animate-spin" /> : replyTarget ? <Reply size={16} /> : '↗'}
                </button>
              </div>
            </div>
          ) : (
            <Link href={`/sign-in?next=/stream/${detail.id}`} className="mt-4 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', textDecoration: 'none' }}>
              {t('signInToSignal')}
            </Link>
          )}
        </fieldset>
      </article>
    </div>
  )
}