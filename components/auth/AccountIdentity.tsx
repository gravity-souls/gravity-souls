'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import OrbitCard from '@/components/ui/OrbitCard'

type Identity = { name: string; email: string; verified: boolean; available: boolean }
export default function AccountIdentity({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('onboardingRefinements')
  const [identity, setIdentity] = useState<Identity | null>(null), [status, setStatus] = useState(''), [busy, setBusy] = useState(false), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const load = () => fetch('/api/user/email-verification', { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('identity')
      const data = await response.json()
      if (!controller.signal.aborted) setIdentity(data)
    }).catch(() => { if (!controller.signal.aborted) setStatus('identityError') })
    void load(); window.addEventListener('focus',load)
    return () => { controller.abort(); window.removeEventListener('focus',load) }
  },[attempt])
  async function resend() {
    setBusy(true); setStatus('')
    try {
      const response = await fetch('/api/user/email-verification', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      if (!response.ok) { setStatus(response.status === 429 ? 'verificationLimit' : 'verificationError'); return }
      const data = await response.json()
      if (data.verified) setIdentity(i => i ? { ...i, verified: true } : i)
      else setStatus('verificationSent')
    } catch { setStatus('verificationError') } finally { setBusy(false) }
  }
  return <OrbitCard className={compact ? 'p-4' : 'p-6'}><h2 className="font-semibold">{t('accountIdentity')}</h2>{identity ? <div className="mt-4 grid gap-3 text-sm">
    {!compact && <p>{t('accountName')}: {identity.name}</p>}
    <p className="break-all">{t('email')}: {identity.email}</p>
    <p className={identity.verified ? 'text-emerald-300' : 'text-amber-200'}>{t(identity.verified ? 'emailVerified' : 'emailUnverified')}</p>
    <p className="text-xs opacity-60">{t('emailPrivacy')}</p>
    {!identity.verified && (identity.available ? <button type="button" disabled={busy || status === 'verificationSent'} onClick={() => void resend()} className="min-h-11 w-fit rounded-xl border border-violet-300/40 bg-violet-400/15 px-4 disabled:opacity-50">{t(busy ? 'sendingVerification' : 'sendVerification')}</button> : <p className="text-xs opacity-60">{t('verificationUnavailable')}</p>)}
  </div> : !status && <p className="mt-3 text-sm opacity-60">{t('loadingIdentity')}</p>}
  {status && <p role={status === 'verificationSent' ? 'status' : 'alert'} className="mt-3 text-sm">{t(status)}</p>}
  {status === 'identityError' && <button type="button" onClick={() => { setStatus(''); setAttempt(i => i+1) }} className="min-h-11 underline">{t('retry')}</button>}
  </OrbitCard>
}
