'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { PLANET_ACTION_CHANGED, setPlanetSaved, type PlanetActionChange } from '@/lib/planet-actions'

export default function SavePlanetButton({ planetId, initialSaved, onChange }: { planetId: string; initialSaved?: boolean; onChange?: (saved: boolean) => void }) {
  const t = useTranslations('planetActions')
  const [saved, setSaved] = useState<boolean | null>(initialSaved ?? null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    let sequence = 0
    async function refresh() {
      const current = ++sequence
      try {
        const response = await fetch(`/api/saved-planets/${encodeURIComponent(planetId)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
        const data = await response.json()
        if (!cancelled && current === sequence) { setSaved(data.saved); setError('') }
      } catch (cause) { if (!cancelled && current === sequence) setError(cause instanceof Error ? cause.message : 'failed') }
    }
    function sync(event: Event) {
      const change = (event as CustomEvent<PlanetActionChange>).detail
      if (change.kind === 'saved' && change.planetId === planetId) { sequence++; setSaved(change.saved); setError('') }
    }
    void refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener(PLANET_ACTION_CHANGED, sync)
    return () => { cancelled = true; window.removeEventListener('focus', refresh); window.removeEventListener(PLANET_ACTION_CHANGED, sync) }
  }, [planetId, revision])
  async function toggle() {
    if (saved === null) return
    setBusy(true); setError('')
    try { await setPlanetSaved(planetId, !saved); setSaved(!saved); onChange?.(!saved) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'failed') }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-2">
    <button type="button" aria-pressed={saved ?? false} disabled={busy || saved === null} onClick={toggle}
      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-violet-200 hover:bg-white/5 disabled:opacity-50">
      {busy ? t('working') : saved === null ? t('loading') : saved ? t('removeSave') : t('save')}
    </button>
    {saved && <Link href="/saved" className="text-xs text-violet-300 underline">{t('viewOrbit')}</Link>}
    {error && <div role="alert" className="text-xs text-red-300">{t(error === 'auth' ? 'signInRequired' : 'failed')} {error === 'auth' ? <Link href="/sign-in">{t('signIn')}</Link> : <button type="button" className="underline" onClick={() => saved === null ? setRevision(v => v + 1) : void toggle()}>{t('retry')}</button>}</div>}
  </div>
}
