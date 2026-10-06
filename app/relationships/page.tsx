'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { setUserFollowing } from '@/lib/planet-actions'
import { subscribeSocialRefresh } from '@/lib/social-refresh'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import GlowButton from '@/components/ui/GlowButton'
import RelationshipCard from '@/components/social/RelationshipCard'
import RelationshipStateBadge from '@/components/social/RelationshipStateBadge'
import type { PlanetConfig } from '@/types/planet'

interface PlanetSummary {
  id: string
  name: string
  displayName?: string
  avatarSymbol: string
  tagline: string | null
  visual: unknown
  mood: string
  planetConfig?: PlanetConfig | null
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
  const generation = useRef(0)
  const invalidate = useCallback(() => { generation.current++ }, [])
  const ta = useTranslations('planetActions')
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [hasPlanet, setHasPlanet] = useState<boolean | null>(null)
  const [data, setData] = useState<FollowsResponse | null>(null)
  const [failedAction, setFailedAction] = useState<{ userId: string; following: boolean } | null>(null)
  const [busyUserId, setBusyUserId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const current = ++generation.current
    try {
      const response = await fetch('/api/follows', { cache: 'no-store' })
      if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
      const json = await response.json() as FollowsResponse
      if (current === generation.current) { setData({ following: json.following.filter(row => row.planet), followers: json.followers.filter(row => row.planet) }); setError('') }
    } catch (cause) { if (current === generation.current) { setData(null); setError(cause instanceof Error ? cause.message : 'failed') } }
    finally { if (current === generation.current) setLoading(false) }
  }, [])

  const checkRole = useCallback(async () => {
    try {
      const response = await fetch('/api/my-planet', { cache: 'no-store' })
      if (!response.ok && response.status !== 404) throw new Error(response.status === 401 ? 'auth' : 'failed')
      setHasPlanet(response.ok)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'failed'); setLoading(false) }
  }, [])
  useEffect(() => { void checkRole() }, [checkRole])

  useEffect(() => {
    if (!hasPlanet) { if (hasPlanet === false) Promise.resolve().then(() => setLoading(false)); return }
    function refresh() { void load() }
    refresh()
    const unsubscribe = subscribeSocialRefresh(refresh)
    return () => { invalidate(); unsubscribe() }
  }, [hasPlanet, load, invalidate])

  async function changeFollow(userId: string, following: boolean) {
    setBusyUserId(userId); setError(''); setFailedAction(null)
    try { await setUserFollowing(userId, following); await load() }
    catch (cause) { setFailedAction({ userId, following }); setError(cause instanceof Error ? cause.message : 'failed') }
    finally { setBusyUserId(null) }
  }

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

        {error && <p role="alert" className="mt-4 text-sm text-red-300">{ta(error === 'auth' ? 'signInRequired' : failedAction ? 'failed' : 'stateFailed')} <button type="button" className="underline" disabled={!!busyUserId} onClick={() => failedAction ? void changeFollow(failedAction.userId, failedAction.following) : hasPlanet === null ? void checkRole() : void load()}>{ta('retry')}</button></p>}
        {loading && <p role="status" className="mt-4 text-sm text-white/50">{ta('loading')}</p>}

        {hasPlanet === false && (
          <EmptyState
            symbol="◌"
            title={t('requiresPlanetTitle')}
            subtitle={t('requiresPlanetSubtitle')}
            action={<GlowButton href="/onboarding" variant="primary">{t('awakenPlanet')}</GlowButton>}
            className="mt-8"
          />
        )}

        {hasPlanet === true && data && !loading && !hasAny && (
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
                    <RelationshipCard key={f.userId} status="mutual" since={f.since} planet={f.planet} onUnfollow={() => changeFollow(f.userId, false)} busy={busyUserId === f.userId} />
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
                    <RelationshipCard key={f.userId} status="following" since={f.since} planet={f.planet} onUnfollow={() => changeFollow(f.userId, false)} busy={busyUserId === f.userId} />
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
                    <RelationshipCard key={f.userId} status="follows-you" since={f.since} planet={f.planet} onFollowBack={() => changeFollow(f.userId, true)} busy={busyUserId === f.userId} />
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
