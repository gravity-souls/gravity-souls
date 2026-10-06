'use client'
import PublicPlanetTags from '@/components/planet/PublicPlanetTags'
import PreferenceMatchNote from '@/components/discovery/PreferenceMatchNote'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { buildResonanceSession, orbitColorHex } from '@/lib/match'
import { localizeResonanceMatch } from '@/lib/resonance-presentation'
import type { MatchReportData } from '@/lib/use-match-report'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import MatchDimensionBars from './MatchDimensionBars'
import { resolvePlanetTexture } from '@/lib/planet-textures'
import { planetDisplayName } from '@/lib/planet-display-name'

export default function MatchReportContent({ data }: { data: MatchReportData }) {
  const td = useTranslations('discoveryPreferences'), t = useTranslations('matchReport'), tr = useTranslations('resonance'), traits = useTranslations('creationSteps'), locale = useLocale()
  const session = buildResonanceSession(data.source, data.candidates)
  const matches = session.matches.map(match => {
    const planet = data.candidates.find(planet => planet.id === match.planetId)!
    return { planet, match: localizeResonanceMatch(match, data.source, planet, tr, traits) }
  })
  const average = matches.length ? Math.round(matches.reduce((sum, { match }) => sum + match.score, 0) / matches.length) : null
  return <>
    <section className="mt-6 rounded-3xl border border-violet-200/20 bg-violet-300/5 p-5 sm:p-8" aria-label={t('overview')}>
      <div className="flex items-center gap-4"><PlanetAvatar planetConfig={data.source.planetConfig} textureFile={resolvePlanetTexture(data.source)} size={64} /><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{planetDisplayName(data.source)}</h2><p className="mt-1 text-sm text-slate-400">{t('updated', { date: new Date(data.updatedAt).toLocaleString(locale) })}</p></div></div>
      <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3"><div><dt className="text-xs text-slate-400">{t('matches')}</dt><dd className="mt-1 text-3xl tabular-nums">{matches.length}</dd></div><div><dt className="text-xs text-slate-400">{t('average')}</dt><dd className="mt-1 text-3xl tabular-nums">{average ?? '—'}</dd></div><div><dt className="text-xs text-slate-400">{t('strongest')}</dt><dd className="mt-1 text-3xl tabular-nums">{matches[0]?.match.score ?? '—'}</dd></div></dl>
      <p className="mt-5 text-sm text-slate-400">{td('scoringHint')}</p>
      <p className="mt-5 text-sm leading-relaxed text-slate-400">{t('scope', { count: data.candidates.length })}</p>
    </section>
    {matches.length === 0 && <section className="mt-6 rounded-2xl border border-white/10 p-6"><h2 className="font-semibold">{t('empty')}</h2><p className="mt-2 text-sm text-slate-400">{t('emptyHint')}</p><Link href="/star-map?mode=discover" className="mt-3 inline-flex min-h-11 items-center text-violet-200 underline">{t('explore')}</Link></section>}
    <div className="mt-6 grid gap-5 lg:grid-cols-2">{matches.map(({ planet, match }, index) => {
      const color = orbitColorHex(match.orbitColor)
      return <article key={planet.id} className="min-w-0 rounded-3xl border border-white/10 p-5 sm:p-6" aria-label={t('entry', { name: planetDisplayName(planet) })}>
        <div className="flex items-center gap-3"><PlanetAvatar planetConfig={planet.planetConfig} textureFile={resolvePlanetTexture(planet)} size={48} /><div className="min-w-0 flex-1"><p className="text-xs text-slate-400">{t('rank', { rank: index + 1 })}</p><h2 className="break-words text-lg font-semibold">{planetDisplayName(planet)}</h2></div><span className="shrink-0 text-3xl tabular-nums" style={{ color }}>{match.score}</span></div>
        <PublicPlanetTags tags={planet.publicTags} /><PreferenceMatchNote match={match} /><p className="my-5 text-sm leading-relaxed text-slate-300">{match.resonanceNote}</p>
        <h3 className="mb-3 text-sm font-semibold">{t('dimensions')}</h3><MatchDimensionBars dimensions={match.dimensions} primaryColor={match.orbitColor} />
        <h3 className="mb-2 mt-5 text-sm font-semibold">{tr('gravitationalPull')}</h3>{match.similarities.length ? <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">{match.similarities.map(value => <li key={value}>{value}</li>)}</ul> : <p className="text-sm text-slate-400">{t('noShared')}</p>}
        <h3 className="mb-2 mt-5 text-sm font-semibold">{tr('productiveContrast')}</h3>{match.differences.length ? <ul className="list-inside list-disc space-y-2 text-sm text-slate-300">{match.differences.map(value => <li key={value}>{value}</li>)}</ul> : <p className="text-sm text-slate-400">{t('noContrast')}</p>}
        <div className="mt-6 flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-4 text-sm text-violet-200" href={`/planet/${encodeURIComponent(planet.id)}`}>{tr('viewPlanet')}</Link><Link className="inline-flex min-h-11 items-center rounded-xl bg-violet-400/15 px-4 text-sm text-violet-200" href={`/messages?to=${encodeURIComponent(planet.id)}`}>{tr('sendSignal')}</Link></div>
      </article>
    })}</div>
  </>
}
