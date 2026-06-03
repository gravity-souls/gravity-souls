'use client'

import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { EventStatus } from '@/types/event'

interface RSVPButtonProps {
  eventId: string
  galaxyId: string
  initialRSVPed: boolean
  initialCount: number
  maxAttendees?: number | null
  status?: EventStatus
  onChange?: (state: { rsvpCount: number; userHasRSVPed: boolean }) => void
}

export default function RSVPButton({
  eventId,
  galaxyId,
  initialRSVPed,
  initialCount,
  maxAttendees,
  status = 'APPROVED',
  onChange,
}: RSVPButtonProps) {
  const t = useTranslations('galaxies')
  const tCommon = useTranslations('common')
  const [userHasRSVPed, setUserHasRSVPed] = useState(initialRSVPed)
  const [rsvpCount, setRsvpCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setUserHasRSVPed(initialRSVPed)
    setRsvpCount(initialCount)
  }, [initialRSVPed, initialCount])

  const full = useMemo(() => (
    !!maxAttendees && rsvpCount >= maxAttendees && !userHasRSVPed
  ), [maxAttendees, rsvpCount, userHasRSVPed])

  if (status === 'PASSED') return null

  async function handleClick() {
    if (loading || full || status !== 'APPROVED') return

    const nextRSVPed = !userHasRSVPed
    const nextCount = Math.max(0, rsvpCount + (nextRSVPed ? 1 : -1))
    const previous = { userHasRSVPed, rsvpCount }

    setUserHasRSVPed(nextRSVPed)
    setRsvpCount(nextCount)
    onChange?.({ userHasRSVPed: nextRSVPed, rsvpCount: nextCount })
    setLoading(true)

    try {
      const res = await fetch(`/api/galaxies/${galaxyId}/events/${eventId}/rsvp`, {
        method: nextRSVPed ? 'POST' : 'DELETE',
      })

      if (!res.ok) throw new Error('RSVP failed')

      const data = await res.json() as { rsvpCount: number; userHasRSVPed: boolean }
      setRsvpCount(data.rsvpCount)
      setUserHasRSVPed(data.userHasRSVPed)
      onChange?.(data)
    } catch {
      setUserHasRSVPed(previous.userHasRSVPed)
      setRsvpCount(previous.rsvpCount)
      onChange?.(previous)
    } finally {
      setLoading(false)
    }
  }

  if (full) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold text-white/45"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {t('eventFull')}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || status !== 'APPROVED'}
      className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200"
      style={{
        color: userHasRSVPed ? '#86efac' : '#fff',
        background: userHasRSVPed ? 'rgba(34,197,94,0.10)' : 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(99,102,241,0.92))',
        border: userHasRSVPed ? '1px solid rgba(74,222,128,0.45)' : '1px solid rgba(167,139,250,0.55)',
        boxShadow: userHasRSVPed ? 'none' : '0 12px 28px rgba(99,102,241,0.24)',
        opacity: loading || status !== 'APPROVED' ? 0.65 : 1,
        cursor: loading || status !== 'APPROVED' ? 'default' : 'pointer',
      }}
    >
      {loading && <LoaderCircle size={14} className="animate-spin" />}
      {loading ? tCommon('loading') : userHasRSVPed ? t('going') : t('rsvp')}
    </button>
  )
}