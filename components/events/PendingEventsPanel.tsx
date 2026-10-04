'use client'
import { useEffect, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'
import type { GalaxyEventSummary } from '@/types/event'
export default function PendingEventsPanel({
  galaxyId,
  enabled = true,
  onReviewed,
}: {
  galaxyId: string
  enabled?: boolean
  onReviewed?: (id: string, status: 'APPROVED' | 'REJECTED') => void
}) {
  const locale = useLocale()
  const t = useTranslations('galaxyWorkflow'),
    te = useTranslations('eventForms')
  const [events, setEvents] = useState<GalaxyEventSummary[]>([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [size, setSize] = useState(20),
    [revision, setRevision] = useState(0),
    [reasons, setReasons] = useState<Record<string, string>>({})
  useEffect(() => {
    if (!enabled) return
    let alive = true
    Promise.resolve().then(() => {
      if (alive) setLoading(true)
    })
    galaxyRequest<{
      events: GalaxyEventSummary[]
      total: number
      pageSize: number
    }>(`/api/galaxies/${galaxyId}/events?status=pending&page=${page}`)
      .then((data) => {
        if (alive) {
          setEvents(data.events)
          setTotal(data.total)
          setSize(data.pageSize)
          setError('')
          if (!data.events.length && page > 1) setPage((p) => p - 1)
        }
      })
      .catch((err) => {
        if (alive) setError(t.has(err.message) ? t(err.message) : t('failed'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [enabled, galaxyId, page, revision, t])
  async function review(id: string, status: 'APPROVED' | 'REJECTED') {
    setBusy(true)
    setError('')
    try {
      await galaxyRequest(
        `/api/galaxies/${galaxyId}/events/${id}/status`,
        'PATCH',
        { status, rejectionReason: reasons[id] || undefined },
      )
      setRevision((v) => v + 1)
      onReviewed?.(id, status)
    } catch (err) {
      const key = err instanceof Error ? err.message : 'failed'
      setError(t.has(key) ? t(key) : t('failed'))
    } finally {
      setBusy(false)
    }
  }
  if (!enabled) return null
  return (
    <div className="grid gap-4">
      {error && (
        <p role="alert" className="text-red-300">
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setRevision((v) => v + 1)}
          >
            {t('retry')}
          </button>
        </p>
      )}
      {loading ? (
        <p>{t('loading')}</p>
      ) : !events.length ? (
        <p>{t('noRequests')}</p>
      ) : (
        events.map((event) => (
          <article
            key={event.id}
            className="grid gap-3 rounded-xl border border-white/10 p-4"
          >
            <h3 className="font-semibold">{event.title}</h3>
            <p className="text-sm text-white/60">{event.description}</p>
            <p className="text-xs text-white/50">
              {event.proposer.name} ·{' '}
              {new Date(event.date).toLocaleString(locale)}
            </p>
            <textarea
              className="rounded-lg border border-white/15 bg-white/5 p-2 text-sm"
              placeholder={te('optionalRejectionReason')}
              value={reasons[event.id] ?? ''}
              onChange={(e) =>
                setReasons({ ...reasons, [event.id]: e.target.value })
              }
            />
            <div className="flex gap-4">
              <button
                disabled={busy}
                className="text-sm text-green-200"
                onClick={() => review(event.id, 'APPROVED')}
              >
                {t('approve')}
              </button>
              <button
                disabled={busy}
                className="text-sm text-red-200"
                onClick={() => review(event.id, 'REJECTED')}
              >
                {t('reject')}
              </button>
            </div>
          </article>
        ))
      )}
      {total > size && (
        <div className="flex justify-between">
          <button
            disabled={page === 1 || loading}
            onClick={() => setPage((p) => p - 1)}
          >
            {t('previous')}
          </button>
          <span>
            {page} / {Math.ceil(total / size)}
          </span>
          <button
            disabled={page * size >= total || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            {t('next')}
          </button>
        </div>
      )}
    </div>
  )
}
