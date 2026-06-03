'use client'

import { useState } from 'react'
import { CalendarDays, Check, MapPin, Monitor, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import RSVPButton from '@/components/events/RSVPButton'
import type { GalaxyEventDetail } from '@/types/event'

function formatEventDate(value: string, locale: string) {
  const date = new Date(value)
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date)
  const time = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

  return `${day} · ${time}`
}

interface EventDetailProps {
  event: GalaxyEventDetail | null
  open: boolean
  isAdmin: boolean
  onClose: () => void
  onStatusChange?: (eventId: string, status: 'APPROVED' | 'REJECTED') => void
  onRSVPChange?: (eventId: string, state: { rsvpCount: number; userHasRSVPed: boolean }) => void
}

export default function EventDetail({ event, open, isAdmin, onClose, onStatusChange, onRSVPChange }: EventDetailProps) {
  const t = useTranslations('galaxies')
  const tEvents = useTranslations('eventForms')
  const locale = useLocale()
  const [rejecting, setRejecting] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewError, setReviewError] = useState('')

  if (!open || !event) return null

  const visibleAttendees = event.rsvps.slice(0, 8)
  const hiddenCount = Math.max(0, event.rsvps.length - visibleAttendees.length)

  async function review(status: 'APPROVED' | 'REJECTED') {
    if (!event) return
    setReviewing(true)
    setReviewError('')
    try {
      const res = await fetch(`/api/galaxies/${event.galaxyId}/events/${event.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, rejectionReason: rejectionReason.trim() || undefined }),
      })

      if (!res.ok) throw new Error(tEvents('reviewError'))
      onStatusChange?.(event.id, status)
      onClose()
    } catch {
      setReviewError(tEvents('reviewFailed'))
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-70 flex items-end justify-center bg-black/68 px-0 backdrop-blur-md sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-label={tEvents('eventDetail')}>
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label={tEvents('closeEventDetail')} />
      <article
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl p-5 sm:max-w-2xl sm:rounded-2xl sm:p-6"
        style={{ background: 'rgba(8,10,28,0.96)', border: '1px solid var(--border-soft)', boxShadow: '0 28px 80px rgba(0,0,0,0.45)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ghost)', border: '1px solid rgba(255,255,255,0.08)' }}
          aria-label={tEvents('close')}
        >
          <X size={16} />
        </button>

        <div className="pr-10">
          <p className="text-eyebrow mb-2">{tEvents(`categories.${event.category.toLowerCase()}`)}</p>
          <h2 className="text-xl font-semibold leading-tight" style={{ color: 'var(--foreground)' }}>
            {event.title}
          </h2>
        </div>

        <div className="mt-5 grid gap-3 text-sm" style={{ color: 'var(--ghost)' }}>
          <span className="flex items-center gap-2">
            <CalendarDays size={16} />
            {formatEventDate(event.date, locale)}
          </span>
          <span className="flex items-center gap-2">
            {event.onlineUrl || event.category === 'ONLINE' ? <Monitor size={16} /> : <MapPin size={16} />}
            {event.location || (event.onlineUrl ? tEvents('online') : tEvents('online'))}
          </span>
        </div>

        <p className="mt-5 text-sm leading-7" style={{ color: 'var(--ink)', opacity: 0.78 }}>
          {event.description}
        </p>

        <div className="mt-6 flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <PlanetAvatar textureFile={event.proposer.planetTexture ?? undefined} size={40} showBadge level={event.proposer.userLevel ?? 1} />
          <div>
            <p className="text-xs" style={{ color: 'var(--ghost)' }}>{tEvents('proposedBy')}</p>
            <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{event.proposer.name}</p>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-data-label">{tEvents('attendees')}</p>
            <span className="text-xs" style={{ color: 'var(--ghost)' }}>
              {event.rsvpCount}{event.maxAttendees ? ` / ${event.maxAttendees}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex min-h-10 items-center pl-2">
              {visibleAttendees.map((attendee, index) => (
                <div key={attendee.id} className="-ml-2" style={{ zIndex: visibleAttendees.length - index }} title={attendee.name}>
                  <PlanetAvatar textureFile={attendee.planetTexture ?? undefined} size={34} showBadge level={attendee.userLevel} />
                </div>
              ))}
              {visibleAttendees.length === 0 && <span className="text-sm" style={{ color: 'var(--ghost)' }}>{tEvents('noRsvps')}</span>}
            </div>
            {hiddenCount > 0 && <span className="text-xs" style={{ color: 'var(--ghost)' }}>{tEvents('andOthers', { count: hiddenCount })}</span>}
          </div>
        </div>

        {event.location && (
          <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px dashed rgba(255,255,255,0.12)' }}>
            {/* TODO: Integrate a map preview once venue geocoding exists. */}
            <p className="text-sm" style={{ color: 'var(--foreground)' }}>{event.location}</p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <RSVPButton
            eventId={event.id}
            galaxyId={event.galaxyId}
            initialRSVPed={event.userHasRSVPed}
            initialCount={event.rsvpCount}
            maxAttendees={event.maxAttendees}
            status={event.status}
            onChange={(state) => onRSVPChange?.(event.id, state)}
          />
          {event.spotsRemaining !== null && (
            <span className="text-xs" style={{ color: 'var(--ghost)' }}>{tEvents('spotsRemaining', { count: event.spotsRemaining })}</span>
          )}
        </div>

        {isAdmin && event.status === 'PENDING' && (
          <div className="mt-6 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-data-label mb-3">{tEvents('adminReview')}</p>
            {rejecting && (
              <textarea
                value={rejectionReason}
                onChange={(changeEvent) => setRejectionReason(changeEvent.target.value)}
                rows={3}
                className="mb-3 w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
                placeholder={tEvents('optionalRejectionReason')}
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }}
              />
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => review('APPROVED')} disabled={reviewing} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold" style={{ color: '#bbf7d0', background: 'rgba(34,197,94,0.13)', border: '1px solid rgba(74,222,128,0.35)' }}>
                <Check size={14} /> {t('approve')}
              </button>
              <button type="button" onClick={() => rejecting ? review('REJECTED') : setRejecting(true)} disabled={reviewing} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold" style={{ color: '#fecaca', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(248,113,113,0.32)' }}>
                <X size={14} /> {t('reject')}
              </button>
            </div>
            {reviewError && <p className="mt-3 text-xs" style={{ color: '#fca5a5' }}>{reviewError}</p>}
          </div>
        )}
      </article>
    </div>
  )
}