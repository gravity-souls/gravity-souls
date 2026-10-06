'use client'

import RelatedSignals from '@/components/stream/RelatedSignals'
import { useState, useEffect, useRef, use } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import { planetProfileFromApi } from '@/lib/planet-profile-from-api'
import { galaxyRequest } from '@/lib/galaxy-client'
import { useTranslations, useLocale } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import ChatReturnLink from '@/components/messages/ChatReturnLink'
import PostReturnLink from '@/components/stream/PostReturnLink'
import ContextMapReturnLink from '@/components/social/ContextMapReturnLink'
import DiscussionComposer from '@/components/galaxy/DiscussionComposer'
import ReplyLikeButton from '@/components/galaxy/ReplyLikeButton'
import PlanetLoadingState from '@/components/planet/PlanetLoadingState'
import EventsTab from '@/components/events/EventsTab'
import PlanetCard from '@/components/planet/PlanetCard'
import PlanetPreviewDrawer from '@/components/planet/PlanetPreviewDrawer'
import LockedLayer from '@/components/ui/LockedLayer'
import FirstTimeHint from '@/components/hints/FirstTimeHint'
import { galaxyMoodLabel } from '@/lib/planet-labels'
import type { PlanetProfile } from '@/types/planet'
import type { Galaxy, GalaxyPreview } from '@/types/galaxy'
import type { ApiCommunityReply, ApiCommunityDiscussion } from '@/types/community-discussion'

// Shape returned by GET /api/communities — a galaxy resolves a real
// Community row by its unique slug (see docs/adr/0001-galaxy-content-model.md).
// There is no separate Galaxy table: memberCount and every other identity
// field here are always derived from this response, never hand-authored.
interface CommunityRow {
  id: string
  slug: string
  name: string
  symbol: string
  tagline: string | null
  description: string | null
  keywords: string[]
  mood: string
  accentColor: string
  maturity: string
  memberCount: number
  joined: boolean
  isAdmin?: boolean
  canManage?: boolean
  creatorId?: string | null
  joinPolicy?: string
  requestStatus?: string | null
}

function toGalaxy(row: CommunityRow): Galaxy {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    symbol: row.symbol,
    tagline: row.tagline ?? undefined,
    description: row.description ?? undefined,
    keywords: row.keywords,
    mood: row.mood as Galaxy['mood'],
    memberCount: row.memberCount,
    maturity: row.maturity as Galaxy['maturity'],
    accentColor: row.accentColor,
  }
}

function toGalaxyPreview(row: CommunityRow): GalaxyPreview {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    symbol: row.symbol,
    tagline: row.tagline ?? undefined,
    keywords: row.keywords,
    mood: row.mood as GalaxyPreview['mood'],
    memberCount: row.memberCount,
    maturity: row.maturity as GalaxyPreview['maturity'],
    accentColor: row.accentColor,
  }
}

interface CommunityPost {
  canDelete?: boolean
  id: string
  authorName: string
  authorPlanetId?: string
  content: string
  createdAt: string
  likes: number
  replies: number
  likedByMe?: boolean
  replyItems: CommunityReply[]
}

interface CommunityReply {
  likes: number
  likedByMe: boolean
  canDelete?: boolean
  id: string
  authorName: string
  authorPlanetId?: string
  content: string
  createdAt: string
}

interface ApiCommunityPost {
  canDelete?: boolean
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    planet: { id: string; name: string } | null
  }
  likes: number
  replies: number
  likedByMe?: boolean
  replyItems?: ApiCommunityReply[]
}

interface DiscussionTopic {
  nextReplyCursor?: string | null
  canDelete?: boolean
  id: string
  title: string
  replies: number
  heat: number
  replyItems?: DiscussionReply[]
}

interface DiscussionReply {
  likes: number
  likedByMe: boolean
  canDelete?: boolean
  id: string
  authorName: string
  content: string
  createdAt: string
}

function apiReplyToCommunityReply(reply: ApiCommunityReply): CommunityReply {
  if (!reply || typeof reply.id !== 'string' || typeof reply.content !== 'string' || typeof reply.author?.name !== 'string' || !Number.isFinite(Date.parse(reply.createdAt))) throw new Error('Invalid community reply')
  if (!Number.isInteger(reply.likes) || reply.likes < 0 || typeof reply.likedByMe !== 'boolean') throw new Error('Invalid reply likes')
  return {
    likes: reply.likes,
    likedByMe: reply.likedByMe,
    id: reply.id,
    canDelete: reply.canDelete,
    authorName: reply.author.name,
    authorPlanetId: reply.author.planet?.id,
    content: reply.content,
    createdAt: reply.createdAt,
  }
}

function apiPostToCommunityPost(post: ApiCommunityPost): CommunityPost {
  if (!post || typeof post.id !== 'string' || typeof post.content !== 'string' || typeof post.author?.name !== 'string' || !Number.isFinite(Date.parse(post.createdAt)) || !Number.isInteger(post.likes) || post.likes < 0 || !Number.isInteger(post.replies) || post.replies < 0) throw new Error('Invalid community post')
  return {
    id: post.id,
    authorName: post.author.name,
    authorPlanetId: post.author.planet?.id,
    content: post.content,
    canDelete: post.canDelete,
    createdAt: post.createdAt,
    likes: post.likes,
    replies: post.replies,
    likedByMe: post.likedByMe ?? false,
    replyItems: (post.replyItems ?? []).map(apiReplyToCommunityReply),
  }
}

function apiDiscussionToTopic(discussion: ApiCommunityDiscussion): DiscussionTopic {
  if (!discussion || typeof discussion.id !== 'string' || typeof discussion.title !== 'string' || !Number.isInteger(discussion.replies) || discussion.replies < 0) throw new Error('Invalid community discussion')
  return {
    nextReplyCursor: discussion.nextReplyCursor === undefined ? undefined : pageCursor(discussion.nextReplyCursor),
    id: discussion.id,
    title: discussion.title,
    canDelete: discussion.canDelete,
    heat: discussion.heat,
    replies: discussion.replies,
    replyItems: (discussion.replyItems ?? []).map(apiReplyToCommunityReply),
  }
}

function mergeReplies<T extends { id: string; createdAt: string }>(existing: T[], incoming: T[]): T[] {
  const rows = new Map(incoming.map(reply => [reply.id, reply]))
  for (const reply of existing) rows.set(reply.id, reply)
  return [...rows.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id))
}

function pageCursor(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string' || !value || value.length > 512) throw new Error('Invalid page cursor')
  return value
}

// --- Page --------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>
}

export default function GalaxyPage({ params }: Props) {
  const router = useRouter()
  const locale = useLocale()
  const tw = useTranslations('galaxyWorkflow')
  const t = useTranslations('galaxyPage')
  const tCommon = useTranslations('common')
  const tGalaxies = useTranslations('galaxies')
  const { slug } = use(params)

  const [selectedPlanet, setSelectedPlanet] = useState<PlanetProfile | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null)
  const [userRole, setUserRole] = useState<'explorer' | 'resonator'>('explorer')
  const [savedPlanetIds, setSavedPlanetIds] = useState<Set<string> | null>(null)
  const [community, setCommunity] = useState<CommunityRow | null>(null)
  const communityId = community?.id
  const [allCommunities, setAllCommunities] = useState<CommunityRow[]>([])
  const [slugMissing, setSlugMissing] = useState(false)
  const [memberPlanets, setMemberPlanets] = useState<PlanetProfile[]>([])
  const [membersError, setMembersError] = useState('')
  const [requestStatus, setRequestStatus] = useState<string | null>(null)
  const [communityJoined, setCommunityJoined] = useState(false)
  const [joiningCommunity, setJoiningCommunity] = useState(false)
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [discussionTopics, setDiscussionTopics] = useState<DiscussionTopic[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [communityLoading, setCommunityLoading] = useState(true)
  const [communityError, setCommunityError] = useState('')
  const [postsError, setPostsError] = useState('')
  const [discussionsError, setDiscussionsError] = useState('')
  const [discussionsLoading, setDiscussionsLoading] = useState(true)
  const [nextDiscussionCursor, setNextDiscussionCursor] = useState<string | null>(null)
  const [moreDiscussionsLoading, setMoreDiscussionsLoading] = useState(false)
  const [moreDiscussionsError, setMoreDiscussionsError] = useState('')
  const [replyPageLoading, setReplyPageLoading] = useState<Record<string, boolean>>({})
  const [replyPageErrors, setReplyPageErrors] = useState<Record<string, string>>({})
  const pageReads = useRef(new Set<string>())
  const pageScope = useRef(slug)
  const [reload, setReload] = useState(0)
  const [postsReload, setPostsReload] = useState(0)
  const [discussionsReload, setDiscussionsReload] = useState(0)
  const [contentStatus, setContentStatus] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const pending = useRef(new Set<string>())
  const contentRevision = useRef(0)
  const [posting, setPosting] = useState(false)
  const [postingDiscussionReply, setPostingDiscussionReply] = useState(false)
  const [postError, setPostError] = useState('')
  const [postDraft, setPostDraft] = useState('')
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [pendingReplyLikes, setPendingReplyLikes] = useState<Set<string>>(new Set())
  const discussionLikePending = [...pendingReplyLikes].some(key => key.startsWith('replyLike:discussions:'))
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null)
  const [loadingRepliesPostId, setLoadingRepliesPostId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [discussionReplyDrafts, setDiscussionReplyDrafts] = useState<Record<string, string>>({})
  const discussionReplyDraft = selectedTopic ? discussionReplyDrafts[selectedTopic.id] ?? '' : ''
  function setDiscussionReplyDraft(value: string) {
    if (selectedTopic) setDiscussionReplyDrafts(prev => ({ ...prev, [selectedTopic.id]: value }))
  }

  function beginAction(key: string) {
    if (pending.current.has(key)) return false
    pending.current.add(key)
    contentRevision.current += 1
    setPostError('')
    setContentStatus('')
    return true
  }

  function contentError(error: unknown) {
    const key = error instanceof Error ? error.message : 'failed'
    return tw.has(key) ? tw(key) : tw('failed')
  }

  function endAction(key: string) {
    contentRevision.current += 1
    pending.current.delete(key)
  }

  useEffect(() => {
    pageScope.current = slug
    pageReads.current.clear()
    Promise.resolve().then(() => {
      setCommunityPosts([]); setDiscussionTopics([]); setSelectedTopic(null)
      setReplyDrafts({}); setDiscussionReplyDrafts({}); setExpandedReplies({})
      setPostDraft(''); setPostError(''); setContentStatus('')
      setNextDiscussionCursor(null); setMoreDiscussionsError(''); setMoreDiscussionsLoading(false)
      setReplyPageErrors({}); setReplyPageLoading({})
    })
  }, [slug])

  useEffect(() => {
    let cancelled = false
    fetch('/api/my-planet').then(res => {
      if (!cancelled) setUserRole(res.ok ? 'resonator' : 'explorer')
    }).catch(() => {
      if (!cancelled) setUserRole('explorer')
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/saved-planets')
      .then(res => res.ok ? res.json() : { savedPlanets: [] })
      .then(({ savedPlanets }: { savedPlanets: { planetId: string }[] }) => {
        if (!cancelled) setSavedPlanetIds(new Set(savedPlanets.map(s => s.planetId)))
      })
      .catch(() => {
        if (!cancelled) setSavedPlanetIds(new Set())
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) {
        setCommunityLoading(true); setCommunityError('')
        setCommunity(current => current?.slug === slug ? current : null)
        setSlugMissing(false)
      }
    })
    fetch('/api/communities')
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable')
        return res.json() as Promise<CommunityRow[]>
      })
      .then((rows) => {
        if (cancelled) return
        setAllCommunities(rows)
        const match = rows.find((row) => row.slug === slug)
        if (!match) {
          // The fetch succeeded and the catalogue plainly has no such slug —
          // this is a real 404, not a transient error (see the notFound()
          // gate below), which is exactly the bug this rewiring fixes: this
          // page used to 404 off a static mock list while fetching real
          // content from this same API for the rest of the page.
          setSlugMissing(true)
          return
        }
        setCommunity(match)
        setCommunityJoined(match.joined)
        setRequestStatus(match.requestStatus ?? null)
      })
      .catch(() => { if (!cancelled) setCommunityError(t('communityUnavailable')) })
      .finally(() => { if (!cancelled) setCommunityLoading(false) })
    return () => { cancelled = true }
  }, [slug, reload, t])

  useEffect(() => {
    let cancelled = false
    const revision = contentRevision.current
    Promise.resolve().then(() => {
      if (!cancelled) { setPostsError(''); setPostsLoading(!!communityId) }
    })
    if (!communityId) return () => { cancelled = true }
    fetch(`/api/communities/${communityId}/posts`)
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable')
        return res.json() as Promise<{ joined?: boolean; posts: ApiCommunityPost[] }>
      })
      .then((data) => {
        if (cancelled) return
        if (revision !== contentRevision.current) { setPostsReload(v => v + 1); return }
        if (typeof data.joined === 'boolean') setCommunityJoined(data.joined)
        setCommunityPosts(data.posts.map(apiPostToCommunityPost))
      })
      .catch(() => { if (!cancelled) setPostsError(t('postsUnavailable')) })
      .finally(() => { if (!cancelled) setPostsLoading(false) })
    return () => { cancelled = true }
  }, [communityId, postsReload, t])

  useEffect(() => {
    let cancelled = false
    const revision = contentRevision.current
    Promise.resolve().then(() => {
      if (!cancelled) {
        setDiscussionsError(''); setDiscussionsLoading(!!communityId)
      }
    })
    if (!communityId) return () => { cancelled = true }
    fetch(`/api/communities/${communityId}/discussions`)
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable')
        return res.json() as Promise<{ discussions: ApiCommunityDiscussion[]; nextCursor?: string | null }>
      })
      .then((data) => {
        if (cancelled) return
        if (revision !== contentRevision.current) { setDiscussionsReload(v => v + 1); return }
        const topics = data.discussions.map(apiDiscussionToTopic)
        const cursor = pageCursor(data.nextCursor)
        setDiscussionTopics(current => [...topics.filter(topic => !current.some(row => row.id === topic.id)), ...current])
        setNextDiscussionCursor(current => current ?? cursor)
      })
      .catch(() => { if (!cancelled) setDiscussionsError(t('discussionsUnavailable')) })
      .finally(() => { if (!cancelled) setDiscussionsLoading(false) })
    return () => { cancelled = true }
  }, [communityId, discussionsReload, t])

  async function loadMoreDiscussions() {
    if (!community || !nextDiscussionCursor || pageReads.current.has('discussions')) return
    const scope = pageScope.current, revision = contentRevision.current
    pageReads.current.add('discussions')
    setMoreDiscussionsLoading(true); setMoreDiscussionsError('')
    try {
      const data = await galaxyRequest<{ discussions: ApiCommunityDiscussion[]; nextCursor: string | null }>(
        `/api/communities/${community.id}/discussions?cursor=${encodeURIComponent(nextDiscussionCursor)}`)
      const topics = data.discussions.map(apiDiscussionToTopic)
      const cursor = pageCursor(data.nextCursor)
      if (scope !== pageScope.current) return
      if (revision !== contentRevision.current || pending.current.size) throw new Error('stale')
      setDiscussionTopics(current => [...current, ...topics.filter(topic => !current.some(row => row.id === topic.id))])
      setNextDiscussionCursor(cursor)
    } catch { if (scope === pageScope.current) setMoreDiscussionsError(t('discussionsUnavailable')) }
    finally {
      if (scope === pageScope.current) { pageReads.current.delete('discussions'); setMoreDiscussionsLoading(false) }
    }
  }

  async function loadDiscussionReplies(topic: DiscussionTopic) {
    const readKey = `discussion:${topic.id}`
    if (!community || pageReads.current.has(readKey)) return
    const scope = pageScope.current, revision = contentRevision.current
    pageReads.current.add(readKey)
    setReplyPageLoading(current => ({ ...current, [topic.id]: true }))
    setReplyPageErrors(current => ({ ...current, [topic.id]: '' }))
    try {
      const cursorQuery = topic.nextReplyCursor ? `?cursor=${encodeURIComponent(topic.nextReplyCursor)}` : ''
      const data = await galaxyRequest<{ replies: ApiCommunityReply[]; total: number; nextCursor: string | null }>(
        `/api/communities/${community.id}/discussions/${topic.id}/replies${cursorQuery}`)
      const replies = data.replies.map(apiReplyToCommunityReply)
      const cursor = pageCursor(data.nextCursor)
      if (!Number.isInteger(data.total) || data.total < 0) throw new Error('Invalid reply total')
      if (scope !== pageScope.current) return
      if (revision !== contentRevision.current || pending.current.size) throw new Error('stale')
      const update = (current: DiscussionTopic) => current.id === topic.id ? {
        ...current, replies: data.total, replyItems: mergeReplies(current.replyItems ?? [], replies), nextReplyCursor: cursor,
      } : current
      setDiscussionTopics(current => current.map(update))
      setSelectedTopic(current => current ? update(current) : current)
    } catch { if (scope === pageScope.current) setReplyPageErrors(current => ({ ...current, [topic.id]: t('discussionRepliesUnavailable') })) }
    finally {
      if (scope === pageScope.current) {
        pageReads.current.delete(readKey)
        setReplyPageLoading(current => ({ ...current, [topic.id]: false }))
      }
    }
  }

  // Approved-event notifications link here with #events. The browser's native
  // scroll-to-hash fires on initial load, before this page (gated on
  // communityLoading) has rendered the #events element — so it never actually
  // scrolls. Same fix as /my-planet's #match-report.
  useEffect(() => {
    if (communityLoading || window.location.hash !== '#events') return
    const frame = requestAnimationFrame(() => {
      document.getElementById('events')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => cancelAnimationFrame(frame)
  }, [communityLoading])

  useEffect(() => {
    if (!community) return
    let alive = true
    galaxyRequest<{ members: { planet: Record<string, unknown> | null }[] }>(`/api/communities/${community.id}/members`)
      .then(data => { if (alive) { setMemberPlanets(data.members.flatMap(m => m.planet ? [planetProfileFromApi(m.planet)] : [])); setMembersError('') } })
      .catch(() => { if (alive) setMembersError(tw('failed')) })
    return () => { alive = false }
  }, [community, communityJoined, tw])

  async function leaveGalaxy() {
    if (!community || !window.confirm(tw('leaveConfirm'))) return
    setJoiningCommunity(true); setPostError('')
    try { await galaxyRequest(`/api/communities/${community.id}/leave`, 'POST'); setCommunityJoined(false); setRequestStatus(null); setReload(v => v + 1) }
    catch (err) { const key = err instanceof Error ? err.message : 'failed'; setPostError(tw.has(key) ? tw(key) : tw('failed')) }
    finally { setJoiningCommunity(false) }
  }

  async function deleteContent(kind: 'posts' | 'discussions', id: string) {
    if (!community || pending.current.size || !window.confirm(tw('deleteContentConfirm')) || !beginAction('delete')) return
    setDeletingId(id)
    try {
      const result = await galaxyRequest<{ success: boolean }>(`/api/communities/${community.id}/${kind}/${id}`, 'DELETE')
      if (result.success !== true) throw new Error('failed')
      if (kind === 'posts') setCommunityPosts(prev => prev.filter(post => post.id !== id))
      else {
        setDiscussionTopics(prev => prev.filter(topic => topic.id !== id))
        setSelectedTopic(current => current?.id === id ? null : current)
      }
      setContentStatus(t('contentDeleted'))
    } catch (error) { setPostError(contentError(error)) }
    finally { endAction('delete'); setDeletingId(null) }
  }

  async function deleteReply(kind: 'posts' | 'discussions', parentId: string, replyId: string) {
    if (!community || pending.current.size || !window.confirm(tw('deleteContentConfirm')) || !beginAction('delete')) return
    setDeletingId(replyId)
    try {
      const result = await galaxyRequest<{ success: boolean }>(`/api/communities/${community.id}/${kind}/${parentId}/replies/${replyId}`, 'DELETE')
      if (result.success !== true) throw new Error('failed')
      if (kind === 'posts') updateCommunityPost(parentId, post => ({
        ...post, replies: Math.max(0, post.replies - 1), replyItems: post.replyItems.filter(reply => reply.id !== replyId),
      }))
      else {
        const remove = (topic: DiscussionTopic) => topic.id === parentId ? {
          ...topic, replies: Math.max(0, topic.replies - 1), replyItems: topic.replyItems?.filter(reply => reply.id !== replyId),
        } : topic
        setDiscussionTopics(prev => prev.map(remove))
        setSelectedTopic(current => current ? remove(current) : current)
      }
      setContentStatus(t('contentDeleted'))
    } catch (error) { setPostError(contentError(error)) }
    finally { endAction('delete'); setDeletingId(null) }
  }

  async function handleJoinCommunity() {
    if (!community) {
      setPostError(t('communityUnavailable'))
      return
    }

    setJoiningCommunity(true)
    try {
      const res = await fetch('/api/communities/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId: community.id }),
      })

      if (res.status === 401) {
        router.push('/sign-in')
        return
      }

      const result = await res.json()
      if (res.ok) { setCommunityJoined(result.joined); setRequestStatus(result.requestStatus); setReload(v => v + 1) }
      else setPostError(tw.has(result.error) ? tw(result.error) : t('joinFailed'))
    } catch {
      setPostError(t('joinFailed'))
    } finally {
      setJoiningCommunity(false)
    }
  }

  async function handleCreatePost() {
    const content = postDraft.trim()
    if (content.length < 2 || content.length > 1000 || !communityJoined || pending.current.has('delete')) return

    if (!community) {
      setPostError(t('communityUnavailable'))
      return
    }

    if (!beginAction('post')) return
    setPosting(true)
    setPostError('')
    try {
      const res = await fetch(`/api/communities/${community.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.status === 401) {
        router.push('/sign-in')
        return
      }

      if (res.status === 403) {
        setPostError(tw('joinFirst'))
        return
      }

      if (!res.ok) {
        setPostError(res.status === 429 ? tw('rateLimited') : t('publishFailed'))
        return
      }

      const data = await res.json() as { post: ApiCommunityPost }
      const post = apiPostToCommunityPost(data.post)
      setCommunityPosts((prev) => [post, ...prev.filter(current => current.id !== post.id)])
      setPostDraft('')
      setContentStatus(t('postPublished'))
    } catch {
      setPostError(t('publishFailed'))
    } finally {
      setPosting(false)
      endAction('post')
    }
  }

  function updateCommunityPost(postId: string, updater: (post: CommunityPost) => CommunityPost) {
    setCommunityPosts((prev) => prev.map((post) => post.id === postId ? updater(post) : post))
  }

  function replyLikePending(key: string, busy: boolean) {
    contentRevision.current += 1
    if (busy) pending.current.add(key)
    else pending.current.delete(key)
    setPendingReplyLikes(current => {
      const next = new Set(current)
      if (busy) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function updateReplyLike(kind: 'posts' | 'discussions', parentId: string, replyId: string, result: { likes: number; liked: boolean }) {
    const update = <T extends CommunityReply | DiscussionReply>(reply: T): T => reply.id === replyId ? { ...reply, likes: result.likes, likedByMe: result.liked } : reply
    if (kind === 'posts') updateCommunityPost(parentId, post => ({ ...post, replyItems: post.replyItems.map(update) }))
    else {
      const updateTopic = (topic: DiscussionTopic) => topic.id === parentId ? { ...topic, replyItems: topic.replyItems?.map(update) } : topic
      setDiscussionTopics(prev => prev.map(updateTopic))
      setSelectedTopic(current => current ? updateTopic(current) : current)
    }
  }

  async function handleToggleLike(post: CommunityPost) {
    if (!communityJoined) {
      setPostError(tw('joinFirst'))
      return
    }

    setPostError('')

    if (!community) { setPostError(t('communityUnavailable')); return }

    if (pending.current.has('delete') || !beginAction('like')) return
    setLikingPostId(post.id)
    try {
      const res = await fetch(`/api/communities/${community.id}/posts/${post.id}/like`, { method: 'POST' })

      if (res.status === 401) {
        router.push('/sign-in')
        return
      }

      if (res.status === 403) {
        setPostError(tw('joinFirst'))
        return
      }

      if (!res.ok) {
        setPostError(t('likeFailed'))
        return
      }

      const data = await res.json() as { liked: boolean; likes: number }
      if (typeof data.liked !== 'boolean' || !Number.isInteger(data.likes) || data.likes < 0) throw new Error('Invalid community like')
      updateCommunityPost(post.id, (current) => ({ ...current, likedByMe: data.liked, likes: data.likes }))
    } catch {
      setPostError(t('likeFailed'))
    } finally {
      setLikingPostId(null)
      endAction('like')
    }
  }

  async function handleCreateReply(post: CommunityPost) {
    const content = (replyDrafts[post.id] ?? '').trim()
    if (content.length < 2 || content.length > 600 || pending.current.has('delete') || pending.current.has('replies')) return

    if (!communityJoined) {
      setPostError(tw('joinFirst'))
      return
    }

    setPostError('')

    if (!community) { setPostError(t('communityUnavailable')); return }

    if (!beginAction('reply')) return
    setReplyingPostId(post.id)
    try {
      const res = await fetch(`/api/communities/${community.id}/posts/${post.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (res.status === 401) {
        router.push('/sign-in')
        return
      }

      if (res.status === 403) {
        setPostError(tw('joinFirst'))
        return
      }

      if (!res.ok) {
        setPostError(res.status === 429 ? tw('rateLimited') : t('replyFailed'))
        return
      }

      const data = await res.json() as { reply: ApiCommunityReply; replies: number }
      if (!Number.isInteger(data.replies) || data.replies < 0) throw new Error('Invalid reply count')
      const reply = apiReplyToCommunityReply(data.reply)
      updateCommunityPost(post.id, (current) => ({
        ...current,
        replies: data.replies,
        replyItems: [...current.replyItems, reply],
      }))
      setReplyDrafts((prev) => ({ ...prev, [post.id]: '' }))
      setExpandedReplies((prev) => ({ ...prev, [post.id]: true }))
      setContentStatus(t('replyPublished'))
    } catch {
      setPostError(t('replyFailed'))
    } finally {
      setReplyingPostId(null)
      endAction('reply')
    }
  }

  async function handleToggleReplies(post: CommunityPost) {
    if (pending.current.has('replies') || pending.current.has('reply') || pending.current.has('delete')) return
    const isOpen = expandedReplies[post.id] ?? post.replyItems.length > 0
    if (isOpen) {
      setExpandedReplies((prev) => ({ ...prev, [post.id]: false }))
      return
    }

    setExpandedReplies((prev) => ({ ...prev, [post.id]: true }))
    if (post.replyItems.length < post.replies) await handleLoadReplies(post)
  }

  async function handleLoadReplies(post: CommunityPost) {
    if (!community || pending.current.has('reply') || pending.current.has('delete') || [...pending.current].some(key => key.startsWith('replyLike:'))) return
    if (!beginAction('replies')) return
    setLoadingRepliesPostId(post.id)
    setPostError('')
    try {
      const res = await fetch(`/api/communities/${community.id}/posts/${post.id}/replies`)
      if (!res.ok) {
        setPostError(t('repliesUnavailable'))
        return
      }

      const data = await res.json() as { replies: ApiCommunityReply[] }
      const replyItems = data.replies.map(apiReplyToCommunityReply)
      updateCommunityPost(post.id, (current) => ({ ...current, replyItems }))
    } catch {
      setPostError(t('repliesUnavailable'))
    } finally {
      setLoadingRepliesPostId(null)
      endAction('replies')
    }
  }

  function handleReplyToReply(postId: string, authorName: string) {
    if (pending.current.has('reply')) return
    setExpandedReplies((prev) => ({ ...prev, [postId]: true }))
    setReplyDrafts((prev) => {
      const current = prev[postId] ?? ''
      return { ...prev, [postId]: current.trim() ? current : `@${authorName} ` }
    })
  }

  async function handleAddDiscussionReply() {
    const content = discussionReplyDraft.trim()
    if (!selectedTopic || content.length < 2 || content.length > 600 || !communityJoined || pending.current.has('delete')) return

    const key = selectedTopic.id

    if (community && selectedTopic.id) {
      if (!beginAction('discussionReply')) return
      setPostingDiscussionReply(true)
      try {
        const res = await fetch(`/api/communities/${community.id}/discussions/${selectedTopic.id}/replies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })

        if (res.status === 401) {
          router.push('/sign-in')
          return
        }

        if (res.status === 403) {
          setPostError(tw('joinFirst'))
          return
        }

        if (!res.ok) {
          setPostError(res.status === 429 ? tw('rateLimited') : t('replyFailed'))
          return
        }

        const data = await res.json() as { reply: ApiCommunityReply; replies: number }
        if (!Number.isInteger(data.replies) || data.replies < 0) throw new Error('Invalid reply count')
        const reply = apiReplyToCommunityReply(data.reply)
        const append = (topic: DiscussionTopic) => topic.id === key ? { ...topic, replies: data.replies, replyItems: mergeReplies(topic.replyItems ?? [], [reply]) } : topic
        setDiscussionTopics(prev => prev.map(append))
        setSelectedTopic(current => current ? append(current) : current)
        setDiscussionReplyDraft('')
        setContentStatus(t('replyPublished'))
      } catch {
        setPostError(t('replyFailed'))
      } finally {
        setPostingDiscussionReply(false)
        endAction('discussionReply')
      }
      return
    }

    setPostError(t('communityUnavailable'))
  }

  // A real Community row confirmed absent for this slug — a genuine 404, not
  // a transient fetch failure (see the community-fetch effect above).
  if (!communityLoading && slugMissing) notFound()

  if (!community) {
    return (
      <AppShell>
      <ChatReturnLink />
      <PostReturnLink />
      <ContextMapReturnLink />
        <div className="px-4 sm:px-6 py-16 max-w-5xl mx-auto" role={communityError ? 'alert' : 'status'}>
          {communityError ? <p className="text-sm">{communityError}</p> : <PlanetLoadingState label={t('loadingCommunity')} />}
          {communityError && (
            <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-2 underline">
              {t('retryLoad')}
            </button>
          )}
        </div>
      </AppShell>
    )
  }

  const galaxy = toGalaxy(community)


  const relatedPreviews = allCommunities
    .filter((row) => row.id !== community.id)
    .map((row) => ({ row, overlap: row.keywords.filter((k) => community.keywords.includes(k)).length }))
    .filter(({ overlap }) => overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 3)
    .map(({ row }) => toGalaxyPreview(row))

  const discussions = discussionTopics
  const { accentColor } = galaxy
  const isGalaxyAdmin = community.isAdmin ?? false
  const selectedDiscussionReplies = selectedTopic
    ? selectedTopic.replyItems ?? []
    : []

  return (
    <>
      <AppShell>
      <ChatReturnLink />
      <PostReturnLink />
      <ContextMapReturnLink />
        <div className="pb-20">

          {/* -- Galaxy hero ------------------------------------------------ */}
          <div
            className="relative overflow-hidden"
            style={{ minHeight: 260 }}
          >
            {/* Atmospheric nebula wash */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 70% 0%, ${accentColor}18 0%, ${accentColor}06 45%, transparent 70%)`,
              }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(3,3,15,0) 0%, rgba(3,3,15,1) 100%)',
              }}
              aria-hidden="true"
            />

            {/* Symbol watermark */}
            <div
              className="absolute -right-10 -top-5 pointer-events-none select-none leading-none sm:-right-8 sm:-top-8"
              style={{ fontSize: 'clamp(120px, 28vw, 200px)', color: accentColor, opacity: 0.05 }}
              aria-hidden="true"
            >
              {galaxy.symbol}
            </div>

            {/* Top line */}
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)` }}
              aria-hidden="true"
            />

            {/* Hero content */}
            <div className="relative z-10 px-4 sm:px-6 pt-7 sm:pt-8 pb-8 sm:pb-10 max-w-5xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-start gap-4 sm:gap-5">
              {/* Symbol orb */}
              <div
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl shrink-0 sm:mt-1"
                style={{
                  background: `${accentColor}20`,
                  border:     `1px solid ${accentColor}45`,
                  color:      accentColor,
                  boxShadow:  `0 0 32px ${accentColor}22`,
                }}
              >
                {galaxy.symbol}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-eyebrow mb-2">{t('galaxy')}</p>
                <h1
                  className="text-xl sm:text-2xl font-semibold leading-tight mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  {galaxy.name}
                </h1>
                {galaxy.tagline && (
                  <p
                    className="text-sm sm:text-base italic mb-4 leading-relaxed"
                    style={{ color: 'var(--ink)', opacity: 0.7 }}
                  >
                    &ldquo;{galaxy.tagline}&rdquo;
                  </p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-3 py-1 rounded-xl text-xs"
                    style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
                  >
                    {t('planetsCount', { count: galaxy.memberCount.toLocaleString() })}
                  </span>
                  <span
                    className="px-3 py-1 rounded-xl text-xs capitalize"
                    style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-soft)' }}
                  >
                    {galaxyMoodLabel(tGalaxies, galaxy.mood)}
                  </span>
                  <span
                    className="px-3 py-1 rounded-xl text-xs capitalize"
                    style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-soft)' }}
                  >
                    {tw(`maturity.${galaxy.maturity}`)}
                  </span>
                </div>
              </div>

              {/* Join CTA */}
              <div className="shrink-0 sm:mt-1 w-full sm:w-auto">
                {communityJoined ? (
                  <span
                    className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide inline-flex w-full sm:w-auto justify-center"
                    style={{
                      color:      accentColor,
                      background: `${accentColor}16`,
                      border:     `1px solid ${accentColor}35`,
                    }}
                  >
                    {t('joined')}
                  </span>
                ) : requestStatus === 'PENDING' ? (
                  <button disabled={joiningCommunity} className="rounded-xl border border-white/15 px-4 py-2 text-sm" onClick={leaveGalaxy}>{tw('cancelJoinRequest')}</button>
                ) : userRole === 'resonator' ? (
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 w-full sm:w-auto"
                    style={{
                      color:      'var(--foreground)',
                      background: `linear-gradient(135deg, ${accentColor}35, ${accentColor}20)`,
                      border:     `1px solid ${accentColor}45`,
                      cursor:     'pointer',
                    }}
                    onClick={handleJoinCommunity}
                    disabled={joiningCommunity || communityLoading || !community}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${accentColor}30` }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  >
                    {joiningCommunity ? t('joining') : community.joinPolicy === 'APPROVAL' ? tw('requestJoin') : t('joinGalaxy')}
                  </button>
                ) : (
                  <Link
                    href="/onboarding"
                    className="block px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide text-center w-full sm:w-auto"
                    style={{
                      color:      'var(--ghost)',
                      background: 'var(--surface)',
                      border:     '1px solid var(--border-soft)',
                      textDecoration: 'none',
                    }}
                  >
                    {t('createPlanetToJoin')}
                  </Link>
                )}
              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-5xl flex-wrap gap-3 px-4 pt-4">
            {community.canManage && <Link href={`/galaxy/${slug}/manage`} className="rounded-xl border border-white/15 px-4 py-2 text-sm">{tw('manageGalaxy')}</Link>}
            {communityJoined && <button disabled={joiningCommunity} onClick={leaveGalaxy} className="rounded-xl border border-white/15 px-4 py-2 text-sm">{tw('leaveGalaxy')}</button>}
            {!community.creatorId && <p className="w-full text-xs text-amber-200">{tw('unowned')}</p>}
            {requestStatus === 'REJECTED' && <p className="w-full text-xs text-white/60">{tw('joinRejected')}</p>}
          </div>

          {(communityLoading || communityError || postError) && (
            <div className="px-4 py-3 max-w-5xl mx-auto" role={communityError || postError ? 'alert' : 'status'}>
              <p className="text-sm">{communityLoading ? t('loadingCommunity') : communityError || postError}</p>
              {communityError && <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-2 underline">{t('retryLoad')}</button>}
            </div>
          )}
          {contentStatus && <p role="status" className="mx-auto max-w-5xl px-4 py-3 text-sm text-violet-200">{contentStatus}</p>}

          {communityJoined && (
            <div className="px-4 max-w-5xl mx-auto mt-3">
              <FirstTimeHint
                hintKey="galaxy-first-join"
                title={tCommon('firstJoinHintTitle')}
                body={tCommon('firstJoinHintBody')}
              />
            </div>
          )}

          {/* -- Main content ----------------------------------------------- */}
          <div className="px-4 sm:px-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-8 mt-4">

              {/* -- Left column -------------------------------------------- */}
              <div className="flex flex-col gap-6 sm:gap-8 min-w-0">

                {/* About + keywords */}
                <section>
                  <p className="text-data-label mb-3">{t('about')}</p>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ink)', opacity: 0.75 }}>
                    {galaxy.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {galaxy.keywords.map((k) => (
                      <Link
                        key={k}
                        href={`/galaxies?q=${encodeURIComponent(k)}`}
                        className="px-2.5 py-1 rounded-lg text-xs transition-all duration-200"
                        style={{
                          background: `${accentColor}10`,
                          color:      accentColor,
                          border:     `1px solid ${accentColor}28`,
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${accentColor}20` }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `${accentColor}10` }}
                      >
                        {k}
                      </Link>
                    ))}
                  </div>
                </section>

                {/* Active members */}
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                    <p className="text-data-label">{t('activePlanets')}</p>
                    <span className="text-xs" style={{ color: 'var(--ghost)' }}>
                      {t('shownOf', { shown: memberPlanets.length, total: galaxy.memberCount.toLocaleString() })}
                    </span>
                  </div>

                  {memberPlanets.length > 0 ? (
                    <div
                      className="rounded-2xl p-4 sm:p-6"
                      style={{
                        background: 'var(--surface)',
                        border:     '1px solid var(--border-soft)',
                      }}
                    >
                      <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:gap-8 sm:justify-around">
                        {memberPlanets.map((planet) => (
                          <PlanetCard
                            key={planet.id}
                            planet={planet}
                            size={48}
                            rotating
                            onClick={() => setSelectedPlanet(planet)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-2xl p-8 text-center"
                      style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                    >
                      <p className="text-sm" style={{ color: 'var(--ghost)' }}>{membersError || (!communityJoined ? tw('joinToSeeMembers') : t('noActivePlanets'))}</p>
                    </div>
                  )}
                </section>

                {/* Events */}
                {communityJoined && <RelatedSignals galaxyId={community.id} />}
                <section id="events" className="scroll-mt-24">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-data-label">{t('events')}</p>
                    {isGalaxyAdmin && <span className="text-xs" style={{ color: accentColor }}>{t('admin')}</span>}
                  </div>
                  <EventsTab galaxyId={community?.id ?? null} isAdmin={isGalaxyAdmin} canPropose={communityJoined || isGalaxyAdmin} />
                </section>

                {communityJoined && <DiscussionComposer galaxyId={community.id} disabled={discussionsLoading || !!deletingId} onCreated={discussion => {
                  const topic = apiDiscussionToTopic(discussion)
                  contentRevision.current += 1
                  setDiscussionTopics(current => [topic, ...current.filter(row => row.id !== topic.id)])
                  setContentStatus(t('discussionPublished'))
                }} />}
                {/* Discussions */}
                {(communityLoading || discussionsLoading || discussionsError || discussions.length === 0) && (
                  <section aria-label={t('recentDiscussions')}>
                    <p className="text-data-label mb-4">{t('recentDiscussions')}</p>
                    {communityLoading || discussionsLoading ? <PlanetLoadingState compact label={t('loadingDiscussions')} /> : <p role={discussionsError ? 'alert' : 'status'} className="rounded-2xl border border-white/10 bg-white/3 p-5 text-sm">{discussionsError || t('noDiscussions')}</p>}
                    {discussionsError && <button type="button" onClick={() => setDiscussionsReload(value => value + 1)} className="mt-2 underline">{t('retryLoad')}</button>}
                  </section>
                )}
                {discussions.length > 0 && (
                  <section>
                    <p className="text-data-label mb-4">{t('recentDiscussions')}</p>

                    {userRole === 'resonator' ? (
                      <div className="flex flex-col gap-2">
                        {discussions.map((topic) => (
                          <button
                            key={topic.id}
                            type="button"
                            className="w-full flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl text-left transition-all duration-200"
                            style={{
                              background: 'var(--surface)',
                              border:     '1px solid var(--border-soft)',
                              cursor:     'pointer',
                            }}
                            onClick={() => { setPostError(''); setSelectedTopic(topic) }}
                            onMouseEnter={(e) => {
                              ;(e.currentTarget as HTMLElement).style.borderColor = `${accentColor}35`
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'
                            }}
                            onMouseLeave={(e) => {
                              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-soft)'
                              ;(e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                            }}
                          >
                            {/* Heat bar */}
                            <div
                              className="w-1 rounded-full shrink-0 mt-0.5"
                              style={{
                                height:     40,
                                background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}40 100%)`,
                                opacity:    topic.heat,
                              }}
                              aria-hidden="true"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm leading-snug mb-1 wrap-break-word" style={{ color: 'var(--foreground)' }}>
                                {topic.title}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                                {tw('replyCount', { count: topic.replies })}
                              </p>
                              {topic.replyItems?.[0] && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55 wrap-anywhere">{topic.replyItems[0].authorName} · {topic.replyItems[0].content}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <LockedLayer
                        reason={tw('createPlanetFirst')}
                        ctaLabel={t('createPlanetToJoin')}
                        ctaHref="/onboarding"
                      >
                        <div className="flex flex-col gap-2">
                          {discussions.slice(0, 2).map((topic) => (
                            <div
                              key={topic.id}
                              className="flex items-start gap-4 p-4 rounded-xl"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                            >
                              <div className="w-1 h-10 rounded-full" style={{ background: `${accentColor}50` }} />
                              <div>
                                <p className="text-sm leading-snug mb-1" style={{ color: 'var(--foreground)' }}>{topic.title}</p>
                                <p className="text-xs" style={{ color: 'var(--ghost)' }}>{t('repliesCount', { count: topic.replies })}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </LockedLayer>
                    )}
                  </section>
                )}
                {nextDiscussionCursor && (
                  <div>
                    {moreDiscussionsError && <p role="alert" className="text-sm text-red-200">{moreDiscussionsError}</p>}
                    <button type="button" onClick={loadMoreDiscussions} disabled={moreDiscussionsLoading} className="py-2 text-sm text-violet-200 disabled:opacity-40">
                      {moreDiscussionsLoading ? t('loadingDiscussions') : moreDiscussionsError ? t('retryLoad') : t('loadMoreDiscussions')}
                    </button>
                  </div>
                )}

                <section aria-label={t('communityPosts')}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-data-label">{t('communityPosts')}</p>
                    <span className="text-xs" style={{ color: 'var(--ghost)' }}>
                      {t('postCount', { count: communityPosts.length })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {communityJoined ? (
                      <div
                        className="rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3"
                        style={{ background: 'var(--surface)', border: `1px solid ${accentColor}22` }}
                      >
                        <textarea
                          value={postDraft}
                          disabled={posting || !!deletingId}
                          maxLength={1000}
                          aria-label={t('postPlaceholder', { name: galaxy.name })}
                          onChange={(event) => setPostDraft(event.target.value)}
                          rows={3}
                          placeholder={t('postPlaceholder', { name: galaxy.name })}
                          className="w-full resize-none rounded-xl px-4 py-3 text-base sm:text-sm outline-none"
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: 'var(--foreground)',
                          }}
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <span className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.65 }}>
                            {t('publicPostNotice')}
                          </span>
                          <button
                            type="button"
                            onClick={handleCreatePost}
                            disabled={postDraft.trim().length < 2 || posting || !!deletingId}
                            className="px-4 py-2 rounded-xl text-xs font-medium w-full sm:w-auto"
                            style={{
                              color: 'var(--foreground)',
                              background: `${accentColor}26`,
                              border: `1px solid ${accentColor}42`,
                              cursor: postDraft.trim() && !posting ? 'pointer' : 'default',
                              opacity: postDraft.trim() && !posting ? 1 : 0.55,
                            }}
                          >
                            {posting ? tw('saving') : tw('post')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                      >
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {tw('joinToPost', { name: galaxy.name })}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--ghost)' }}>
                            {tw('publicPostsHint')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleJoinCommunity}
                          disabled={joiningCommunity || communityLoading || !community}
                          className="px-4 py-2 rounded-xl text-xs font-medium shrink-0 w-full sm:w-auto"
                          style={{ color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}32`, cursor: 'pointer' }}
                        >
                          {joiningCommunity ? t('joining') : requestStatus === 'PENDING' ? tw('pending') : tw('joinToPostButton')}
                        </button>
                      </div>
                    )}

                    {postsError ? (
                      <div role="alert"><p>{postsError}</p><button type="button" onClick={() => setPostsReload(value => value + 1)} className="mt-2 underline">{t('retryLoad')}</button></div>
                    ) : null}
                    {posting && <p role="status" className="text-xs text-violet-200">{tw('saving')}</p>}
                    {(communityLoading || postsLoading) && <PlanetLoadingState compact label={t('loadingPosts')} />}
                    {!postsError && !postsLoading && communityPosts.length === 0 ? (
                      <p className="text-sm py-4" style={{ color: 'var(--ghost)' }}>
                        {t('noPosts')}
                      </p>
                    ) : (
                      communityPosts.map((post) => {
                        const repliesOpen = expandedReplies[post.id] ?? post.replyItems.length > 0
                        const loadingReplies = loadingRepliesPostId === post.id
                        const replyDraft = replyDrafts[post.id] ?? ''

                        return (
                          <article
                            key={post.id}
                            className="rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              {post.authorPlanetId ? (
                                <Link href={`/planet/${post.authorPlanetId}`} className="text-sm font-semibold" style={{ color: 'var(--foreground)', textDecoration: 'none' }}>
                                  {post.authorName}
                                </Link>
                              ) : (
                                <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                                  {post.authorName}
                                </p>
                              )}
                              <time className="text-[10px]" style={{ color: 'var(--ghost)' }} dateTime={post.createdAt}>
                                {new Date(post.createdAt).toLocaleDateString(locale)}
                              </time>
                            </div>
                            <p className="whitespace-pre-wrap wrap-anywhere text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.78 }}>
                              {post.content}
                            </p>
                            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleToggleLike(post)}
                                disabled={!!likingPostId || !!deletingId}
                                className="px-2 py-2 sm:py-1 rounded-lg transition-all duration-200"
                                style={{
                                  color: post.likedByMe ? accentColor : 'var(--ghost)',
                                  background: post.likedByMe ? `${accentColor}14` : 'rgba(255,255,255,0.03)',
                                  border: post.likedByMe ? `1px solid ${accentColor}30` : '1px solid rgba(255,255,255,0.06)',
                                  cursor: likingPostId === post.id ? 'default' : 'pointer',
                                  opacity: likingPostId === post.id ? 0.65 : 1,
                                }}
                              >
                                {t(post.likedByMe ? 'liked' : 'like')} · {post.likes}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleReplies(post)}
                                disabled={!!loadingRepliesPostId || !!replyingPostId || !!deletingId}
                                className="px-2 py-2 sm:py-1 rounded-lg transition-all duration-200"
                                style={{
                                  color: repliesOpen ? accentColor : 'var(--ghost)',
                                  background: repliesOpen ? `${accentColor}10` : 'rgba(255,255,255,0.03)',
                                  border: repliesOpen ? `1px solid ${accentColor}26` : '1px solid rgba(255,255,255,0.06)',
                                  cursor: loadingReplies ? 'default' : 'pointer',
                                  opacity: loadingReplies ? 0.65 : 1,
                                }}
                              >
                                {loadingReplies ? tw('loading') : tw('reply')} · {post.replies}
                              </button>
                              {post.canDelete && <button type="button" disabled={!!deletingId || posting || !!replyingPostId || !!likingPostId || !!loadingRepliesPostId} onClick={() => deleteContent('posts', post.id)} className="rounded-lg px-2 py-2 text-xs text-red-200 disabled:opacity-40">{deletingId === post.id ? tw('saving') : tw('deleteContent')}</button>}
                            </div>

                            {repliesOpen && (
                              <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                {loadingReplies && (
                                  <PlanetLoadingState compact label={t('loadingReplies')} />
                                )}

                                {post.replyItems.length > 0 && (
                                  <div className="flex flex-col gap-2">
                                    {post.replyItems.map((reply) => (
                                      <div
                                        key={reply.id}
                                        className="rounded-xl px-3 py-2"
                                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          {reply.authorPlanetId ? (
                                            <Link href={`/planet/${reply.authorPlanetId}`} className="text-xs font-medium" style={{ color: 'var(--foreground)', textDecoration: 'none' }}>
                                              {reply.authorName}
                                            </Link>
                                          ) : (
                                            <p className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
                                              {reply.authorName}
                                            </p>
                                          )}
                                          {!loadingReplies && post.replyItems.length < post.replies && <button type="button" disabled={!!replyingPostId || !!loadingRepliesPostId || !!deletingId} onClick={() => handleLoadReplies(post)} className="self-start rounded-lg border border-violet-300/20 px-3 py-2 text-xs text-violet-200">{t('loadAllReplies')}</button>}
                                          <time className="text-[9px]" style={{ color: 'var(--ghost)' }} dateTime={reply.createdAt}>
                                            {new Date(reply.createdAt).toLocaleDateString(locale)}
                                          </time>
                                        </div>
                                        <p className="whitespace-pre-wrap wrap-anywhere text-xs leading-relaxed mt-1" style={{ color: 'var(--ink)', opacity: 0.74 }}>
                                          {reply.content}
                                        </p>
                                        {communityJoined && (
                                          <button
                                            type="button"
                                            disabled={!!replyingPostId || !!deletingId}
                                            onClick={() => handleReplyToReply(post.id, reply.authorName)}
                                            className="mt-1 text-[10px] bg-transparent border-none p-0"
                                            style={{ color: accentColor, cursor: 'pointer' }}
                                          >
                                            {tw('reply')}
                                          </button>
                                        )}
                                        {reply.canDelete && <button type="button" disabled={!!deletingId || !!replyingPostId || !!loadingRepliesPostId} onClick={() => deleteReply('posts', post.id, reply.id)} className="ml-3 py-2 text-xs text-red-200 disabled:opacity-40">{deletingId === reply.id ? tw('saving') : tw('deleteContent')}</button>}
                                        <ReplyLikeButton
                                          url={`/api/communities/${community.id}/posts/${post.id}/replies/${reply.id}/like`}
                                          likes={reply.likes}
                                          likedByMe={reply.likedByMe}
                                          disabled={!communityJoined || !!deletingId || !!loadingRepliesPostId || pendingReplyLikes.has(`replyLike:posts:${reply.id}`)}
                                          onPending={busy => replyLikePending(`replyLike:posts:${reply.id}`, busy)}
                                          onChange={result => updateReplyLike('posts', post.id, reply.id, result)}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!loadingReplies && post.replyItems.length === 0 && (
                                  <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                                    {t('noReplies')}
                                  </p>
                                )}

                                {communityJoined ? (
                                  <div className="flex flex-col gap-2">
                                    <textarea
                                      value={replyDraft}
                                      disabled={replyingPostId === post.id || !!deletingId}
                                      maxLength={600}
                                      aria-label={tw('replyTo', { name: post.authorName })}
                                      onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))}
                                      rows={2}
                                      placeholder={tw('replyTo', { name: post.authorName })}
                                      className="w-full resize-none rounded-xl px-3 py-2 text-base sm:text-xs outline-none"
                                      style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'var(--foreground)',
                                      }}
                                    />
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() => handleCreateReply(post)}
                                        disabled={replyDraft.trim().length < 2 || !!replyingPostId || !!loadingRepliesPostId || !!deletingId}
                                        className="px-3 py-2 sm:py-1.5 rounded-lg text-[10px] font-medium w-full sm:w-auto"
                                        style={{
                                          color: 'var(--foreground)',
                                          background: `${accentColor}22`,
                                          border: `1px solid ${accentColor}38`,
                                          cursor: replyDraft.trim() && replyingPostId !== post.id ? 'pointer' : 'default',
                                          opacity: replyDraft.trim() && replyingPostId !== post.id ? 1 : 0.55,
                                        }}
                                      >
                                        {replyingPostId === post.id ? tw('saving') : tw('sendReply')}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                                    {t('joinToInteract')}
                                  </p>
                                )}
                              </div>
                            )}
                          </article>
                        )
                      })
                    )}
                  </div>
                </section>
              </div>

              {/* -- Right column ------------------------------------------- */}
              <div className="flex flex-col gap-6 min-w-0">

                {/* Related galaxies */}
                {relatedPreviews.length > 0 && (
                  <section>
                    <p className="text-data-label mb-3">{t('relatedGalaxies')}</p>
                    <div className="flex flex-col gap-3">
                      {relatedPreviews.map((g) => (
                        <Link
                          key={g.id}
                          href={`/galaxy/${g.slug}`}
                          className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200"
                          style={{
                            background:     `${g.accentColor}08`,
                            border:         `1px solid ${g.accentColor}20`,
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLElement).style.background = `${g.accentColor}14`
                            ;(e.currentTarget as HTMLElement).style.borderColor = `${g.accentColor}40`
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLElement).style.background = `${g.accentColor}08`
                            ;(e.currentTarget as HTMLElement).style.borderColor = `${g.accentColor}20`
                          }}
                        >
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                            style={{ background: `${g.accentColor}20`, color: g.accentColor, border: `1px solid ${g.accentColor}35` }}
                          >
                            {g.symbol}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{g.name}</p>
                            <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>
                              {t('planetsCount', { count: g.memberCount.toLocaleString() })}
                            </p>
                          </div>
                          <span className="text-xs shrink-0" style={{ color: 'var(--dim)' }}>→</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Quick stats panel */}
                <section
                  className="p-5 rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                >
                  <p className="text-data-label mb-4">{t('galaxyStats')}</p>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: t('members'), value: galaxy.memberCount.toLocaleString() },
                      { label: t('atmosphere'), value: galaxyMoodLabel(tGalaxies, galaxy.mood) },
                      { label: t('status'), value: tw.has(`maturity.${galaxy.maturity}`) ? tw(`maturity.${galaxy.maturity}`) : galaxy.maturity },
                      { label: t('keywords'), value: galaxy.keywords.length.toString() },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'var(--ghost)' }}>{label}</span>
                        <span className="text-xs font-medium capitalize" style={{ color: 'var(--ink)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Back to galaxies */}
                <Link
                  href="/galaxies"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200"
                  style={{
                    color:          'var(--ghost)',
                    background:     'var(--surface)',
                    border:         '1px solid var(--border-soft)',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ink)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--ghost)' }}
                >
                  {t('allGalaxies')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppShell>

      {selectedTopic && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => { if (!postingDiscussionReply && !deletingId && !discussionLikePending) setSelectedTopic(null) }}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedTopic.title}
            className="fixed z-50 left-1/2 top-1/2 w-[calc(100vw-24px)] sm:w-[min(92vw,620px)] max-h-[88vh] sm:max-h-[86vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(160deg, rgba(18,14,52,0.98) 0%, rgba(6,4,20,0.99) 100%)',
              border: `1px solid ${accentColor}35`,
              boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 48px ${accentColor}16`,
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: accentColor, opacity: 0.75 }}>
                  {t('galaxyDiscussion')}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ghost)' }}>
                  {t('repliesCount', { count: selectedTopic.replies })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                disabled={postingDiscussionReply || !!deletingId || discussionLikePending}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ghost)', cursor: 'pointer' }}
                aria-label={t('closeDiscussionPreview')}
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-start gap-4">
                <div
                  className="w-1 rounded-full shrink-0 mt-1"
                  style={{ height: 54, background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}40 100%)`, opacity: selectedTopic.heat }}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="wrap-anywhere text-base sm:text-lg font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                    {selectedTopic.title}
                  </h2>
                  <p className="text-xs sm:text-sm leading-relaxed mt-3" style={{ color: 'var(--ink)', opacity: 0.72 }}>
                    {t('discussionIntro', { name: galaxy.name })}
                  </p>
                  {selectedTopic.canDelete && <button type="button" disabled={postingDiscussionReply || !!deletingId} onClick={() => deleteContent('discussions', selectedTopic.id)} className="mt-3 text-xs text-red-200 disabled:opacity-40">{deletingId === selectedTopic.id ? tw('saving') : tw('deleteContent')}</button>}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accentColor, opacity: 0.8 }}>
                    {t('recentReplies')}
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>
                    {t('showingReplies', { count: selectedDiscussionReplies.length, total: selectedTopic.replies })}
                  </span>
                </div>

                {selectedDiscussionReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="rounded-xl px-3 sm:px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
                        {reply.authorName}
                      </p>
                      <time className="text-[9px]" style={{ color: 'var(--ghost)' }} dateTime={reply.createdAt}>
                        {new Date(reply.createdAt).toLocaleDateString(locale)}
                      </time>
                    </div>
                    <p className="whitespace-pre-wrap wrap-anywhere text-xs leading-relaxed mt-2" style={{ color: 'var(--ink)', opacity: 0.76 }}>
                      {reply.content}
                    </p>
                    {communityJoined && (
                      <button
                        type="button"
                        disabled={postingDiscussionReply || !!deletingId}
                        onClick={() => setDiscussionReplyDraft(discussionReplyDraft.trim() ? discussionReplyDraft : `@${reply.authorName} `)}
                        className="mt-2 text-[10px] bg-transparent border-none p-0"
                        style={{ color: accentColor, cursor: 'pointer' }}
                      >
                        {t('reply')}
                      </button>
                    )}
                    {reply.canDelete && <button type="button" disabled={postingDiscussionReply || !!deletingId} onClick={() => deleteReply('discussions', selectedTopic.id, reply.id)} className="ml-3 py-2 text-xs text-red-200 disabled:opacity-40">{deletingId === reply.id ? tw('saving') : tw('deleteContent')}</button>}
                    <ReplyLikeButton
                      url={`/api/communities/${community.id}/discussions/${selectedTopic.id}/replies/${reply.id}/like`}
                      likes={reply.likes}
                      likedByMe={reply.likedByMe}
                      disabled={!communityJoined || !!deletingId || pendingReplyLikes.has(`replyLike:discussions:${reply.id}`)}
                      onPending={busy => replyLikePending(`replyLike:discussions:${reply.id}`, busy)}
                      onChange={result => updateReplyLike('discussions', selectedTopic.id, reply.id, result)}
                    />
                  </div>
                ))}
                {replyPageErrors[selectedTopic.id] && <p role="alert" className="text-sm text-red-200">{replyPageErrors[selectedTopic.id]}</p>}
                {(selectedTopic.nextReplyCursor || selectedDiscussionReplies.length < selectedTopic.replies) && (
                  <button type="button" onClick={() => loadDiscussionReplies(selectedTopic)} disabled={replyPageLoading[selectedTopic.id]} className="py-2 text-sm text-violet-200 disabled:opacity-40">
                    {replyPageLoading[selectedTopic.id] ? t('loadingReplies') : replyPageErrors[selectedTopic.id] ? t('retryLoad') : t('loadMoreReplies')}
                  </button>
                )}
              </div>
              {postError && <p role="alert" className="text-sm text-red-200">{postError}</p>}
              {contentStatus && <p role="status" className="text-sm text-violet-200">{contentStatus}</p>}

              {communityJoined ? (
                <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <textarea
                    value={discussionReplyDraft}
                    disabled={postingDiscussionReply || !!deletingId}
                    maxLength={600}
                    aria-label={t('addReplyPlaceholder')}
                    onChange={(event) => setDiscussionReplyDraft(event.target.value)}
                    rows={3}
                    placeholder={t('addReplyPlaceholder')}
                    className="w-full resize-none rounded-xl px-4 py-3 text-base sm:text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--foreground)',
                    }}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddDiscussionReply}
                      disabled={discussionReplyDraft.trim().length < 2 || postingDiscussionReply || !!deletingId}
                      className="px-4 py-2 rounded-xl text-xs font-medium w-full sm:w-auto"
                      style={{
                        color: 'var(--foreground)',
                        background: `${accentColor}24`,
                        border: `1px solid ${accentColor}40`,
                        cursor: discussionReplyDraft.trim() && !postingDiscussionReply ? 'pointer' : 'default',
                        opacity: discussionReplyDraft.trim() && !postingDiscussionReply ? 1 : 0.55,
                      }}
                    >
                      {postingDiscussionReply ? t('saving') : t('sendReply')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                    {t('joinToReplyHint')}
                  </p>
                  <button
                    type="button"
                    onClick={handleJoinCommunity}
                    disabled={joiningCommunity || communityLoading || !community}
                    className="px-4 py-2 rounded-xl text-xs font-medium w-full sm:w-auto"
                    style={{ color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}32`, cursor: 'pointer' }}
                  >
                    {joiningCommunity ? t('joining') : t('joinToReply')}
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  disabled={postingDiscussionReply || !!deletingId || discussionLikePending}
                  className="rounded-xl px-4 py-2 text-xs font-medium w-full sm:w-auto"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ink)', cursor: 'pointer' }}
                >
                  {t('closeThread')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Planet preview drawer */}
      <PlanetPreviewDrawer
        planet={selectedPlanet}
        open={!!selectedPlanet}
        onClose={() => setSelectedPlanet(null)}
        userRole={userRole}
        savedPlanetIds={savedPlanetIds}
      />
    </>
  )
}
