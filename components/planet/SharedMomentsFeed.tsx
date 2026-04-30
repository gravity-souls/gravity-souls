'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { SharedPost } from '@/lib/mock-posts'

export type SharedMoment = SharedPost

interface Props {
  moments: SharedMoment[]
  className?: string
}

/**
 * SharedMomentsFeed — social feed section matching the mockup's "Shared Moments".
 * Shows planet avatar, name, timestamp, text content, hashtags, and engagement counts.
 */
export default function SharedMomentsFeed({ moments, className = '' }: Props) {
  const [selectedMoment, setSelectedMoment] = useState<SharedMoment | null>(null)

  useEffect(() => {
    if (!selectedMoment) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedMoment(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selectedMoment])

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
          Shared Moments
        </h3>
        <Link
          href="/posts"
          className="text-[10px] font-medium px-3 py-1.5 rounded-md"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--ink)',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          View all posts
        </Link>
      </div>

      {/* Posts grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {moments.map((m) => (
          <button
            type="button"
            key={m.id}
            onClick={() => setSelectedMoment(m)}
            className="flex flex-col gap-3 p-4 rounded-xl text-left transition-all duration-200 hover:-translate-y-px hover:border-white/12"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
            }}
            aria-label={`Open shared moment from ${m.authorName}`}
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
          </button>
        ))}
      </div>

      {selectedMoment && (
        <>
          <div
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedMoment(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Shared moment from ${selectedMoment.authorName}`}
            className="fixed z-50 left-1/2 top-1/2 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, rgba(18,14,52,0.98) 0%, rgba(6,4,20,0.99) 100%)',
              border: `1px solid ${selectedMoment.avatarGlow}35`,
              boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 48px ${selectedMoment.avatarGlow}16`,
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <PlanetAvatar
                  textureFile={selectedMoment.avatarTexture}
                  size={38}
                  glowColor={selectedMoment.avatarGlow}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {selectedMoment.authorName}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--ghost)' }}>
                    {selectedMoment.timeAgo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMoment(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ghost)', cursor: 'pointer' }}
                aria-label="Close shared moment"
              >
                ×
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                {selectedMoment.content}
              </p>

              {selectedMoment.hashtags && selectedMoment.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMoment.hashtags.map((tag) => (
                    <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: `${selectedMoment.avatarGlow}14`, border: `1px solid ${selectedMoment.avatarGlow}28`, color: selectedMoment.avatarGlow }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--ghost)' }}>
                <span>{selectedMoment.likes} likes</span>
                <span>{selectedMoment.replies} replies</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Link
                  href={`/planet/${selectedMoment.planetId}`}
                  className="flex-1 text-center rounded-xl px-4 py-2.5 text-sm font-medium"
                  style={{ background: `${selectedMoment.avatarGlow}24`, border: `1px solid ${selectedMoment.avatarGlow}40`, color: 'var(--foreground)', textDecoration: 'none' }}
                >
                  View planet
                </Link>
                <Link
                  href={`/posts/${selectedMoment.id}`}
                  className="flex-1 text-center rounded-xl px-4 py-2.5 text-sm font-medium"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ink)', textDecoration: 'none' }}
                >
                  Open post
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
