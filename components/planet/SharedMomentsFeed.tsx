'use client'

import PlanetAvatar from '@/components/planet/PlanetAvatar'

export interface SharedMoment {
  id: string
  authorName: string
  avatarTexture: string
  avatarGlow: string
  /** Relative time string, e.g. "2h ago" */
  timeAgo: string
  content: string
  hashtags?: string[]
  likes: number
  replies: number
}

interface Props {
  moments: SharedMoment[]
  className?: string
}

/**
 * SharedMomentsFeed — social feed section matching the mockup's "Shared Moments".
 * Shows planet avatar, name, timestamp, text content, hashtags, and engagement counts.
 */
export default function SharedMomentsFeed({ moments, className = '' }: Props) {
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
          Shared Moments
        </h3>
        <button
          className="text-[10px] font-medium px-3 py-1.5 rounded-md"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--ink)',
            cursor: 'pointer',
          }}
        >
          View all posts
        </button>
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {moments.map((m) => (
          <div
            key={m.id}
            className="flex flex-col gap-3 p-4 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Author row */}
            <div className="flex items-center gap-2.5">
              <PlanetAvatar
                textureFile={m.avatarTexture}
                size={32}
                glowColor={m.avatarGlow}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                  {m.authorName}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>
                  {m.timeAgo}
                </span>
              </div>
            </div>

            {/* Content */}
            <p className="text-xs leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.85 }}>
              {m.content}
            </p>

            {/* Hashtags */}
            {m.hashtags && m.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {m.hashtags.map((tag) => (
                  <span key={tag} className="text-[10px] font-medium" style={{ color: 'var(--star)' }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Engagement */}
            <div className="flex items-center gap-4 pt-1">
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--ghost)' }}>
                <span style={{ opacity: 0.6 }}>♡</span> {m.likes}
              </span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--ghost)' }}>
                <span style={{ opacity: 0.6 }}>◌</span> {m.replies}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
