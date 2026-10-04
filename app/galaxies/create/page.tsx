'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import GalaxyForm from '@/components/galaxy/GalaxyForm'
export default function CreateGalaxyPage() {
  const t = useTranslations('galaxyWorkflow')
  return (
    <AppShell>
      <main className="mx-auto max-w-2xl px-5 py-8 pb-24">
        <Link href="/galaxies" className="text-sm text-white/60">
          ← {t('allGalaxies')}
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">{t('createGalaxy')}</h1>
        <p className="mb-7 mt-3 text-sm text-white/60">{t('createHint')}</p>
        <GalaxyForm />
        <Link className="mt-5 block text-sm underline" href="/onboarding">
          {t('createPlanetFirst')}
        </Link>
        <Link
          className="mt-3 block text-sm underline"
          href="/sign-in?next=/galaxies/create"
        >
          {t('signInRequired')}
        </Link>
      </main>
    </AppShell>
  )
}
