'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import type { GalaxyPreview } from '@/types/galaxy'

// Cover images mapped by galaxy slug (fallback to gradient)
const COVER_IMAGES: Record<string, string> = {
  'slow-thinkers':   '/covers/stargazers.jpg',
  'signal-noise':    '/covers/hiking.jpg',
  'dusk-archives':   '/covers/calm.jpg',
  'warm-frequency':  '/covers/stargazers.jpg',
  'image-makers':    '/covers/hiking.jpg',
  'threshold-states':'/covers/calm.jpg',
  'body-clocks':     '/covers/hiking.jpg',
  'late-night-econ': '/covers/stargazers.jpg',
}

interface Props {
  galaxies: GalaxyPreview[]
  className?: string
}

/**
 * RecommendedCommunities — horizontal scrollable row of community cards.
 * Each card has a real cover image with dark overlay, text overlay, and join button.
 */
export default function RecommendedCommunities({ galaxies, className = '' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())

  function scroll(dir: -1 | 1) {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
            Recommended Communities
          </h3>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--ghost)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {galaxies.length} communities
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll(-1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ‹
          </button>
          <button
            onClick={() => scroll(1)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {galaxies.map((g) => {
          const joined = joinedIds.has(g.id)
          const coverUrl = COVER_IMAGES[g.slug]

          return (
            <div
              key={g.id}
              className="group shrink-0 relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300"
              style={{
                width: 240,
                scrollSnapAlign: 'start',
                background: 'linear-gradient(180deg, #0B0F1A 0%, #111827 100%)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${g.accentColor ?? '#a78bfa'}18`
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.4)'
                ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
              }}
            >
              {/* Image banner */}
              <div className="relative h-28 w-full overflow-hidden">
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{
                      background: `linear-gradient(135deg, ${g.accentColor ?? '#a78bfa'}44 0%, #0B0F1A 100%)`,
                    }}
                  />
                )}

                {/* Dark overlay (40% opacity) + slight backdrop blur */}
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'rgba(0,0,0,0.40)',
                    backdropFilter: 'blur(1px)',
                  }}
                />

                {/* Text over image */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h4 className="text-sm font-semibold leading-tight" style={{ color: '#fff' }}>
                    {g.name}
                  </h4>
                  {g.tagline && (
                    <p className="text-[10px] mt-0.5 leading-snug line-clamp-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      {g.tagline}
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {g.memberCount >= 1000 ? `${(g.memberCount / 1000).toFixed(1)}K` : g.memberCount} members
                </span>
                <button
                  onClick={() => setJoinedIds((prev) => { const next = new Set(prev); next.add(g.id); return next })}
                  disabled={joined}
                  className="text-[10px] font-semibold px-4 py-1.5 rounded-lg transition-all duration-200"
                  style={{
                    background: joined
                      ? 'rgba(52,211,153,0.15)'
                      : 'linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(79,70,229,0.25) 100%)',
                    border: `1px solid ${joined ? 'rgba(52,211,153,0.3)' : 'rgba(124,58,237,0.3)'}`,
                    color: joined ? '#34d399' : '#c4b5fd',
                    cursor: joined ? 'default' : 'pointer',
                    boxShadow: joined ? 'none' : '0 0 8px rgba(124,58,237,0.15)',
                  }}
                >
                  {joined ? 'Joined' : 'Join'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
