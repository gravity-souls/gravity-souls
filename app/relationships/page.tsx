'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import GlowButton from '@/components/ui/GlowButton'
import RelationshipCard from '@/components/social/RelationshipCard'
import RelationshipStateBadge from '@/components/social/RelationshipStateBadge'

interface PlanetSummary {
  id: string
  name: string
  avatarSymbol: string
  tagline: string | null
  visual: unknown
}

interface FollowRow {
  userId: string
  since: string
  planet: PlanetSummary | null
}

interface FollowsResponse {
  following: FollowRow[]
  followers: FollowRow[]
}

export default function RelationshipsPage() {
  const t = useTranslations('relationshipsPage')
  const tCommon = useTranslations('common')
  const [hasPlanet, setHasPlanet] = useState<boolean | null>(null)
  const [data, setData] = useState<FollowsResponse | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/follows')
      .then((res) => (res.ok ? res.json() : null))
      .then((json: FollowsResponse | null) => setData(json))
      .catch(() => setData(null))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch('/api/my-planet').then(res => {
      if (!cancelled) setHasPlanet(res.ok)
    }).catch(() => {
      if (!cancelled) setHasPlanet(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (hasPlanet) load()
  }, [hasPlanet, load])

  async function unfollow(userId: string) {
    setBusyUserId(userId)
    try {
      await fetch(`/api/follows/${encodeURIComponent(userId)}`, { method: 'DELETE' })
      load()
    } finally {
      setBusyUserId(null)
    }
  }

  async function followBack(userId: string) {
    setBusyUserId(userId)
    try {
      await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      load()
    } finally {
      setBusyUserId(null)
    }
  }

  if (hasPlanet === null) return null

  const followingIds = new Set((data?.following ?? []).map((f) => f.userId))
  const mutual = (data?.following ?? []).filter((f) => (data?.followers ?? []).some((g) => g.userId === f.userId))
  const followingOnly = (data?.following ?? []).filter((f) => !(data?.followers ?? []).some((g) => g.userId === f.userId))
  const followersOnly = (data?.followers ?? []).filter((f) => !followingIds.has(f.userId))

  const hasAny = mutual.length + followingOnly.length + followersOnly.length > 0

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-2xl mx-auto">
        <SectionHeader
          eyebrow={t('eyebrow')}
          level={1}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        {hasPlanet === false && (
          <EmptyState
            symbol="◌"
            title={t('requiresPlanetTitle')}
            subtitle={t('requiresPlanetSubtitle')}
            action={<GlowButton href="/onboarding" variant="primary">{t('awakenPlanet')}</GlowButton>}
            className="mt-8"
          />
        )}

        {hasPlanet === true && !hasAny && (
          <EmptyState
            symbol="◍"
            title={t('emptyTitle')}
            subtitle={t('emptySubtitle')}
            action={<GlowButton href="/stream" variant="secondary">{tCommon('exploreStream')}</GlowButton>}
            className="mt-8"
          />
        )}

        {hasPlanet === true && hasAny && (
          <div className="mt-8 flex flex-col gap-8">
            {mutual.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <RelationshipStateBadge status="mutual" />
                  <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.08)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.4 }}>{mutual.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {mutual.map((f) => f.planet && (
                    <RelationshipCard key={f.userId} status="mutual" since={f.since} planet={f.planet} onUnfollow={() => unfollow(f.userId)} busy={busyUserId === f.userId} />
                  ))}
                </div>
              </section>
            )}

            {followingOnly.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <RelationshipStateBadge status="following" />
                  <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.08)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.4 }}>{followingOnly.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {followingOnly.map((f) => f.planet && (
                    <RelationshipCard key={f.userId} status="following" since={f.since} planet={f.planet} onUnfollow={() => unfollow(f.userId)} busy={busyUserId === f.userId} />
                  ))}
                </div>
              </section>
            )}

            {followersOnly.length > 0 && (
              <section className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <RelationshipStateBadge status="follows-you" />
                  <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.08)' }} />
                  <span className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.4 }}>{followersOnly.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {followersOnly.map((f) => f.planet && (
                    <RelationshipCard key={f.userId} status="follows-you" since={f.since} planet={f.planet} onFollowBack={() => followBack(f.userId)} busy={busyUserId === f.userId} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
