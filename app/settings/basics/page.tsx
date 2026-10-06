'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import BasicPreferencesForm from '@/components/registration/BasicPreferencesForm'
import { EMPTY_BASICS, type BasicPreferences } from '@/lib/registration-basics'

export default function BasicsSettingsPage() {
  const t = useTranslations('registrationBasics')
  const [record, setRecord] = useState<{ basics: BasicPreferences; confirmed: boolean } | null>(null)
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/registration', { cache: 'no-store', signal: controller.signal }).then(async res => {
      if (!res.ok) throw new Error('load')
      const data = await res.json()
      const basics = { ...EMPTY_BASICS }
      // Never send server timestamps or identifiers back as editable fields.
      for (const key of Object.keys(basics) as (keyof BasicPreferences)[]) if (data.basics?.[key] !== undefined) Object.assign(basics, { [key]: data.basics[key] })
      setRecord({ basics, confirmed: !!data.basics?.adultConfirmedAt }); setError(false)
    }).catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [attempt])
  if (!record) return <div className="p-12 text-center">{error ? <><p role="alert">{t('loadError')}</p><button onClick={() => { setError(false); setAttempt(v => v + 1) }}>{t('retry')}</button></> : t('loading')}</div>
  if (saved) return <div className="mx-auto flex max-w-lg flex-col gap-5 px-6 py-24"><p role="status">{t('saved')}</p><Link href="/settings/planet" className="underline">{t('backSettings')}</Link><button onClick={() => setSaved(false)}>{t('editTitle')}</button></div>
  return <><Link href="/settings/planet" className="relative z-10 ml-6 block pt-8 underline">{t('backSettings')}</Link><BasicPreferencesForm editing initial={record.basics} adultAlreadyConfirmed={record.confirmed} onSaved={basics => { setRecord({ basics, confirmed: true }); setSaved(true) }} /></>
}
