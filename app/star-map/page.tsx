'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import StarMap from '@/components/star-map/StarMap'
import type { StarMapMode, PersonalMapCollection, PersonalMapLayer } from '@/types/star-map'

function StarMapPageContent() {
  const t = useTranslations('starMap')
  const params = useSearchParams()
  const requested = params.get('mode')
  const router = useRouter()
  useEffect(() => {
    if (requested === 'resonance') router.replace('/resonance')
  }, [requested, router])
  const mode: StarMapMode = requested === 'galaxies' ? 'galaxies' : requested === 'personal' ? 'personal' : 'discover'
  const choice = params.get('collection')
  const collection: PersonalMapCollection = choice === 'saved' || choice === 'following' || choice === 'mutual' ? choice : 'all'
  const requestedLayer = params.get('layer')
  const layer: PersonalMapLayer = mode === 'personal' && (requestedLayer === 'galaxies' || requestedLayer === 'activities') ? requestedLayer : 'planets'
  const listOnly = mode === 'personal' && params.get('view') === 'list'
  const personalHref = (value: PersonalMapCollection, list: boolean) => `/star-map?mode=personal&${layer === 'planets' ? `collection=${value}` : `layer=${layer}`}${list ? '&view=list' : ''}`
  if (requested === 'resonance') return null
  return (
    <AppShell personalMapActive={mode === 'personal'}>
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <h1 className="text-3xl font-semibold text-white">{t('title')}</h1>
        <p className="mt-3 text-sm text-slate-400">{t(mode === 'personal' ? 'personalSubtitle' : 'subtitle')}</p>
        <nav className="mt-5 flex flex-wrap gap-3" aria-label={t('modes')}>
          {(['discover', 'personal', 'galaxies'] as const).map((value) => (
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
        {mode === 'personal' && <nav className="mt-5 flex flex-wrap gap-2" aria-label={t('personalLayers')}>
          {(['planets', 'galaxies', 'activities'] as const).map(value => <Link key={value} href={`/star-map?mode=personal&layer=${value}${listOnly ? '&view=list' : ''}`} aria-current={value === layer ? 'page' : undefined} className={`min-h-11 rounded-lg px-4 py-3 text-sm ${value === layer ? 'bg-violet-400/20 text-violet-200' : 'text-slate-400 hover:bg-white/5'}`}>{t(`layer_${value}`)}</Link>)}
        </nav>}
        {mode === 'personal' && layer === 'planets' && <nav className="mt-5 flex flex-wrap gap-2" aria-label={t('personalFilters')}>
          {(['all', 'saved', 'following', 'mutual'] as const).map(value => <Link key={value}
            href={personalHref(value, listOnly)} aria-current={value === collection ? 'page' : undefined}
            className={`min-h-11 rounded-lg px-4 py-3 text-sm ${value === collection ? 'bg-violet-400/20 text-violet-200' : 'text-slate-400 hover:bg-white/5'}`}>
            {t(`collection_${value}`)}
          </Link>)}
        </nav>}
        <div role="group" className="mt-5 inline-flex overflow-hidden rounded-lg border border-white/15 text-sm text-violet-200" aria-label={t('viewMode')}>
          {mode === 'personal' ? <>
            <Link className={`px-4 py-3 ${!listOnly ? 'bg-violet-400/20' : 'hover:bg-white/5'}`} aria-current={!listOnly ? 'page' : undefined} href={personalHref(collection, false)}>{t('mapView')}</Link>
            <Link className={`px-4 py-3 ${listOnly ? 'bg-violet-400/20' : 'hover:bg-white/5'}`} aria-current={listOnly ? 'page' : undefined} href={personalHref(collection, true)}>{t('listView')}</Link>
          </> : <>
            <span className="bg-violet-400/20 px-4 py-3" aria-current="true">{t('mapView')}</span>
            <Link className="px-4 py-3 hover:bg-white/5" href={mode === 'galaxies' ? '/galaxies' : '/discover'}>{t('listView')}</Link>
          </>}
        </div>
        <StarMap key={`${mode}:${layer}:${collection}`} mode={mode} collection={collection} layer={layer} listOnly={listOnly} />
        {mode === 'personal' && <Link className="mt-4 inline-block py-3 text-sm text-violet-200" href="/star-map?mode=discover">{t('exploreGlobal')}</Link>}
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
