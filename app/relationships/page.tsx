'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import GlowButton from '@/components/ui/GlowButton'
import RelationshipCard from '@/components/social/RelationshipCard'
import RelationshipStateBadge from '@/components/social/RelationshipStateBadge'
import type { Relationship, RelationshipStatus } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import { mockRelationships } from '@/lib/mock-relationships'
import { getPlanetById } from '@/lib/mock-planets'

// --- Status display order -----------------------------------------------------

const STATUS_ORDER: RelationshipStatus[] = ['aligned', 'resonant', 'orbit', 'signal']

// --- Group section ------------------------------------------------------------

function RelationshipGroup({
  status,
  items,
}: {
  status: RelationshipStatus
  items: { rel: Relationship; planet: PlanetProfile }[]
}) {
  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <RelationshipStateBadge status={status} />
        <div className="flex-1 h-px" style={{ background: 'rgba(167,139,250,0.08)' }} />
        <span className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
          {items.length}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {items.map(({ rel, planet }) => (
          <RelationshipCard key={rel.id} relationship={rel} planet={planet} />
        ))}
      </div>
    </section>
  )
}

// --- RelationshipsPage --------------------------------------------------------

export default function RelationshipsPage() {
  const t = useTranslations('relationshipsPage')
  const tCommon = useTranslations('common')
  const [hasPlanet, setHasPlanet] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/my-planet').then(res => {
      if (!cancelled) setHasPlanet(res.ok)
    }).catch(() => {
      if (!cancelled) setHasPlanet(false)
    })
    return () => { cancelled = true }
  }, [])

  if (hasPlanet === null) return null

  const MY_PLANET_ID = 'p-aelion'

  const grouped = STATUS_ORDER.map((status) => {
    const items = mockRelationships
      .filter((rel) => rel.status === status)
      .map((rel) => {
        const otherId = rel.planetAId === MY_PLANET_ID ? rel.planetBId : rel.planetAId
        const planet  = getPlanetById(otherId)
        return planet ? { rel, planet } : null
      })
      .filter((x): x is { rel: Relationship; planet: PlanetProfile } => x !== null)
    return { status, items }
  })

  const hasAny = grouped.some((g) => g.items.length > 0)

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
            {grouped.map(({ status, items }) => (
              <RelationshipGroup key={status} status={status} items={items} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
