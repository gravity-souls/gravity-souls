'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import ResonanceHeader from '@/components/resonance/ResonanceHeader'
import MatchReportContent from '@/components/resonance/MatchReportContent'
import { useMatchReport } from '@/lib/use-match-report'

export default function MyPlanetReportPage() {
  const t = useTranslations('matchReport')
  const { data, loading, error, reload } = useMatchReport()
  return <AppShell><div className="mx-auto max-w-5xl px-4 pb-20 pt-8 sm:px-6">
    <nav aria-label={t('navigation')} className="mb-5 flex flex-wrap gap-3"><Link href="/my-planet" className="inline-flex min-h-11 items-center text-sm text-violet-200">{t('back')}</Link><Link href="/resonance" className="inline-flex min-h-11 items-center text-sm text-violet-200">{t('resonance')}</Link></nav>
    <ResonanceHeader title={t('title')} eyebrow={t('eyebrow')} subtitle={t('subtitle')} />
    <button type="button" disabled={loading} onClick={() => void reload()} className="mt-4 min-h-11 rounded-xl border border-white/15 px-4 text-sm text-violet-200 disabled:opacity-50">{t('refresh')}</button>
    {loading && <p role="status" className="mt-6 text-sm text-slate-400">{t('loading')}</p>}
    {error && <section role="alert" className="mt-6 rounded-2xl border border-white/10 p-5"><p>{t(error)}</p>{error === 'auth' && <Link href="/sign-in?next=/my-planet/report" className="mt-3 inline-flex min-h-11 items-center text-violet-200 underline">{t('signIn')}</Link>}{error === 'missing' && <Link href="/onboarding" className="mt-3 inline-flex min-h-11 items-center text-violet-200 underline">{t('create')}</Link>}</section>}
    {data && !loading && !error && <MatchReportContent data={data} />}
  </div></AppShell>
}
