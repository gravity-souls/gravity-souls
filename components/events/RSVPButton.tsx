'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'
import type { EventStatus } from '@/types/event'
export interface AttendanceState {
  rsvpCount: number
  userHasRSVPed: boolean
  userAttendance?: string | null
}
interface RSVPButtonProps {
  eventId: string
  galaxyId: string
  initialRSVPed: boolean
  initialCount: number
  initialAttendance?: string | null
  requiresApproval?: boolean
  maxAttendees?: number | null
  status?: EventStatus
  onChange?: (state: AttendanceState) => void
}
export default function RSVPButton({
  eventId,
  galaxyId,
  initialRSVPed,
  initialCount,
  initialAttendance,
  requiresApproval,
  maxAttendees,
  status = 'APPROVED',
  onChange,
}: RSVPButtonProps) {
  const t = useTranslations('galaxyWorkflow'),
    old = useTranslations('galaxies')
  const [attendance, setAttendance] = useState(
      initialAttendance ?? (initialRSVPed ? 'APPROVED' : null),
    ),
    [count, setCount] = useState(initialCount),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    setAttendance(initialAttendance ?? (initialRSVPed ? 'APPROVED' : null))
    setCount(initialCount)
  }, [initialAttendance, initialRSVPed, initialCount])
  const enrolled = attendance === 'APPROVED' || attendance === 'PENDING'
  const closed = status === 'PASSED' || status === 'CANCELLED'
  const full = !enrolled && maxAttendees != null && count >= maxAttendees
  if (closed)
    return (
      <span className="text-xs text-white/50">
        {t(status === 'PASSED' ? 'passed' : 'cancelled')}
      </span>
    )
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={busy || full || (status !== 'APPROVED' && !enrolled)}
        className="rounded-xl border border-violet-400/30 bg-violet-600/25 px-4 py-2 text-xs font-semibold disabled:opacity-40"
        onClick={async () => {
          setBusy(true)
          setError('')
          try {
            const result = await galaxyRequest<AttendanceState>(
              `/api/galaxies/${galaxyId}/events/${eventId}/rsvp`,
              enrolled ? 'DELETE' : 'POST',
            )
            setAttendance(result.userAttendance ?? null)
            setCount(result.rsvpCount)
            onChange?.(result)
          } catch (err) {
            const key = err instanceof Error ? err.message : 'failed'
            setError(t.has(key) ? t(key) : t('failed'))
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy
          ? t('saving')
          : attendance === 'PENDING'
            ? t('cancelAttendanceRequest')
            : attendance === 'APPROVED'
              ? t('cancelAttendance')
              : full
                ? old('eventFull')
                : requiresApproval
                  ? t('requestAttendance')
                  : old('rsvp')}
      </button>
      {attendance === 'PENDING' && (
        <span className="text-xs text-amber-200">{t('attendancePending')}</span>
      )}
      {attendance === 'REJECTED' && (
        <span className="text-xs text-white/60">{t('attendanceRejected')}</span>
      )}
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
