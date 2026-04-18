'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import GlowButton from '@/components/ui/GlowButton'

interface CommunityWithJoined {
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
  joined: boolean
}

export default function CommunitiesPage() {
  const [communities, setCommunities] = useState<CommunityWithJoined[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/communities')
        if (!res.ok) {
          setError('Failed to load communities')
          return
        }
        setCommunities(await res.json())
      } catch {
        setError('Failed to load communities')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleJoin(communityId: string) {
    setJoining(communityId)
    try {
      const res = await fetch('/api/communities/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId }),
      })
      if (res.ok) {
        setCommunities((prev) =>
          prev.map((c) => (c.id === communityId ? { ...c, joined: true } : c)),
        )
      }
    } catch {
      // silent fail
    } finally {
      setJoining(null)
    }
  }

  return (
    <AppShell>
      <LightCone origin="top-center" color="rgba(99,102,241,1)" opacity={0.08} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-20 max-w-4xl mx-auto">
        <p
          className="text-[10px] uppercase tracking-[0.3em] mb-2"
          style={{ color: 'var(--star)', opacity: 0.55 }}
        >
          Communities
        </p>
        <h1
          className="text-2xl sm:text-3xl font-bold mb-2"
          style={{ color: 'var(--foreground)' }}
        >
          Find your galaxies
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--ghost)' }}>
          Join communities that resonate with your frequency.
        </p>

        {loading && (
          <p className="text-sm" style={{ color: 'var(--ghost)' }}>Loading communities...</p>
        )}

        {error && (
          <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
        )}

        {!loading && !error && communities.length === 0 && (
          <p className="text-sm" style={{ color: 'var(--ghost)' }}>No communities yet.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {communities.map((c) => (
            <div
              key={c.id}
              className="flex flex-col gap-3 p-5 rounded-2xl transition-all"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${c.joined ? c.accentColor + '44' : 'var(--border-soft)'}`,
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.symbol}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {c.name}
                  </h3>
                  {c.tagline && (
                    <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>{c.tagline}</p>
                  )}
                </div>
              </div>

              {c.description && (
                <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--ink)', opacity: 0.7 }}>
                  {c.description}
                </p>
              )}

              {c.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.keywords.slice(0, 4).map((kw) => (
                    <span
                      key={kw}
                      className="text-[10px] px-2 py-0.5 rounded-md"
                      style={{
                        background: `${c.accentColor}10`,
                        border: `1px solid ${c.accentColor}22`,
                        color: c.accentColor,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-1">
                <span
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: 'var(--ghost)', opacity: 0.5 }}
                >
                  {c.maturity}
                </span>

                {c.joined ? (
                  <span
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{
                      background: `${c.accentColor}15`,
                      color: c.accentColor,
                      border: `1px solid ${c.accentColor}30`,
                    }}
                  >
                    Joined
                  </span>
                ) : (
                  <GlowButton
                    onClick={() => handleJoin(c.id)}
                    variant="secondary"
                    disabled={joining === c.id}
                    className="text-xs px-4 py-1.5"
                  >
                    {joining === c.id ? 'Joining...' : 'Join'}
                  </GlowButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
