'use client'

import { useState } from 'react'
import HorizontalCarousel from '@/components/ui/HorizontalCarousel'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
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
  galaxies: (GalaxyPreview & { joined?: boolean; requestStatus?: string | null; joinPolicy?: string })[]
  className?: string
}

/**
 * RecommendedCommunities — horizontal scrollable row of community cards.
 * Each card has a real cover image with dark overlay, text overlay, and join button.
 */
export default function RecommendedCommunities({ galaxies, className = '' }: Props) {
  const tw = useTranslations('galaxyWorkflow')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const t = useTranslations('myPlanet')
  const tGalaxy = useTranslations('galaxies')
  const tGalaxyPage = useTranslations('galaxyPage')
  const tHome = useTranslations('home')
  const router = useRouter()
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())


  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--foreground)' }}>
            {tHome('recommendedCommunities')}
          </h3>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--ghost)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {t('communityCount', { count: galaxies.length })}
          </span>
        </div>

      </div>

      {joinError && <p role="alert" className="mb-3 text-sm text-red-300">{joinError}</p>}
      <HorizontalCarousel label={tHome('recommendedCommunities')}>
        {galaxies.map((g) => {
          const joined = g.joined || joinedIds.has(g.id)
          const pending = g.requestStatus === 'PENDING' || pendingIds.has(g.id)
          const coverUrl = COVER_IMAGES[g.slug]

          return (
            <div
              key={g.id}
              className="group shrink-0 relative flex flex-col rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
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
              onClick={() => router.push(`/galaxy/${g.slug}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  router.push(`/galaxy/${g.slug}`)
                }
              }}
              role="link"
              tabIndex={0}
            >
              {/* Image banner */}
              <div className="relative h-28 w-full overflow-hidden">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt=""
                    width={240}
                    height={112}
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
                  {tGalaxy('members', { count: g.memberCount })}
                </span>
                <button
                  onClick={async (e) => {
                    e.stopPropagation()
                    if (joiningId) return
                    setJoiningId(g.id)
                    setJoinError(null)
                    try {
                      const response = await fetch('/api/communities/join', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ communityId: g.id }) })
                      if (!response.ok) throw new Error('Join failed')
                      const result = await response.json()
                      if (result.joined) setJoinedIds((prev) => new Set(prev).add(g.id))
                      else setPendingIds(prev => new Set(prev).add(g.id))
                    } catch {
                      setJoinError(tGalaxyPage('joinFailed'))
                    } finally {
                      setJoiningId(null)
                    }
                  }}
                  disabled={joined || pending || joiningId !== null}
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
                  {pending ? tw('pending') : joined ? tGalaxy('joined') : g.joinPolicy === 'APPROVAL' ? tw('requestJoin') : tGalaxy('join')}
                </button>
              </div>
            </div>
          )
        })}
      </HorizontalCarousel>
    </div>
  )
}
