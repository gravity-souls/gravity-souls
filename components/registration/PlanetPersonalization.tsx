'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import PlanetCustomizer from '@/components/planet/PlanetCustomizer'
import AccountIdentity from '@/components/auth/AccountIdentity'
import OnboardingShell from '@/components/onboarding/OnboardingShell'
import { requestSocialRefresh } from '@/lib/social-refresh'
import type { PlanetConfig, PlanetProfile } from '@/types/planet'

export default function PlanetPersonalization({ planet, onContinue }: { planet: PlanetProfile; onContinue: () => void }) {
  const t = useTranslations('onboardingRefinements')
  const [identity, setIdentity] = useState<{ config: PlanetConfig; level: number } | null>(null), [failed, setFailed] = useState(false), [attempt, setAttempt] = useState(0), [saved, setSaved] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/me', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('planet')
      const data = await response.json()
      if (!data.user?.planetConfig) throw new Error('config')
      if (!controller.signal.aborted) setIdentity({ config: data.user.planetConfig, level: data.user.userLevel || 1 })
    }).catch(() => { if (!controller.signal.aborted) setFailed(true) })
    return () => controller.abort()
  },[attempt])
  return <OnboardingShell wide><section className="space-y-6 pb-12" data-testid="planet-personalization">
    <h1 className="text-3xl font-semibold">{t('personalizeTitle')}</h1><p className="text-sm leading-relaxed opacity-70">{t('personalizeHint')}</p>
    {identity ? <PlanetCustomizer initialConfig={identity.config} planetName={planet.name} userLevel={identity.level} onSaved={config => { setIdentity({ ...identity, config }); setSaved(true); requestSocialRefresh() }} /> : failed ? <div><p role="alert">{t('personalizeError')}</p><button type="button" className="min-h-11 underline" onClick={() => { setFailed(false); setAttempt(i => i+1) }}>{t('retry')}</button></div> : <p>{t('loadingIdentity')}</p>}
    {saved && <p role="status" className="text-emerald-300">{t('appearanceSaved')}</p>}
    <AccountIdentity compact />
    <button type="button" onClick={onContinue} className="min-h-12 w-full rounded-2xl bg-violet-400 px-5 py-4 font-semibold text-slate-950">{t(saved ? 'enterUniverse' : 'personalizeLater')}</button>
  </section></OnboardingShell>
}
