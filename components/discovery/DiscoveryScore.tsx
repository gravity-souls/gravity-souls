'use client'
import { useTranslations } from 'next-intl'
export default function DiscoveryScore({ recommendation }: { recommendation?: { score?: number; exploration?: boolean } | null }) {
  const t = useTranslations('discoveryPreferences')
  if (!recommendation) return null
  return <div className="my-2 space-y-1 text-xs text-violet-200">{recommendation.score !== undefined && <p>{t('discoveryScore', { score: recommendation.score })}</p>}{recommendation.exploration && <p>{t('exploration')}</p>}</div>
}
