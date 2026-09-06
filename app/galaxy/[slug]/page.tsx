'use client'

import { useState, useEffect, use } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import EventsTab from '@/components/events/EventsTab'
import PlanetCard from '@/components/planet/PlanetCard'
import PlanetPreviewDrawer from '@/components/planet/PlanetPreviewDrawer'
import LockedLayer from '@/components/ui/LockedLayer'
import { getGalaxyBySlug, getRelatedGalaxies, getGalaxyPreviews, resolveGalaxySlug } from '@/lib/mock-galaxies'
import { getPlanetById } from '@/lib/mock-planets'
import type { PlanetProfile } from '@/types/planet'

interface CommunityRow {
  id: string
  slug: string
  name: string
  joined: boolean
  isAdmin?: boolean
}

interface CommunityPost {
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
  id: string
  authorName: string
  authorPlanetId?: string
  content: string
  createdAt: string
}

interface ApiCommunityReply {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    name: string
    planet: { id: string; name: string } | null
  }
}

interface ApiCommunityPost {
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
  id: string
  title: string
  replies: number
  heat: number
  replyItems?: DiscussionReply[]
}

interface DiscussionReply {
  id: string
  authorName: string
  content: string
  createdAt: string
}

interface ApiCommunityDiscussion {
  id: string
  title: string
  heat: number
  replies: number
  replyItems?: ApiCommunityReply[]
}

function apiReplyToCommunityReply(reply: ApiCommunityReply): CommunityReply {
  return {
    id: reply.id,
    authorName: reply.author.planet?.name ?? reply.author.name,
    authorPlanetId: reply.author.planet?.id,
    content: reply.content,
    createdAt: reply.createdAt,
  }
}

function apiPostToCommunityPost(post: ApiCommunityPost): CommunityPost {
  return {
    id: post.id,
    authorName: post.author.planet?.name ?? post.author.name,
    authorPlanetId: post.author.planet?.id,
    content: post.content,
    createdAt: post.createdAt,
    likes: post.likes,
    replies: post.replies,
    likedByMe: post.likedByMe ?? false,
    replyItems: (post.replyItems ?? []).map(apiReplyToCommunityReply),
  }
}

function apiDiscussionToTopic(discussion: ApiCommunityDiscussion): DiscussionTopic {
  return {
    id: discussion.id,
    title: discussion.title,
    heat: discussion.heat,
    replies: discussion.replies,
    replyItems: (discussion.replyItems ?? []).map(apiReplyToCommunityReply),
  }
}

// --- Page --------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>
}

export default function GalaxyPage({ params }: Props) {
  const router = useRouter()
  const t = useTranslations('galaxyPage')
  const { slug } = use(params)
  const resolvedSlug = resolveGalaxySlug(slug)
  const galaxy = getGalaxyBySlug(slug)

  if (!galaxy) notFound()

  const [selectedPlanet, setSelectedPlanet] = useState<PlanetProfile | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null)
  const [userRole, setUserRole] = useState<'explorer' | 'resonator'>('explorer')
  const [savedPlanetIds, setSavedPlanetIds] = useState<Set<string> | null>(null)
  const [community, setCommunity] = useState<CommunityRow | null>(null)
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
  const [reload, setReload] = useState(0)
  const [posting, setPosting] = useState(false)
  const [postingDiscussionReply, setPostingDiscussionReply] = useState(false)
  const [postError, setPostError] = useState('')
  const [postDraft, setPostDraft] = useState('')
  const [likingPostId, setLikingPostId] = useState<string | null>(null)
  const [replyingPostId, setReplyingPostId] = useState<string | null>(null)
  const [loadingRepliesPostId, setLoadingRepliesPostId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})
  const [discussionReplyDraft, setDiscussionReplyDraft] = useState('')
  const [discussionReplyOverrides, setDiscussionReplyOverrides] = useState<Record<string, DiscussionReply[]>>({})

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
      if (!cancelled) { setCommunityLoading(true); setCommunityError(''); setCommunity(null); setCommunityJoined(false) }
    })
    fetch('/api/communities')
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable')
        return res.json() as Promise<CommunityRow[]>
      })
      .then((rows) => {
        if (cancelled) return
        const match = rows.find((row) => resolveGalaxySlug(row.slug) === resolvedSlug)
        setCommunity(match ?? null)
        setCommunityJoined(match?.joined ?? false)
        if (!match) setCommunityError(t('communityUnavailable'))
      })
      .catch(() => { if (!cancelled) setCommunityError(t('communityUnavailable')) })
      .finally(() => { if (!cancelled) setCommunityLoading(false) })
    return () => { cancelled = true }
  }, [resolvedSlug, reload, t])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) { setCommunityPosts([]); setPostsError(''); setPostsLoading(!!community) }
    })
    if (!community) return () => { cancelled = true }
    fetch(`/api/communities/${community.id}/posts`)
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable')
        return res.json() as Promise<{ joined?: boolean; posts: ApiCommunityPost[] }>
      })
      .then((data) => {
        if (cancelled) return
        if (typeof data.joined === 'boolean') setCommunityJoined(data.joined)
        setCommunityPosts(data.posts.map(apiPostToCommunityPost))
      })
      .catch(() => { if (!cancelled) setPostsError(t('postsUnavailable')) })
      .finally(() => { if (!cancelled) setPostsLoading(false) })
    return () => { cancelled = true }
  }, [community, t])

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) {
        setDiscussionTopics([]); setDiscussionsError(''); setDiscussionsLoading(!!community)
        setSelectedTopic(null); setDiscussionReplyOverrides({})
      }
    })
    if (!community) return () => { cancelled = true }
    fetch(`/api/communities/${community.id}/discussions`)
      .then(async (res) => {
        if (!res.ok) throw new Error('unavailable')
        return res.json() as Promise<{ discussions: ApiCommunityDiscussion[] }>
      })
      .then((data) => { if (!cancelled) setDiscussionTopics(data.discussions.map(apiDiscussionToTopic)) })
      .catch(() => { if (!cancelled) setDiscussionsError(t('discussionsUnavailable')) })
      .finally(() => { if (!cancelled) setDiscussionsLoading(false) })
    return () => { cancelled = true }
  }, [community, t])

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

      if (res.ok) setCommunityJoined(true)
      else setPostError(t('joinFailed'))
    } catch {
      setPostError(t('joinFailed'))
    } finally {
      setJoiningCommunity(false)
    }
  }

  async function handleCreatePost() {
    const content = postDraft.trim()
    if (!content || !communityJoined) return

    if (!community) {
      setPostError(t('communityUnavailable'))
      return
    }

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
        setPostError('Join this community before posting.')
        setCommunityJoined(false)
        return
      }

      if (!res.ok) {
        setPostError('Your post could not be published yet.')
        return
      }

      const data = await res.json() as { post: ApiCommunityPost }
      setCommunityPosts((prev) => [apiPostToCommunityPost(data.post), ...prev])
      setPostDraft('')
    } catch {
      setPostError('Your post could not be published yet.')
    } finally {
      setPosting(false)
    }
  }

  function updateCommunityPost(postId: string, updater: (post: CommunityPost) => CommunityPost) {
    setCommunityPosts((prev) => prev.map((post) => post.id === postId ? updater(post) : post))
  }

  async function handleToggleLike(post: CommunityPost) {
    if (!communityJoined) {
      setPostError('Join this community before liking posts.')
      return
    }

    setPostError('')

    if (!community) { setPostError(t('communityUnavailable')); return }

    setLikingPostId(post.id)
    try {
      const res = await fetch(`/api/communities/${community.id}/posts/${post.id}/like`, { method: 'POST' })

      if (res.status === 401) {
        router.push('/sign-in')
        return
      }

      if (res.status === 403) {
        setPostError('Join this community before liking posts.')
        setCommunityJoined(false)
        return
      }

      if (!res.ok) {
        setPostError('The like could not be saved yet.')
        return
      }

      const data = await res.json() as { liked: boolean; likes: number }
      updateCommunityPost(post.id, (current) => ({ ...current, likedByMe: data.liked, likes: data.likes }))
    } catch {
      setPostError('The like could not be saved yet.')
    } finally {
      setLikingPostId(null)
    }
  }

  async function handleCreateReply(post: CommunityPost) {
    const content = (replyDrafts[post.id] ?? '').trim()
    if (!content) return

    if (!communityJoined) {
      setPostError('Join this community before replying.')
      return
    }

    setPostError('')

    if (!community) { setPostError(t('communityUnavailable')); return }

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
        setPostError('Join this community before replying.')
        setCommunityJoined(false)
        return
      }

      if (!res.ok) {
        setPostError('Your reply could not be published yet.')
        return
      }

      const data = await res.json() as { reply: ApiCommunityReply; replies: number }
      const reply = apiReplyToCommunityReply(data.reply)
      updateCommunityPost(post.id, (current) => ({
        ...current,
        replies: data.replies,
        replyItems: [...current.replyItems, reply],
      }))
      setReplyDrafts((prev) => ({ ...prev, [post.id]: '' }))
      setExpandedReplies((prev) => ({ ...prev, [post.id]: true }))
    } catch {
      setPostError('Your reply could not be published yet.')
    } finally {
      setReplyingPostId(null)
    }
  }

  async function handleToggleReplies(post: CommunityPost) {
    const isOpen = expandedReplies[post.id] ?? post.replyItems.length > 0
    if (isOpen) {
      setExpandedReplies((prev) => ({ ...prev, [post.id]: false }))
      return
    }

    setExpandedReplies((prev) => ({ ...prev, [post.id]: true }))

    if (!community || post.replyItems.length >= post.replies) return

    setLoadingRepliesPostId(post.id)
    setPostError('')
    try {
      const res = await fetch(`/api/communities/${community.id}/posts/${post.id}/replies`)
      if (!res.ok) {
        setPostError('Replies could not be loaded yet.')
        return
      }

      const data = await res.json() as { replies: ApiCommunityReply[] }
      const replyItems = data.replies.map(apiReplyToCommunityReply)
      updateCommunityPost(post.id, (current) => ({ ...current, replies: replyItems.length, replyItems }))
    } catch {
      setPostError('Replies could not be loaded yet.')
    } finally {
      setLoadingRepliesPostId(null)
    }
  }

  function handleReplyToReply(postId: string, authorName: string) {
    setExpandedReplies((prev) => ({ ...prev, [postId]: true }))
    setReplyDrafts((prev) => {
      const current = prev[postId] ?? ''
      return { ...prev, [postId]: current.trim() ? current : `@${authorName} ` }
    })
  }

  async function handleAddDiscussionReply() {
    const content = discussionReplyDraft.trim()
    if (!selectedTopic || !content) return

    const key = selectedTopic.id
    const currentReplies = discussionReplyOverrides[key] ?? selectedTopic.replyItems ?? []

    if (community && selectedTopic.id) {
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
          setPostError('Join this community before replying.')
          setCommunityJoined(false)
          return
        }

        if (!res.ok) {
          setPostError('Your discussion reply could not be saved yet.')
          return
        }

        const data = await res.json() as { reply: ApiCommunityReply; replies: number }
        const reply = apiReplyToCommunityReply(data.reply)
        const nextReplies = [...currentReplies, reply]

        setDiscussionReplyOverrides((prev) => ({ ...prev, [key]: nextReplies }))
        setDiscussionTopics((prev) => prev.map((topic) => topic.id === selectedTopic.id ? { ...topic, replies: data.replies, replyItems: nextReplies } : topic))
        setSelectedTopic((current) => current ? { ...current, replies: data.replies, replyItems: nextReplies } : current)
        setDiscussionReplyDraft('')
      } catch {
        setPostError('Your discussion reply could not be saved yet.')
      } finally {
        setPostingDiscussionReply(false)
      }
      return
    }

    setPostError(t('communityUnavailable'))
  }

  const memberPlanets = galaxy.activePlanetIds
    .map((id) => getPlanetById(id))
    .filter((p): p is PlanetProfile => !!p)

  const relatedGalaxies = getRelatedGalaxies(galaxy.keywords, resolvedSlug)
  const relatedPreviews = getGalaxyPreviews().filter((g) =>
    relatedGalaxies.some((r) => r.id === g.id)
  )

  const discussions = discussionTopics
  const { accentColor } = galaxy
  const isGalaxyAdmin = community?.isAdmin ?? false
  const selectedDiscussionReplies = selectedTopic
    ? discussionReplyOverrides[selectedTopic.id] ?? selectedTopic.replyItems ?? []
    : []

  return (
    <>
      <AppShell>
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
                    {galaxy.mood}
                  </span>
                  <span
                    className="px-3 py-1 rounded-xl text-xs capitalize"
                    style={{ background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border-soft)' }}
                  >
                    {galaxy.maturity}
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
                    {joiningCommunity ? t('joining') : t('joinGalaxy')}
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

          {(communityLoading || communityError || postError) && (
            <div className="px-4 py-3 max-w-5xl mx-auto" role={communityError || postError ? 'alert' : 'status'}>
              <p className="text-sm">{communityLoading ? t('loadingCommunity') : communityError || postError}</p>
              {communityError && <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-2 underline">{t('retryLoad')}</button>}
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
                      <p className="text-sm" style={{ color: 'var(--ghost)' }}>{t('noActivePlanets')}</p>
                    </div>
                  )}
                </section>

                {/* Events */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-data-label">{t('events')}</p>
                    {isGalaxyAdmin && <span className="text-xs" style={{ color: accentColor }}>{t('admin')}</span>}
                  </div>
                  <EventsTab galaxyId={community?.id ?? null} isAdmin={isGalaxyAdmin} canPropose={communityJoined || isGalaxyAdmin} />
                </section>

                {/* Discussions */}
                {(communityLoading || discussionsLoading || discussionsError || discussions.length === 0) && (
                  <section aria-label={t('recentDiscussions')}>
                    <p className="text-data-label mb-4">{t('recentDiscussions')}</p>
                    <p role={discussionsError ? 'alert' : 'status'} className="text-sm">
                      {communityLoading || discussionsLoading ? t('loadingDiscussions') : discussionsError || t('noDiscussions')}
                    </p>
                    {discussionsError && <button type="button" onClick={() => setReload((value) => value + 1)} className="mt-2 underline">{t('retryLoad')}</button>}
                  </section>
                )}
                {discussions.length > 0 && (
                  <section>
                    <p className="text-data-label mb-4">{t('recentDiscussions')}</p>

                    {userRole === 'resonator' ? (
                      <div className="flex flex-col gap-2">
                        {discussions.map((topic, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full flex items-start gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl text-left transition-all duration-200"
                            style={{
                              background: 'var(--surface)',
                              border:     '1px solid var(--border-soft)',
                              cursor:     'pointer',
                            }}
                            onClick={() => setSelectedTopic(topic)}
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
                                {topic.replies} replies
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <LockedLayer
                        reason="Create your planet to join discussions and see the full community"
                        ctaLabel="Begin formation"
                        ctaHref="/onboarding"
                      >
                        <div className="flex flex-col gap-2">
                          {discussions.slice(0, 2).map((topic, i) => (
                            <div
                              key={i}
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

                <section>
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
                          onChange={(event) => setPostDraft(event.target.value)}
                          rows={3}
                          placeholder={`Post to ${galaxy.name}...`}
                          className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
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
                            disabled={!postDraft.trim() || posting}
                            className="px-4 py-2 rounded-xl text-xs font-medium w-full sm:w-auto"
                            style={{
                              color: 'var(--foreground)',
                              background: `${accentColor}26`,
                              border: `1px solid ${accentColor}42`,
                              cursor: postDraft.trim() && !posting ? 'pointer' : 'default',
                              opacity: postDraft.trim() && !posting ? 1 : 0.55,
                            }}
                          >
                            {posting ? 'Posting...' : 'Post'}
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
                            Join to post in {galaxy.name}
                          </p>
                          <p className="text-xs mt-1" style={{ color: 'var(--ghost)' }}>
                            You can read public posts now. Posting unlocks after joining.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleJoinCommunity}
                          disabled={joiningCommunity || communityLoading || !community}
                          className="px-4 py-2 rounded-xl text-xs font-medium shrink-0 w-full sm:w-auto"
                          style={{ color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}32`, cursor: 'pointer' }}
                        >
                          {joiningCommunity ? 'Joining...' : 'Join to post'}
                        </button>
                      </div>
                    )}

                    {postsError ? (
                      <div role="alert"><p>{postsError}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="mt-2 underline">{t('retryLoad')}</button></div>
                    ) : communityLoading || postsLoading ? (
                      <p className="text-sm py-4" style={{ color: 'var(--ghost)' }}>
                        Loading community posts...
                      </p>
                    ) : communityPosts.length === 0 ? (
                      <p className="text-sm py-4" style={{ color: 'var(--ghost)' }}>
                        No posts yet. Join and start the first signal.
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
                                {new Date(post.createdAt).toLocaleDateString()}
                              </time>
                            </div>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.78 }}>
                              {post.content}
                            </p>
                            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleToggleLike(post)}
                                disabled={likingPostId === post.id}
                                className="px-2 py-2 sm:py-1 rounded-lg transition-all duration-200"
                                style={{
                                  color: post.likedByMe ? accentColor : 'var(--ghost)',
                                  background: post.likedByMe ? `${accentColor}14` : 'rgba(255,255,255,0.03)',
                                  border: post.likedByMe ? `1px solid ${accentColor}30` : '1px solid rgba(255,255,255,0.06)',
                                  cursor: likingPostId === post.id ? 'default' : 'pointer',
                                  opacity: likingPostId === post.id ? 0.65 : 1,
                                }}
                              >
                                {post.likedByMe ? 'Liked' : 'Like'} · {post.likes}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleReplies(post)}
                                disabled={loadingReplies}
                                className="px-2 py-2 sm:py-1 rounded-lg transition-all duration-200"
                                style={{
                                  color: repliesOpen ? accentColor : 'var(--ghost)',
                                  background: repliesOpen ? `${accentColor}10` : 'rgba(255,255,255,0.03)',
                                  border: repliesOpen ? `1px solid ${accentColor}26` : '1px solid rgba(255,255,255,0.06)',
                                  cursor: loadingReplies ? 'default' : 'pointer',
                                  opacity: loadingReplies ? 0.65 : 1,
                                }}
                              >
                                {loadingReplies ? 'Loading...' : 'Reply'} · {post.replies}
                              </button>
                            </div>

                            {repliesOpen && (
                              <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                {loadingReplies && (
                                  <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                                    Loading replies...
                                  </p>
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
                                          <time className="text-[9px]" style={{ color: 'var(--ghost)' }} dateTime={reply.createdAt}>
                                            {new Date(reply.createdAt).toLocaleDateString()}
                                          </time>
                                        </div>
                                        <p className="text-xs leading-relaxed mt-1" style={{ color: 'var(--ink)', opacity: 0.74 }}>
                                          {reply.content}
                                        </p>
                                        {communityJoined && (
                                          <button
                                            type="button"
                                            onClick={() => handleReplyToReply(post.id, reply.authorName)}
                                            className="mt-1 text-[10px] bg-transparent border-none p-0"
                                            style={{ color: accentColor, cursor: 'pointer' }}
                                          >
                                            Reply
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!loadingReplies && post.replyItems.length === 0 && (
                                  <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                                    No replies yet. Start the first one.
                                  </p>
                                )}

                                {communityJoined ? (
                                  <div className="flex flex-col gap-2">
                                    <textarea
                                      value={replyDraft}
                                      onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [post.id]: event.target.value }))}
                                      rows={2}
                                      placeholder={`Reply to ${post.authorName}...`}
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
                                        disabled={!replyDraft.trim() || replyingPostId === post.id}
                                        className="px-3 py-2 sm:py-1.5 rounded-lg text-[10px] font-medium w-full sm:w-auto"
                                        style={{
                                          color: 'var(--foreground)',
                                          background: `${accentColor}22`,
                                          border: `1px solid ${accentColor}38`,
                                          cursor: replyDraft.trim() && replyingPostId !== post.id ? 'pointer' : 'default',
                                          opacity: replyDraft.trim() && replyingPostId !== post.id ? 1 : 0.55,
                                        }}
                                      >
                                        {replyingPostId === post.id ? 'Replying...' : 'Send reply'}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                                    Join this community to like and reply.
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
                      { label: t('atmosphere'), value: galaxy.mood },
                      { label: t('status'), value: galaxy.maturity },
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
            onClick={() => setSelectedTopic(null)}
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
                  <h2 className="text-base sm:text-lg font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                    {selectedTopic.title}
                  </h2>
                  <p className="text-xs sm:text-sm leading-relaxed mt-3" style={{ color: 'var(--ink)', opacity: 0.72 }}>
                    {t('discussionIntro', { name: galaxy.name })}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accentColor, opacity: 0.8 }}>
                    {t('recentReplies')}
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>
                    {t('showingAll', { count: selectedDiscussionReplies.length })}
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
                        {new Date(reply.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                    <p className="text-xs leading-relaxed mt-2" style={{ color: 'var(--ink)', opacity: 0.76 }}>
                      {reply.content}
                    </p>
                    {communityJoined && (
                      <button
                        type="button"
                        onClick={() => setDiscussionReplyDraft((current) => current.trim() ? current : `@${reply.authorName} `)}
                        className="mt-2 text-[10px] bg-transparent border-none p-0"
                        style={{ color: accentColor, cursor: 'pointer' }}
                      >
                        {t('reply')}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {communityJoined ? (
                <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <textarea
                    value={discussionReplyDraft}
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
                      disabled={!discussionReplyDraft.trim() || postingDiscussionReply}
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
