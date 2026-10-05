'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import { authClient } from '@/lib/auth-client'
import BasicPreferencesForm from './BasicPreferencesForm'

export default function RegistrationGate({ children }: { children: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const t = useTranslations('registrationBasics')
  const [state, setState] = useState<{ userId: string; required: boolean } | null>(null)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    const controller = new AbortController()
    fetch('/api/registration', { cache: 'no-store', signal: controller.signal }).then(async res => {
      if (!res.ok) throw new Error('registration')
      const data = await res.json()
      setState({ userId, required: data.required }); setError(false)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [userId, attempt])
  if (isPending) return <p className="p-12 text-center">{t('loading')}</p>
  // The anonymous calibration preview remains available. Creating an account
  // still goes through the server declaration gate before saving a planet.
  if (!userId) return children
  if (!state || state.userId !== userId) return <div className="p-12 text-center">{error ? <><p role="alert">{t('loadError')}</p><button onClick={() => { setError(false); setAttempt(v => v + 1) }}>{t('retry')}</button></> : t('loading')}</div>
  if (state.required) return <BasicPreferencesForm onSaved={() => setState({ userId, required: false })} />
  return children
}
