'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { setPlanetSaved } from '@/lib/planet-actions'

import { requestSocialRefresh, subscribeSocialRefresh } from '@/lib/social-refresh'

export default function SavePlanetButton({ planetId, initialSaved, onChange }: { planetId: string; initialSaved?: boolean; onChange?: (saved: boolean) => void }) {
  const t = useTranslations('planetActions')
  const generation = useRef(0), mutating = useRef(false)
  const [notice, setNotice] = useState('')
  const [saved, setSaved] = useState<boolean | null>(initialSaved ?? null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function refresh() {
      if (mutating.current) return
      const current = ++generation.current
      try {
        const response = await fetch(`/api/saved-planets/${encodeURIComponent(planetId)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
        const data = await response.json()
        if (!cancelled && current === generation.current) { setSaved(data.saved); setError('') }
      } catch (cause) { if (!cancelled && current === generation.current) { setSaved(null); setError(cause instanceof Error ? cause.message : 'failed') } }
    }
    void refresh()
    const invalidate = () => { generation.current++ }
    const unsubscribe = subscribeSocialRefresh(() => { void refresh() })
    return () => { cancelled = true; invalidate(); unsubscribe() }
  }, [planetId, revision])
  async function toggle() {
    if (saved === null || mutating.current) return
    const desired = !saved
    const current = ++generation.current
    mutating.current = true
    let succeeded = false
    setBusy(true); setError(''); setNotice('')
    try { await setPlanetSaved(planetId, desired); succeeded = true; if (current === generation.current) { setSaved(desired); setNotice(desired ? 'saveDone' : 'removeSaveDone'); onChange?.(desired) } }
    catch (cause) { if (current === generation.current) { setSaved(null); setError(cause instanceof Error ? cause.message : 'failed') } }
    finally { mutating.current = false; setBusy(false); if (succeeded) setRevision(v => v + 1) }
  }
  return <div className="flex flex-col gap-2">
    <button type="button" aria-pressed={saved ?? false} disabled={busy || saved === null} onClick={toggle}
      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-violet-200 hover:bg-white/5 disabled:opacity-50">
      {busy ? t('working') : saved === null ? t('loading') : saved ? t('removeSave') : t('save')}
    </button>
    {saved && <><Link href="/star-map?mode=personal&collection=saved" className="min-h-11 py-2 text-xs text-violet-300 underline">{t('viewOrbit')}</Link><Link href="/saved" className="text-xs text-slate-400 underline">{t('viewSavedList')}</Link></>}
    {notice && !error && <p role="status" className="text-xs text-violet-200">{t(notice)}</p>}
    {error && <div role="alert" className="text-xs text-red-300">{t(error === 'auth' ? 'signInRequired' : 'stateFailed')} {error === 'auth' ? <Link href="/sign-in">{t('signIn')}</Link> : <button type="button" className="underline" onClick={requestSocialRefresh}>{t('retry')}</button>}</div>}
  </div>
}
