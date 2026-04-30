'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { resolvePlanetTexture } from '@/lib/planet-textures'
import type { PlanetProfile } from '@/types/planet'

interface MatchEntry {
  planet: PlanetProfile
  score: number
  traits: string[]
}

interface Props {
  matches: MatchEntry[]
  className?: string
}

/**
 * ResonantMatchesCarousel — horizontal scrollable row of resonant planet cards.
 * Matches the "Resonant Matches" section from the mockup with avatar, name,
 * personality traits, and compatibility percentage.
 */
export default function ResonantMatchesCarousel({ matches, className = '' }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(0)
  const perPage = 6
  const totalPages = Math.ceil(matches.length / perPage)

  function scroll(dir: -1 | 1) {
    if (!scrollRef.current) return
    const next = Math.max(0, Math.min(page + dir, totalPages - 1))
    setPage(next)
    const cardW = 150 + 12 // card width + gap
    scrollRef.current.scrollTo({ left: next * perPage * cardW, behavior: 'smooth' })
  }

  const startIdx = page * perPage + 1
  const endIdx = Math.min((page + 1) * perPage, matches.length)

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            Resonant Matches
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--ghost)' }}>
            {matches.length} matches total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] tabular-nums" style={{ color: 'var(--ghost)' }}>
            {startIdx}–{endIdx} of {matches.length}
          </span>
          <button
            onClick={() => scroll(-1)}
            disabled={page === 0}
            className="w-6 h-6 flex items-center justify-center rounded-md text-xs disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ‹
          </button>
          <button
            onClick={() => scroll(1)}
            disabled={page >= totalPages - 1}
            className="w-6 h-6 flex items-center justify-center rounded-md text-xs disabled:opacity-30"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--ink)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {matches.map(({ planet, score, traits }) => {
          const color = planet.visual?.coreColor ?? '#a78bfa'
          return (
            <Link
              key={planet.id}
              href={`/planet/${planet.id}`}
              className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl"
              style={{
                width: 150,
                scrollSnapAlign: 'start',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${color}44`
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
              }}
            >
              {/* Avatar */}
              <PlanetAvatar
                textureFile={resolvePlanetTexture(planet)}
                size={56}
                glowColor={color}
              />

              {/* Name + symbol */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)', maxWidth: 100 }}>
                  {planet.name}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>{planet.avatarSymbol}</span>
              </div>

              {/* Traits */}
              <div className="text-center">
                {traits.slice(0, 2).map((trait) => (
                  <p key={trait} className="text-[10px] leading-tight" style={{ color: 'var(--ghost)' }}>
                    · {trait}
                  </p>
                ))}
              </div>

              {/* Compatibility bar */}
              <div className="w-full mt-auto">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(score, 100)}%`, background: color }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
                    {score}%
                  </span>
                </div>
                <p className="text-[9px] mt-0.5" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
                  compatible
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Dots */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => {
                setPage(i)
                if (scrollRef.current) {
                  const cardW = 150 + 12
                  scrollRef.current.scrollTo({ left: i * perPage * cardW, behavior: 'smooth' })
                }
              }}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{
                background: i === page ? 'var(--star)' : 'rgba(255,255,255,0.15)',
                boxShadow: i === page ? '0 0 4px var(--star)' : 'none',
              }}
              aria-label={`Page ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
