'use client'

import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { GalaxyEventSummary } from '@/types/event'

type InterestChange = { eventId: string; interested: boolean }
export default function InterestButton({ event }: { event: GalaxyEventSummary }) {
  const t = useTranslations('eventInterest')
  const [interested, setInterested] = useState(event.userInterested ?? false)
  const [ready, setReady] = useState(event.userInterested !== undefined)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endpoint = `/api/galaxies/${event.galaxyId}/events/${event.id}/interest`
  useEffect(() => {
    let cancelled = false
    function sync(change: Event) {
      const detail = (change as CustomEvent<InterestChange>).detail
      if (detail.eventId === event.id) { setInterested(detail.interested); setReady(true) }
    }
    window.addEventListener('event-interest:changed', sync)
    if (event.userInterested === undefined) {
      fetch(endpoint, { cache: 'no-store' }).then(async response => {
        if (!response.ok) throw new Error('failed')
        const data = await response.json()
        if (!cancelled) { setInterested(data.interested); setReady(true); setError('') }
      }).catch(() => { if (!cancelled) setError(t('failed')) })
    } else {
      Promise.resolve().then(() => { if (!cancelled) { setInterested(event.userInterested!); setReady(true) } })
    }
    return () => { cancelled = true; window.removeEventListener('event-interest:changed', sync) }
  }, [endpoint, event.id, event.userInterested, t, revision])

  async function toggle() {
    setBusy(true); setError('')
    try {
      const response = await fetch(endpoint, { method: interested ? 'DELETE' : 'POST' })
      if (!response.ok) { setError(response.status === 409 ? t('closed') : t('failed')); return }
      const next = !interested
      setInterested(next)
      window.dispatchEvent(new CustomEvent<InterestChange>('event-interest:changed', { detail: { eventId: event.id, interested: next } }))
    } catch { setError(t('failed')) }
    finally { setBusy(false) }
  }
  const closed = event.status !== 'APPROVED' || new Date(event.date).getTime() <= Date.now()
  return <div className="flex flex-col gap-1">
    <button type="button" aria-pressed={interested} disabled={busy || !ready || (closed && !interested)} onClick={toggle}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-xs text-violet-200 hover:bg-white/5 disabled:opacity-40">
      <Bookmark size={14} fill={interested ? 'currentColor' : 'none'} />{busy ? t('saving') : interested ? t('saved') : t('save')}
    </button>
    {error && <span role="alert" className="text-xs text-red-300">{error}{!ready && <button type="button" className="ml-2 underline" onClick={() => setRevision(value => value + 1)}>{t('retry')}</button>}</span>}
  </div>
}
