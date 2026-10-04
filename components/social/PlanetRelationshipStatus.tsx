'use client'

import { useTranslations } from 'next-intl'
import type { StarMapRelationship } from '@/types/star-map'

export default function PlanetRelationshipStatus({ relationship }: { relationship?: StarMapRelationship }) {
  const t = useTranslations('starMap')
  if (!relationship) return null
  const labels: string[] = []
  if (relationship.saved) labels.push(t('savedStatus'))
  if (relationship.following && relationship.followedBy) labels.push(t('mutualStatus'))
  else if (relationship.following) labels.push(t('followingStatus'))
  else if (relationship.followedBy) labels.push(t('followsYouStatus'))
  if (relationship.conversationId) labels.push(t('conversationStatus'))
  if (!labels.length) return null
  return <span role="group" aria-label={t('relationshipStatus')} className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-violet-200/75">
    {labels.map(label => <span key={label}>{label}</span>)}
  </span>
}
