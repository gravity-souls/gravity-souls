'use client'

import { useTranslations } from 'next-intl'
import PlanetLoadingState from '@/components/planet/PlanetLoadingState'

export default function PostDetailSkeleton() {
  const t = useTranslations('postContext')

  return (
    <div className="grid min-h-[380px] w-full place-content-center gap-4 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_70%)] px-6 py-10 text-center">
      <PlanetLoadingState compact label={t('loading')} />
      <p aria-hidden="true" className="text-sm tracking-wide text-violet-200">{t('loading')}</p>
    </div>
  )
}
