'use client'

import { useState, useEffect, use } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import PlanetCard from '@/components/planet/PlanetCard'
import PlanetPreviewDrawer from '@/components/planet/PlanetPreviewDrawer'
import LockedLayer from '@/components/ui/LockedLayer'
import { getGalaxyBySlug, getRelatedGalaxies, getGalaxyPreviews, resolveGalaxySlug } from '@/lib/mock-galaxies'
import { getPlanetById } from '@/lib/mock-planets'
import { getUserRole } from '@/lib/user'
import type { PlanetProfile } from '@/types/planet'

interface CommunityRow {
  id: string
  slug: string
  name: string
  joined: boolean
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
  id?: string
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

const DEFAULT_COMMUNITY_POSTS: Partial<Record<string, CommunityPost[]>> = {
  'slow-thinkers': [
    { id: 'slow-post-1', authorName: 'Aelion-42', content: 'What book changed how slowly you allow yourself to think?', createdAt: '2026-04-30T07:20:00Z', likes: 18, replies: 2, replyItems: [
      { id: 'slow-reply-1', authorName: 'Sorvae-88', content: 'A book that made me pause between paragraphs instead of racing to the end.', createdAt: '2026-04-30T08:10:00Z' },
      { id: 'slow-reply-2', authorName: 'Noctaris', content: 'Second reads are where the hidden architecture appears.', createdAt: '2026-04-30T08:42:00Z' },
    ] },
    { id: 'slow-post-2', authorName: 'Sorvae-88', content: 'Stillness is a practice. Today I am trying not to interrupt my own thoughts.', createdAt: '2026-04-29T19:10:00Z', likes: 24, replies: 2, replyItems: [
      { id: 'slow-reply-3', authorName: 'Aelion-42', content: 'This is exactly the discipline I keep forgetting is a discipline.', createdAt: '2026-04-29T20:08:00Z' },
      { id: 'slow-reply-4', authorName: 'Lumira-33', content: 'Sometimes the first quiet minute is the hardest one.', createdAt: '2026-04-29T21:16:00Z' },
    ] },
  ],
  'signal-noise': [
    { id: 'signal-post-1', authorName: 'Kindus-17', content: 'Tiny build log: the simplest version was the one that survived contact with reality.', createdAt: '2026-04-30T09:40:00Z', likes: 31, replies: 3, replyItems: [
      { id: 'signal-reply-1', authorName: 'Novaxis', content: 'The version with fewer moving parts is usually the one future-you can still debug.', createdAt: '2026-04-30T10:02:00Z' },
      { id: 'signal-reply-2', authorName: 'Spirax', content: 'Tiny build logs are underrated. They show the actual shape of decisions.', createdAt: '2026-04-30T10:44:00Z' },
      { id: 'signal-reply-3', authorName: 'Kindus-17', content: '@Spirax yes, the log became more useful than the feature list.', createdAt: '2026-04-30T11:12:00Z' },
    ] },
    { id: 'signal-post-2', authorName: 'Novaxis', content: 'What is your boring stack that keeps paying rent?', createdAt: '2026-04-28T16:00:00Z', likes: 27, replies: 2, replyItems: [
      { id: 'signal-reply-4', authorName: 'Kindus-17', content: 'Postgres, queues, server-rendered pages, and tests that cover the flows people actually use.', createdAt: '2026-04-28T17:20:00Z' },
      { id: 'signal-reply-5', authorName: 'Aelion-42', content: 'Anything boring enough that the team can explain it under pressure.', createdAt: '2026-04-28T18:05:00Z' },
    ] },
  ],
  'warm-frequency': [
    { id: 'warm-post-1', authorName: 'Orbalin', content: 'A small kindness I received today changed the texture of the whole afternoon.', createdAt: '2026-04-30T10:05:00Z', likes: 44, replies: 2, replyItems: [
      { id: 'warm-reply-1', authorName: 'Elarith', content: 'Those tiny gestures stay in the room long after the moment ends.', createdAt: '2026-04-30T10:32:00Z' },
      { id: 'warm-reply-2', authorName: 'Calenvix', content: 'I love when a day changes because someone noticed something small.', createdAt: '2026-04-30T11:00:00Z' },
    ] },
  ],
  'threshold-states': [
    { id: 'threshold-post-1', authorName: 'Lumira-33', content: 'Home felt less like a place today and more like a rhythm I briefly remembered.', createdAt: '2026-04-29T11:35:00Z', likes: 38, replies: 2, replyItems: [
      { id: 'threshold-reply-1', authorName: 'Driftan', content: 'That rhythm thing is real. Some cities have it, some people carry it.', createdAt: '2026-04-29T12:20:00Z' },
      { id: 'threshold-reply-2', authorName: 'Sorvae-88', content: 'Home as tempo, not coordinates. That lands.', createdAt: '2026-04-29T13:05:00Z' },
    ] },
  ],
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

// --- Mock discussion topics per galaxy ---------------------------------------

const DISCUSSION_TOPICS: Partial<Record<string, DiscussionTopic[]>> = {
  'slow-thinkers': [
    { title: 'What does "thinking slowly" actually mean to you?',    replies: 24, heat: 0.8 },
    { title: 'Books that reward a second read more than the first',   replies: 31, heat: 0.9 },
    { title: '深夜写作 vs 清晨写作  -  which surfaces different thoughts?', replies: 18, heat: 0.6 },
    { title: 'The courage to sit with uncertainty instead of resolving it', replies: 12, heat: 0.4 },
  ],
  'signal-noise': [
    { title: 'What\'s your "boring" tech stack that actually works?', replies: 42, heat: 0.9 },
    { title: 'Software craft vs software speed  -  a false dichotomy?', replies: 55, heat: 1.0 },
    { title: 'When does a side project become an obsession?',         replies: 29, heat: 0.7 },
    { title: 'The aesthetics of well-named variables',                replies: 16, heat: 0.5 },
  ],
  'dusk-archives': [
    { title: 'A book that felt like it was written specifically for you', replies: 48, heat: 1.0 },
    { title: 'Films that only make sense after you\'ve lived more',   replies: 33, heat: 0.8 },
    { title: '被遗忘的音乐  -  share something no one talks about',        replies: 22, heat: 0.6 },
    { title: 'The sentence that stopped you and wouldn\'t let you continue', replies: 19, heat: 0.5 },
  ],
  'warm-frequency': [
    { title: 'Small acts of care that meant more than intended',      replies: 38, heat: 0.9 },
    { title: 'What makes a conversation feel genuinely safe?',        replies: 27, heat: 0.7 },
    { title: '如何在城市中建立真实的连接',                                 replies: 45, heat: 1.0 },
    { title: 'Mutual aid stories  -  help you gave or received',        replies: 21, heat: 0.6 },
  ],
  'image-makers': [
    { title: 'The composition that made you rethink everything',      replies: 36, heat: 0.8 },
    { title: 'Tools vs intent  -  does your equipment shape your vision?', replies: 44, heat: 0.9 },
    { title: '摄影是记录还是创造？',                                       replies: 29, heat: 0.7 },
    { title: 'A photo that works for reasons you can\'t explain',     replies: 17, heat: 0.5 },
  ],
  'threshold-states': [
    { title: 'The city you left that still lives inside you',         replies: 52, heat: 1.0 },
    { title: 'What does "home" mean when you\'ve lived in 4 countries?', replies: 41, heat: 0.9 },
    { title: 'Third culture identity  -  the parts you keep, the parts you lose', replies: 34, heat: 0.8 },
    { title: '流浪者的孤独  -  does movement become avoidance?',            replies: 23, heat: 0.6 },
  ],
  'body-clocks': [
    { title: 'Movement practices that changed your thinking',         replies: 31, heat: 0.7 },
    { title: 'Sleep is a skill  -  what actually helped you',           replies: 47, heat: 1.0 },
    { title: 'The difference between training and performing',        replies: 22, heat: 0.6 },
    { title: '身体的智慧  -  moments your body knew before your mind did', replies: 28, heat: 0.7 },
  ],
  'late-night-economics': [
    { title: 'The economic model no one taught you that explains everything', replies: 58, heat: 1.0 },
    { title: 'Housing as a political choice, not just a market',      replies: 44, heat: 0.9 },
    { title: '城市如何塑造我们的欲望',                                     replies: 33, heat: 0.8 },
    { title: 'When did "hustle culture" stop working for you?',       replies: 26, heat: 0.6 },
  ],
}

const DISCUSSION_REPLY_SAMPLES: Partial<Record<string, DiscussionReply[]>> = {
  'signal-noise:What\'s your "boring" tech stack that actually works?': [
    { id: 'disc-signal-1', authorName: 'Kindus-17', content: 'Postgres, a small queue, server-rendered pages, and boring logs. It sounds dull until something breaks and the fix is obvious.', createdAt: '2026-04-30T08:45:00Z' },
    { id: 'disc-signal-2', authorName: 'Novaxis-3', content: 'I keep returning to relational data and plain HTTP. The less magical the stack, the easier it is to keep a product alive.', createdAt: '2026-04-30T09:08:00Z' },
    { id: 'disc-signal-3', authorName: 'Spirax-14', content: 'My boring stack is whatever lets me delete code without fear. Usually that means fewer services than I first wanted.', createdAt: '2026-04-30T09:37:00Z' },
  ],
  'signal-noise:Software craft vs software speed  -  a false dichotomy?': [
    { id: 'disc-signal-4', authorName: 'Novaxis-3', content: 'Speed without craft becomes rework. Craft without delivery becomes private art. The interesting part is the rhythm.', createdAt: '2026-04-30T07:20:00Z' },
    { id: 'disc-signal-5', authorName: 'Kindus-17', content: 'The fastest teams I have seen had boring foundations and very sharp taste about what not to build.', createdAt: '2026-04-30T07:58:00Z' },
  ],
  'signal-noise:When does a side project become an obsession?': [
    { id: 'disc-signal-6', authorName: 'Spirax-14', content: 'When the project starts asking questions about your life instead of just your code.', createdAt: '2026-04-29T22:12:00Z' },
    { id: 'disc-signal-7', authorName: 'Aelion-42', content: 'For me, it is the moment I make a roadmap no one asked for.', createdAt: '2026-04-29T22:50:00Z' },
  ],
  'signal-noise:The aesthetics of well-named variables': [
    { id: 'disc-signal-8', authorName: 'Kindus-17', content: 'A good variable name lowers the temperature of the whole function.', createdAt: '2026-04-29T18:05:00Z' },
    { id: 'disc-signal-9', authorName: 'Novaxis-3', content: 'Names are architecture in miniature. They decide what future readers are allowed to notice.', createdAt: '2026-04-29T18:44:00Z' },
  ],
}

const DISCUSSION_REPLY_FILLERS = [
  'I keep coming back to this because the answer changes depending on the project and the people around it.',
  'The strongest version of this idea is probably quieter than the one we usually argue about.',
  'There is something useful in separating taste from habit here. They look similar from the outside.',
  'I agree with the direction, but I think the constraint matters more than the tool choice.',
  'This feels like one of those topics where the boring answer is the most honest one.',
  'The pattern I notice is that good systems make the next decision less dramatic.',
  'I would add that maintenance changes the meaning of almost every early design choice.',
  'Sometimes the real question is what you can explain clearly after being away from it for a month.',
  'This is why I like small examples. They reveal the philosophy faster than abstract rules.',
  'The tension here is productive. Too much certainty would make the thread less useful.',
] as const

const DISCUSSION_REPLY_AUTHORS = [
  'Aelion-42',
  'Novaxis-3',
  'Kindus-17',
  'Spirax-14',
  'Sorvae-88',
  'Lumira-33',
  'Orbalin',
  'Calenvix',
] as const

function getDiscussionKey(slug: string, title: string) {
  return `${slug}:${title}`
}

function getDiscussionReplies(slug: string, topic: DiscussionTopic): DiscussionReply[] {
  const baseReplies = DISCUSSION_REPLY_SAMPLES[getDiscussionKey(slug, topic.title)] ?? [
    { id: `${slug}-${topic.title}-reply-1`, authorName: 'Aelion-42', content: 'This thread is still unfolding. I like that the question leaves room for different answers.', createdAt: '2026-04-30T08:00:00Z' },
    { id: `${slug}-${topic.title}-reply-2`, authorName: 'Sorvae-88', content: 'The strongest replies here are usually the ones that make the original question more precise.', createdAt: '2026-04-30T08:30:00Z' },
  ]

  if (baseReplies.length >= topic.replies) return baseReplies.slice(0, topic.replies)

  const generatedReplies = Array.from({ length: topic.replies - baseReplies.length }, (_, index) => {
    const number = baseReplies.length + index + 1
    const filler = DISCUSSION_REPLY_FILLERS[index % DISCUSSION_REPLY_FILLERS.length]
    const authorName = DISCUSSION_REPLY_AUTHORS[(index + topic.title.length) % DISCUSSION_REPLY_AUTHORS.length]
    const hour = 9 + Math.floor(index / 3)
    const minute = (index * 11) % 60

    return {
      id: `${slug}-${topic.title}-generated-${number}`,
      authorName,
      content: filler,
      createdAt: `2026-04-30T${String(hour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
    }
  })

  return [...baseReplies, ...generatedReplies]
}

// --- Page --------------------------------------------------------------------

interface Props {
  params: Promise<{ slug: string }>
}

export default function GalaxyPage({ params }: Props) {
  const router = useRouter()
  const { slug } = use(params)
  const resolvedSlug = resolveGalaxySlug(slug)
  const galaxy = getGalaxyBySlug(slug)

  if (!galaxy) notFound()

  const [selectedPlanet, setSelectedPlanet] = useState<PlanetProfile | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<DiscussionTopic | null>(null)
  const [userRole, setUserRole] = useState<'explorer' | 'resonator'>('explorer')
  const [community, setCommunity] = useState<CommunityRow | null>(null)
  const [communityJoined, setCommunityJoined] = useState(false)
  const [joiningCommunity, setJoiningCommunity] = useState(false)
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([])
  const [discussionTopics, setDiscussionTopics] = useState<DiscussionTopic[]>([])
  const [postsLoading, setPostsLoading] = useState(true)
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

  // getUserRole reads localStorage  -  must run client-side only
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setUserRole(getUserRole())
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    fetch('/api/communities')
      .then((res) => res.ok ? res.json() : [])
      .then((rows: CommunityRow[]) => {
        if (cancelled) return
        const match = rows.find((row) => resolveGalaxySlug(row.slug) === resolvedSlug)
        setCommunity(match ?? null)
        setCommunityJoined(match?.joined ?? false)
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [resolvedSlug])

  useEffect(() => {
    let cancelled = false
    const defaults = DEFAULT_COMMUNITY_POSTS[resolvedSlug] ?? []

    if (!community) {
      Promise.resolve().then(() => {
        if (cancelled) return
        setCommunityPosts(defaults)
        setPostsLoading(false)
      })
      return () => { cancelled = true }
    }

    setPostsLoading(true)
    setPostError('')

    fetch(`/api/communities/${community.id}/posts`)
      .then((res) => res.ok ? res.json() : { posts: [] })
      .then((data: { joined?: boolean; posts?: ApiCommunityPost[] }) => {
        if (cancelled) return
        if (typeof data.joined === 'boolean') setCommunityJoined(data.joined)
        const apiPosts = (data.posts ?? []).map(apiPostToCommunityPost)
        setCommunityPosts(apiPosts.length > 0 ? apiPosts : defaults)
      })
      .catch(() => {
        if (!cancelled) setCommunityPosts(defaults)
      })
      .finally(() => {
        if (!cancelled) setPostsLoading(false)
      })

    return () => { cancelled = true }
  }, [community, resolvedSlug])

  useEffect(() => {
    let cancelled = false
    const defaults = DISCUSSION_TOPICS[resolvedSlug] ?? []

    if (!community) {
      Promise.resolve().then(() => {
        if (!cancelled) setDiscussionTopics(defaults)
      })
      return () => { cancelled = true }
    }

    fetch(`/api/communities/${community.id}/discussions`)
      .then((res) => res.ok ? res.json() : { discussions: [] })
      .then((data: { discussions?: ApiCommunityDiscussion[] }) => {
        if (cancelled) return
        const apiDiscussions = (data.discussions ?? []).map(apiDiscussionToTopic)
        setDiscussionTopics(apiDiscussions.length > 0 ? apiDiscussions : defaults)
      })
      .catch(() => {
        if (!cancelled) setDiscussionTopics(defaults)
      })

    return () => { cancelled = true }
  }, [community, resolvedSlug])

  async function handleJoinCommunity() {
    if (!community) {
      router.push('/communities')
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
    } finally {
      setJoiningCommunity(false)
    }
  }

  async function handleCreatePost() {
    const content = postDraft.trim()
    if (!content || !communityJoined) return

    if (!community) {
      setPostError('This community is not connected to the database yet.')
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
      setCommunityPosts((prev) => [apiPostToCommunityPost(data.post), ...prev.filter((post) => !DEFAULT_COMMUNITY_POSTS[resolvedSlug]?.some((defaultPost) => defaultPost.id === post.id))])
      setPostDraft('')
    } catch {
      setPostError('Your post could not be published yet.')
    } finally {
      setPosting(false)
    }
  }

  function isFallbackCommunityPost(postId: string) {
    return (DEFAULT_COMMUNITY_POSTS[resolvedSlug] ?? []).some((post) => post.id === postId)
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

    if (!community || isFallbackCommunityPost(post.id)) {
      updateCommunityPost(post.id, (current) => {
        const likedByMe = !current.likedByMe
        return {
          ...current,
          likedByMe,
          likes: Math.max(0, current.likes + (likedByMe ? 1 : -1)),
        }
      })
      return
    }

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

    if (!community || isFallbackCommunityPost(post.id)) {
      const reply: CommunityReply = {
        id: `local-reply-${post.id}-${Date.now()}`,
        authorName: 'You',
        content,
        createdAt: new Date().toISOString(),
      }
      updateCommunityPost(post.id, (current) => ({
        ...current,
        replies: current.replies + 1,
        replyItems: [...current.replyItems, reply],
      }))
      setReplyDrafts((prev) => ({ ...prev, [post.id]: '' }))
      setExpandedReplies((prev) => ({ ...prev, [post.id]: true }))
      return
    }

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

    if (!community || isFallbackCommunityPost(post.id) || post.replyItems.length >= post.replies) return

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

    const key = getDiscussionKey(resolvedSlug, selectedTopic.title)
    const currentReplies = discussionReplyOverrides[key] ?? selectedTopic.replyItems ?? getDiscussionReplies(resolvedSlug, selectedTopic)

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

    const reply: DiscussionReply = {
      id: `discussion-reply-${Date.now()}`,
      authorName: 'You',
      content,
      createdAt: new Date().toISOString(),
    }
    setDiscussionReplyOverrides((prev) => ({ ...prev, [key]: [...currentReplies, reply] }))
    setSelectedTopic((current) => current ? { ...current, replies: current.replies + 1 } : current)
    setDiscussionReplyDraft('')
  }

  const memberPlanets = galaxy.activePlanetIds
    .map((id) => getPlanetById(id))
    .filter((p): p is PlanetProfile => !!p)

  const relatedGalaxies = getRelatedGalaxies(galaxy.keywords, resolvedSlug)
  const relatedPreviews = getGalaxyPreviews().filter((g) =>
    relatedGalaxies.some((r) => r.id === g.id)
  )

  const discussions = discussionTopics.length > 0 ? discussionTopics : (DISCUSSION_TOPICS[resolvedSlug] ?? [])
  const { accentColor } = galaxy
  const selectedDiscussionReplies = selectedTopic
    ? discussionReplyOverrides[getDiscussionKey(resolvedSlug, selectedTopic.title)] ?? selectedTopic.replyItems ?? getDiscussionReplies(resolvedSlug, selectedTopic)
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
              className="absolute -right-8 -top-8 pointer-events-none select-none leading-none"
              style={{ fontSize: 200, color: accentColor, opacity: 0.05 }}
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
            <div className="relative z-10 px-6 pt-8 pb-10 max-w-5xl mx-auto flex items-start gap-5">
              {/* Symbol orb */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl shrink-0 mt-1"
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
                <p className="text-eyebrow mb-2">Galaxy</p>
                <h1
                  className="text-2xl font-semibold leading-tight mb-2"
                  style={{ color: 'var(--foreground)' }}
                >
                  {galaxy.name}
                </h1>
                {galaxy.tagline && (
                  <p
                    className="text-base italic mb-4 leading-relaxed"
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
                    {galaxy.memberCount.toLocaleString()} planets
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
              <div className="shrink-0 mt-1">
                {communityJoined ? (
                  <span
                    className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide inline-flex"
                    style={{
                      color:      accentColor,
                      background: `${accentColor}16`,
                      border:     `1px solid ${accentColor}35`,
                    }}
                  >
                    Joined
                  </span>
                ) : userRole === 'resonator' ? (
                  <button
                    type="button"
                    className="px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide transition-all duration-200"
                    style={{
                      color:      'var(--foreground)',
                      background: `linear-gradient(135deg, ${accentColor}35, ${accentColor}20)`,
                      border:     `1px solid ${accentColor}45`,
                      cursor:     'pointer',
                    }}
                    onClick={handleJoinCommunity}
                    disabled={joiningCommunity}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${accentColor}30` }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
                  >
                    {joiningCommunity ? 'Joining...' : 'Join galaxy'}
                  </button>
                ) : (
                  <Link
                    href="/create-planet"
                    className="block px-5 py-2.5 rounded-xl text-sm font-medium tracking-wide"
                    style={{
                      color:      'var(--ghost)',
                      background: 'var(--surface)',
                      border:     '1px solid var(--border-soft)',
                      textDecoration: 'none',
                    }}
                  >
                    Create planet to join
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* -- Main content ----------------------------------------------- */}
          <div className="px-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 mt-4">

              {/* -- Left column -------------------------------------------- */}
              <div className="flex flex-col gap-8">

                {/* About + keywords */}
                <section>
                  <p className="text-data-label mb-3">About this galaxy</p>
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
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-data-label">Active planets</p>
                    <span className="text-xs" style={{ color: 'var(--ghost)' }}>
                      {memberPlanets.length} shown of {galaxy.memberCount.toLocaleString()}
                    </span>
                  </div>

                  {memberPlanets.length > 0 ? (
                    <div
                      className="rounded-2xl p-6"
                      style={{
                        background: 'var(--surface)',
                        border:     '1px solid var(--border-soft)',
                      }}
                    >
                      <div className="flex flex-wrap gap-8 justify-around">
                        {memberPlanets.map((planet) => (
                          <PlanetCard
                            key={planet.id}
                            planet={planet}
                            size={52}
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
                      <p className="text-sm" style={{ color: 'var(--ghost)' }}>No active planets yet.</p>
                    </div>
                  )}
                </section>

                {/* Discussions */}
                {discussions.length > 0 && (
                  <section>
                    <p className="text-data-label mb-4">Recent discussions</p>

                    {userRole === 'resonator' ? (
                      <div className="flex flex-col gap-2">
                        {discussions.map((topic, i) => (
                          <button
                            key={i}
                            type="button"
                            className="w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200"
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
                              <p className="text-sm leading-snug mb-1" style={{ color: 'var(--foreground)' }}>
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
                        ctaHref="/create-planet"
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
                                <p className="text-xs" style={{ color: 'var(--ghost)' }}>{topic.replies} replies</p>
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
                    <p className="text-data-label">Community posts</p>
                    <span className="text-xs" style={{ color: 'var(--ghost)' }}>
                      {communityPosts.length} post{communityPosts.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {communityJoined ? (
                      <div
                        className="rounded-2xl p-4 flex flex-col gap-3"
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
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs" style={{ color: 'var(--ghost)', opacity: 0.65 }}>
                            Visible in this community on this browser.
                          </span>
                          <button
                            type="button"
                            onClick={handleCreatePost}
                            disabled={!postDraft.trim() || posting}
                            className="px-4 py-2 rounded-xl text-xs font-medium"
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
                        {postError && (
                          <p className="text-xs" style={{ color: '#fca5a5' }}>
                            {postError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div
                        className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
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
                          disabled={joiningCommunity}
                          className="px-4 py-2 rounded-xl text-xs font-medium shrink-0"
                          style={{ color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}32`, cursor: 'pointer' }}
                        >
                          {joiningCommunity ? 'Joining...' : 'Join to post'}
                        </button>
                      </div>
                    )}

                    {postsLoading ? (
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
                            className="rounded-2xl p-4 flex flex-col gap-3"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}
                          >
                            <div className="flex items-center justify-between gap-3">
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
                            <div className="flex items-center gap-2 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleToggleLike(post)}
                                disabled={likingPostId === post.id}
                                className="px-2 py-1 rounded-lg transition-all duration-200"
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
                                className="px-2 py-1 rounded-lg transition-all duration-200"
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
                                        <div className="flex items-center justify-between gap-3">
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
                                      className="w-full resize-none rounded-xl px-3 py-2 text-xs outline-none"
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
                                        className="px-3 py-1.5 rounded-lg text-[10px] font-medium"
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
              <div className="flex flex-col gap-6">

                {/* Related galaxies */}
                {relatedPreviews.length > 0 && (
                  <section>
                    <p className="text-data-label mb-3">Related galaxies</p>
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
                              {g.memberCount.toLocaleString()} planets
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
                  <p className="text-data-label mb-4">Galaxy stats</p>
                  <div className="flex flex-col gap-3">
                    {[
                      { label: 'Members', value: galaxy.memberCount.toLocaleString() },
                      { label: 'Atmosphere', value: galaxy.mood },
                      { label: 'Status', value: galaxy.maturity },
                      { label: 'Keywords', value: galaxy.keywords.length.toString() },
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
                  ← All galaxies
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
            className="fixed z-50 left-1/2 top-1/2 w-[min(92vw,620px)] max-h-[86vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(160deg, rgba(18,14,52,0.98) 0%, rgba(6,4,20,0.99) 100%)',
              border: `1px solid ${accentColor}35`,
              boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 48px ${accentColor}16`,
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: accentColor, opacity: 0.75 }}>
                  Galaxy discussion
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--ghost)' }}>
                  {selectedTopic.replies} replies
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ghost)', cursor: 'pointer' }}
                aria-label="Close discussion preview"
              >
                ×
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-start gap-4">
                <div
                  className="w-1 rounded-full shrink-0 mt-1"
                  style={{ height: 54, background: `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}40 100%)`, opacity: selectedTopic.heat }}
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-lg font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
                    {selectedTopic.title}
                  </h2>
                  <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--ink)', opacity: 0.72 }}>
                    All visible replies from {galaxy.name}. You can read the thread here and add your own signal below.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: accentColor, opacity: 0.8 }}>
                    Recent replies
                  </p>
                  <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>
                    Showing all {selectedDiscussionReplies.length}
                  </span>
                </div>

                {selectedDiscussionReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
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
                        Reply
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
                    placeholder="Add your reply to this discussion..."
                    className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
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
                      className="px-4 py-2 rounded-xl text-xs font-medium"
                      style={{
                        color: 'var(--foreground)',
                        background: `${accentColor}24`,
                        border: `1px solid ${accentColor}40`,
                        cursor: discussionReplyDraft.trim() && !postingDiscussionReply ? 'pointer' : 'default',
                        opacity: discussionReplyDraft.trim() && !postingDiscussionReply ? 1 : 0.55,
                      }}
                    >
                      {postingDiscussionReply ? 'Saving...' : 'Send reply'}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <p className="text-xs" style={{ color: 'var(--ghost)' }}>
                    Join this galaxy to reply to discussions.
                  </p>
                  <button
                    type="button"
                    onClick={handleJoinCommunity}
                    disabled={joiningCommunity}
                    className="px-4 py-2 rounded-xl text-xs font-medium"
                    style={{ color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}32`, cursor: 'pointer' }}
                  >
                    {joiningCommunity ? 'Joining...' : 'Join to reply'}
                  </button>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="rounded-xl px-4 py-2 text-xs font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ink)', cursor: 'pointer' }}
                >
                  Close thread
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
      />
    </>
  )
}
