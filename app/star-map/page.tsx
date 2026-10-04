'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import StarMap from '@/components/star-map/StarMap'
import type { StarMapMode } from '@/types/star-map'

function StarMapPageContent() {
  const t = useTranslations('starMap')
  const params = useSearchParams()
  const requested = params.get('mode')
  const mode: StarMapMode =
    requested === 'galaxies' || requested === 'resonance'
      ? requested
      : 'discover'
  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">{t('title')}</h1>
        <p className="mt-3 text-sm text-slate-400">{t('subtitle')}</p>
        <nav className="mt-5 flex flex-wrap gap-3" aria-label={t('modes')}>
          {(['discover', 'galaxies', 'resonance'] as const).map((value) => (
            <Link
              key={value}
              href={`/star-map?mode=${value}`}
              aria-current={value === mode ? 'page' : undefined}
              className={`rounded-lg border px-4 py-2 text-sm ${value === mode ? 'border-violet-400 text-violet-200' : 'border-white/10 text-slate-400'}`}
            >
              {t(`mode_${value}`)}
            </Link>
          ))}
        </nav>
        <div
          className="mt-5 inline-flex overflow-hidden rounded-lg border border-white/15 text-sm text-violet-200"
          aria-label={t('viewMode')}
        >
          <span className="bg-violet-400/20 px-4 py-2" aria-current="true">
            {t('mapView')}
          </span>
          <Link
            className="px-4 py-2 hover:bg-white/5"
            href={
              mode === 'galaxies'
                ? '/galaxies'
                : mode === 'resonance'
                  ? '/resonance'
                  : '/discover'
            }
          >
            {t('listView')}
          </Link>
        </div>
        {mode === 'resonance' && (
          <div className="mt-4 max-w-2xl rounded-xl border border-violet-300/15 bg-violet-400/5 p-4 text-xs leading-relaxed text-slate-300">
            <p>{t('resonancePurpose')}</p>
            <Link
              href="/resonance"
              className="mt-2 inline-block text-violet-200"
            >
              {t('openRecommendations')} →
            </Link>
          </div>
        )}
        <StarMap key={mode} mode={mode} />
        <p className="mt-5 text-xs text-slate-400">{t('paths')}</p>
      </main>
    </AppShell>
  )
}
export default function StarMapPage() {
  return (
    <Suspense>
      <StarMapPageContent />
    </Suspense>
  )
}
