'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { explorationReturnHref, type ExplorationOrigin } from '@/lib/exploration-return'

export default function ExplorationReturnLink({ origin }: { origin: ExplorationOrigin | null }) {
  const t = useTranslations('starMap')
  if (!origin) return null
  return <Link href={explorationReturnHref(origin)} className="inline-block px-4 py-2 text-xs text-violet-200">
    {t(origin === 'home-star-map' ? 'returnHomeMap' : origin.startsWith('personal-star-map-') ? 'returnPersonalMap' : 'returnMap')}
  </Link>
}
