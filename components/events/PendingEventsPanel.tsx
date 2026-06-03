'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { GalaxyEventSummary } from '@/types/event'

interface PendingEventsPanelProps {
  galaxyId: string
  enabled?: boolean
  onReviewed?: (eventId: string, status: 'APPROVED' | 'REJECTED') => void
}

export default function PendingEventsPanel({ galaxyId, enabled = true, onReviewed }: PendingEventsPanelProps) {
  const t = useTranslations('galaxies')
  const tCommon = useTranslations('common')
  const [events, setEvents] = useState<GalaxyEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    setLoading(true)
    fetch(`/api/galaxies/${galaxyId}/events?status=pending`)
      .then((res) => res.ok ? res.json() : { events: [] })
      .then((data: { events?: GalaxyEventSummary[] }) => {
        if (!cancelled) setEvents(data.events ?? [])
      })
      .catch(() => {
        if (!cancelled) setEvents([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [enabled, galaxyId])

  async function review(eventId: string, status: 'APPROVED' | 'REJECTED') {
    setReviewingId(eventId)
    try {
      const res = await fetch(`/api/galaxies/${galaxyId}/events/${eventId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: reasons[eventId]?.trim() || undefined }),
      })
      if (!res.ok) return
      setEvents((prev) => prev.filter((event) => event.id !== eventId))
      onReviewed?.(eventId, status)
    } finally {
      setReviewingId(null)
    }
  }

  if (!enabled) return null

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--ghost)' }}>{tCommon('loading')}</p>
  }

  if (events.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
        <p className="text-sm" style={{ color: 'var(--ghost)' }}>{t('noPendingEvents')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {events.map((event) => (
        <article key={event.id} className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{event.title}</h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--ghost)' }}>
                {event.proposer.name} · {new Date(event.date).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => review(event.id, 'APPROVED')} disabled={reviewingId === event.id} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ color: '#bbf7d0', background: 'rgba(34,197,94,0.13)', border: '1px solid rgba(74,222,128,0.35)' }}>
                {t('approve')}
              </button>
              <button type="button" onClick={() => rejectingId === event.id ? review(event.id, 'REJECTED') : setRejectingId(event.id)} disabled={reviewingId === event.id} className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ color: '#fecaca', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(248,113,113,0.32)' }}>
                {t('reject')}
              </button>
            </div>
          </div>
          {rejectingId === event.id && (
            <textarea
              value={reasons[event.id] ?? ''}
              onChange={(changeEvent) => setReasons((prev) => ({ ...prev, [event.id]: changeEvent.target.value }))}
              rows={2}
              className="mt-3 w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
              placeholder={t('optionalRejectionReason')}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
            />
          )}
        </article>
      ))}
    </div>
  )
}