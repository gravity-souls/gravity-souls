'use client'
import { useTranslations } from 'next-intl'
import type { OrbitMatch } from '@/types/match'
export default function PreferenceMatchNote({ match }: { match: Pick<OrbitMatch, 'preferenceFit' | 'exploration'> }) {
  const t = useTranslations('discoveryPreferences')
  return <div className="my-3 space-y-2 text-xs text-violet-200">{match.preferenceFit && <p>{t('fit', { score: match.preferenceFit.score, weight: Math.ceil(match.preferenceFit.coverage * 15) })}</p>}{match.exploration && <p>{t('exploration')}</p>}</div>
}
