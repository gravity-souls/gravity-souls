'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useActivityStatus } from '@/lib/hooks/useActivityStatus'
import type { GalaxyEventSummary } from '@/types/event'

export default function CalendarReminder({ event }: { event: GalaxyEventSummary }) {
  const t = useTranslations('activityReminders')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [downloaded, setDownloaded] = useState(false)
  const effectiveStatus = useActivityStatus(event.status, event.date)
  if (effectiveStatus !== 'APPROVED' || !event.userHasRSVPed && !event.isOrganizer) return null
  return <div className="mt-4 grid gap-2 rounded-xl border border-white/10 p-4">
    <button type="button" disabled={busy} className="min-h-11 rounded-xl border border-violet-300/30 px-4 py-2 text-sm text-violet-200 disabled:opacity-50" onClick={async () => {
      setBusy(true); setError(''); setDownloaded(false)
      try {
        const response = await fetch(`/api/galaxies/${encodeURIComponent(event.galaxyId)}/events/${encodeURIComponent(event.id)}/calendar`, { cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 401 ? 'signInRequired' : response.status === 403 || response.status === 404 || response.status === 409 ? 'unavailable' : 'failed')
        const url = URL.createObjectURL(await response.blob()), link = document.createElement('a')
        link.href = url; link.download = 'gravity-souls-activity.ics'; document.body.appendChild(link); link.click(); link.remove()
        setTimeout(() => URL.revokeObjectURL(url), 30_000); setDownloaded(true)
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'failed') }
      finally { setBusy(false) }
    }}>{t(busy ? 'working' : 'addCalendar')}</button>
    <p className="text-xs text-white/60">{t('explanation')}</p>
    {downloaded && <p role="status" className="text-xs text-violet-200">{t('downloaded')}</p>}
    {error && <p role="alert" className="text-xs text-red-300">{t(error)}</p>}
  </div>
}
