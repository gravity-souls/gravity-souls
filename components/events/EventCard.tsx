'use client'

/* eslint-disable @next/next/no-img-element */

import { CalendarDays, MapPin, Monitor, Users } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import RSVPButton from '@/components/events/RSVPButton'
import InterestButton from '@/components/events/InterestButton'
import type { GalaxyEventSummary } from '@/types/event'

const CATEGORY_GRADIENTS: Record<GalaxyEventSummary['category'], string> = {
  MEETUP: 'linear-gradient(135deg, rgba(251,146,60,0.34), rgba(124,58,237,0.18))',
  ONLINE: 'linear-gradient(135deg, rgba(96,165,250,0.34), rgba(52,211,153,0.16))',
  WORKSHOP: 'linear-gradient(135deg, rgba(167,139,250,0.34), rgba(236,72,153,0.16))',
  STARGAZING: 'linear-gradient(135deg, rgba(99,102,241,0.34), rgba(15,23,42,0.7))',
  DISCUSSION: 'linear-gradient(135deg, rgba(52,211,153,0.26), rgba(167,139,250,0.18))',
  OTHER: 'linear-gradient(135deg, rgba(148,163,184,0.26), rgba(99,102,241,0.16))',
}

function formatEventDate(value: string, locale: string) {
  const date = new Date(value)
  const day = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(date)
  const time = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)

  return `${day} · ${time}`
}

interface EventCardProps {
  event: GalaxyEventSummary
  isProposer?: boolean
  compact?: boolean
  onOpen?: (event: GalaxyEventSummary) => void
  onRSVPChange?: (eventId: string, state: { rsvpCount: number; userHasRSVPed: boolean }) => void
}

export default function EventCard({ event, isProposer = false, compact = false, onOpen, onRSVPChange }: EventCardProps) {
  const t = useTranslations('galaxyWorkflow'), te = useTranslations('eventForms'), locale = useLocale()
  const spotsLeft = event.maxAttendees == null ? null : Math.max(0, event.maxAttendees - event.rsvpCount)
  const isPassed = event.status === 'PASSED'
  const showPending = event.status === 'PENDING' && isProposer

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(event)}
      onKeyDown={(eventKey) => {
        if (eventKey.target === eventKey.currentTarget && (eventKey.key === 'Enter' || eventKey.key === ' ')) { eventKey.preventDefault(); onOpen?.(event) }
      }}
      className="group grid gap-4 rounded-2xl p-3 text-left transition-all duration-200 sm:grid-cols-[148px_1fr]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', cursor: onOpen ? 'pointer' : 'default' }}
    >
      <div
        className="relative min-h-34 overflow-hidden rounded-xl"
        style={{ background: CATEGORY_GRADIENTS[event.category] }}
      >
        {event.coverImage ? (
          <img src={event.coverImage} alt="" className="h-full min-h-34 w-full object-cover" />
        ) : (
          <div className="flex h-full min-h-34 items-center justify-center text-3xl" style={{ color: 'rgba(255,255,255,0.74)' }}>
            ✦
          </div>
        )}
        <span
          className="absolute left-3 top-3 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ background: 'rgba(3,3,15,0.64)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {te(`categories.${event.category.toLowerCase()}`)}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--foreground)' }}>
              {event.title}
            </h3>
            {event.galaxy && (
              <p className="mt-1 text-[11px]" style={{ color: event.galaxy.accentColor }}>
                {event.galaxy.name}
              </p>
            )}
          </div>
          {showPending && (
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ color: '#fde68a', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.28)' }}>
              {t('pending')}
            </span>
          )}
          {event.status === 'REJECTED' && <span className="text-xs text-red-300">{t('rejected')}</span>}
          {event.status === 'CANCELLED' && <span className="text-xs text-white/50">{t('cancelled')}</span>}
          {isPassed && (
            <span className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.48)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {t('passed')}
            </span>
          )}
        </div>

        {!compact && (
          <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.72 }}>
            {event.description}
          </p>
        )}

        <div className="grid gap-2 text-xs" style={{ color: 'var(--ghost)' }}>
          <span className="flex items-center gap-2">
            <CalendarDays size={14} />
            {formatEventDate(event.date, locale)}
          </span>
          <span className="flex items-center gap-2">
            {event.onlineUrl || event.category === 'ONLINE' ? <Monitor size={14} /> : <MapPin size={14} />}
            {event.location || te('online')}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2 text-xs" style={{ color: 'var(--ghost)' }}>
            <Users size={14} />
            {t('goingCount', { count: event.rsvpCount })}{spotsLeft !== null ? ` · ${te('spotsRemaining', { count: spotsLeft })}` : ''}
          </span>
          <span className="flex flex-wrap gap-2" onClick={(clickEvent) => clickEvent.stopPropagation()}>
            {event.status !== 'PENDING' && event.status !== 'REJECTED' && <InterestButton event={event} />}
            <RSVPButton
              eventId={event.id}
              galaxyId={event.galaxyId}
              initialRSVPed={event.userHasRSVPed}
              initialCount={event.rsvpCount}
              initialAttendance={event.userAttendance}
              requiresApproval={event.requiresApproval}
              maxAttendees={event.maxAttendees}
              status={event.status}
              onChange={(state) => onRSVPChange?.(event.id, state)}
            />
          </span>
        </div>
      </div>
    </article>
  )
}