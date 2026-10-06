'use client'

/* eslint-disable @next/next/no-img-element */

import PostContextCard from '@/components/stream/PostContextCard'
import { Heart } from 'lucide-react'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { LEVEL_NAMES, clampLevel } from '@/lib/xp'
import type { StreamPost } from '@/types/stream'

interface PostCardProps {
  post: StreamPost
  compact?: boolean
  onOpen?: (post: StreamPost) => void
  origin?: string
}

function firstLine(content: string) {
  return content.split('\n').find((line) => line.trim())?.trim() ?? content
}

export default function PostCard({ post, compact = false, onOpen, origin }: PostCardProps) {
  const firstMedia = post.mediaUrls[0]
  const firstMediaType = post.mediaTypes[0]
  const accent = post.author.tintColor || '#a78bfa'
  const safeLevel = clampLevel(post.author.userLevel)

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(post)}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) onOpen?.(post)
      }}
      className="group mb-3 inline-block w-full cursor-pointer overflow-hidden rounded-2xl transition-all duration-200 hover:scale-[1.02]"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${accent}22`, boxShadow: '0 10px 34px rgba(0,0,0,0.28)' }}
    >
      <div className="relative overflow-hidden">
        {firstMedia && firstMediaType === 'image' && (
          <img src={firstMedia} alt="" className="block h-auto w-full" loading="lazy" />
        )}
        {firstMedia && firstMediaType === 'video' && (
          <video src={firstMedia} className="block h-auto w-full" muted loop playsInline autoPlay={!compact} controls={false} />
        )}
        {!firstMedia && (
          <div className={`flex ${compact ? 'min-h-32 p-4' : 'min-h-40 p-5'} items-center`} style={{ background: `radial-gradient(ellipse at top left, ${accent}16, transparent 80%)` }}>
            <p className={`${compact ? 'text-sm' : 'text-base'} line-clamp-6 whitespace-pre-wrap break-words font-normal leading-7`} style={{ color: 'var(--foreground)' }}>
              {post.content}
            </p>
          </div>
        )}
        {firstMedia && (
          <div className="absolute inset-x-0 bottom-0 p-3" style={{ background: 'linear-gradient(180deg, transparent, rgba(3,3,15,0.86))' }}>
            <p className="line-clamp-2 break-words text-sm font-normal leading-relaxed" style={{ color: 'var(--foreground)' }}>{firstLine(post.content)}</p>
          </div>
        )}
      </div>

      <PostContextCard post={post} origin={origin} />
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <PlanetAvatar planetConfig={post.author.planetConfig ?? undefined} size={28} glowColor={accent} />
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium" style={{ color: 'var(--ink)' }}>{post.author.name}</span>
            <span className="block truncate text-[10px] leading-tight" style={{ color: 'var(--ghost)' }}>{safeLevel} {LEVEL_NAMES[safeLevel]}</span>
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs" style={{ color: post.userHasLiked ? '#fb7185' : 'var(--ghost)' }}>
          <Heart size={14} fill={post.userHasLiked ? 'currentColor' : 'none'} />
          {post.likeCount}
        </span>
      </div>
    </article>
  )
}