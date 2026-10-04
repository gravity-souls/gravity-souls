'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'
import CreateEventForm from '@/components/events/CreateEventForm'
import type { GalaxyEventDetail } from '@/types/event'
export default function EventManagement({
  event,
  onChanged,
}: {
  event: GalaxyEventDetail
  onChanged: () => void
}) {
  const t = useTranslations('galaxyWorkflow')
  const [editing, setEditing] = useState(false),
    [attendees, setAttendees] = useState<
      { userId: string; name: string; status: string }[]
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [revision, setRevision] = useState(0)
  const endpoint = `/api/galaxies/${event.galaxyId}/events/${event.id}`
  useEffect(() => {
    let alive = true
    galaxyRequest<{ attendees: typeof attendees }>(`${endpoint}/attendees`)
      .then((data) => {
        if (alive) setAttendees(data.attendees)
      })
      .catch((err) => {
        if (alive) setError(t.has(err.message) ? t(err.message) : t('failed'))
      })
    return () => {
      alive = false
    }
  }, [endpoint, revision, t])
  async function review(userId: string, status: string) {
    if (status === 'REJECTED' && !window.confirm(t('rejectAttendanceConfirm')))
      return
    setBusy(true)
    setError('')
    try {
      await galaxyRequest(`${endpoint}/attendees`, 'PATCH', { userId, status })
      setRevision((v) => v + 1)
    } catch (err) {
      const key = err instanceof Error ? err.message : 'failed'
      setError(t.has(key) ? t(key) : t('failed'))
    } finally {
      setBusy(false)
    }
  }
  const closed =
    ['CANCELLED', 'PASSED'].includes(event.status) ||
    new Date(event.date) <= new Date()
  return (
    <section className="mt-6 grid gap-4 border-t border-white/10 pt-5">
      <h3 className="font-semibold">{t('manageEvent')}</h3>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      {!closed && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-2 text-xs"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? t('close') : t('editEvent')}
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-lg border border-red-400/30 px-3 py-2 text-xs text-red-200"
            onClick={async () => {
              if (!window.confirm(t('cancelEventConfirm'))) return
              setBusy(true)
              try {
                await galaxyRequest(endpoint, 'DELETE')
                onChanged()
              } catch (err) {
                const key = err instanceof Error ? err.message : 'failed'
                setError(t.has(key) ? t(key) : t('failed'))
              } finally {
                setBusy(false)
              }
            }}
          >
            {t('cancelEvent')}
          </button>
        </div>
      )}
      {editing && (
        <CreateEventForm
          galaxyId={event.galaxyId}
          initialEvent={event}
          onCreated={() => onChanged()}
        />
      )}
      <h4 className="text-sm font-medium">{t('attendanceRequests')}</h4>
      {!attendees.length && (
        <p className="text-xs text-white/50">{t('noRequests')}</p>
      )}
      {attendees.map((a) => (
        <div
          key={a.userId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/5 p-3"
        >
          <div className="text-sm">
            {a.name}
            <span className="ml-2 text-xs text-white/50">
              {t(a.status === 'PENDING' ? 'pending' : 'approved')}
            </span>
          </div>
          {!closed && event.status === 'APPROVED' && (
            <div className="flex gap-2">
              {a.status === 'PENDING' && (
                <button
                  disabled={busy}
                  className="text-xs text-green-200"
                  onClick={() => review(a.userId, 'APPROVED')}
                >
                  {t('approve')}
                </button>
              )}
              <button
                disabled={busy}
                className="text-xs text-red-200"
                onClick={() => review(a.userId, 'REJECTED')}
              >
                {t(a.status === 'PENDING' ? 'reject' : 'remove')}
              </button>
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
