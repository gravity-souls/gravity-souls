'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import CreateEventForm from '@/components/events/CreateEventForm'
import EventCard from '@/components/events/EventCard'
import EventDetail from '@/components/events/EventDetail'
import PendingEventsPanel from '@/components/events/PendingEventsPanel'
import type { EventCategory, GalaxyEventDetail, GalaxyEventSummary } from '@/types/event'

const CATEGORIES: ('ALL' | EventCategory)[] = ['ALL', 'MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER']
type Tab = 'upcoming' | 'passed' | 'proposed'

interface EventsTabProps {
  galaxyId: string | null
  isAdmin: boolean
  canPropose?: boolean
}

export default function EventsTab({ galaxyId, isAdmin, canPropose = true }: EventsTabProps) {
  const t = useTranslations('galaxies')
  const tEvents = useTranslations('eventForms')
  const tCommon = useTranslations('common')
  const [tab, setTab] = useState<Tab>('upcoming')
  const [category, setCategory] = useState<'ALL' | EventCategory>('ALL')
  const [search, setSearch] = useState('')
  const [events, setEvents] = useState<GalaxyEventSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<GalaxyEventDetail | null>(null)

  const listStatus = tab === 'passed' ? 'passed' : 'upcoming'
  const queryString = useMemo(() => {
    const params = new URLSearchParams({ status: listStatus })
    if (category !== 'ALL') params.set('category', category)
    if (search.trim()) params.set('search', search.trim())
    return params.toString()
  }, [category, listStatus, search])

  useEffect(() => {
    if (!galaxyId || !canPropose || tab === 'proposed') return
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true)
    })
    fetch(`/api/galaxies/${galaxyId}/events?${queryString}`)
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
  }, [canPropose, galaxyId, queryString, tab])

  async function openDetail(event: GalaxyEventSummary) {
    if (!galaxyId) return
    const res = await fetch(`/api/galaxies/${galaxyId}/events/${event.id}`)
    if (!res.ok) return
    const data = await res.json() as { event: GalaxyEventDetail; isAdmin?: boolean }
    setSelectedEvent(data.event)
    setDetailOpen(true)
  }

  function applyRSVPChange(eventId: string, state: { rsvpCount: number; userHasRSVPed: boolean }) {
    setEvents((prev) => prev.map((event) => event.id === eventId ? { ...event, ...state } : event))
    setSelectedEvent((event) => event?.id === eventId ? { ...event, ...state, spotsRemaining: event.maxAttendees == null ? null : Math.max(0, event.maxAttendees - state.rsvpCount) } : event)
  }

  if (!galaxyId) {
    return (
      <section className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
        <p className="text-sm" style={{ color: 'var(--ghost)' }}>{tEvents('databaseLocked')}</p>
      </section>
    )
  }

  if (!canPropose) {
    return (
      <section className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
        <p className="text-sm" style={{ color: 'var(--ghost)' }}>{tEvents('joinToView')}</p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1.5 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['upcoming', 'passed'] as Tab[]).concat(isAdmin ? ['proposed'] : []).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className="rounded-xl px-3 py-2 text-xs font-semibold capitalize"
              style={{ color: tab === item ? '#fff' : 'var(--ghost)', background: tab === item ? 'rgba(124,58,237,0.50)' : 'transparent' }}
            >
              {item === 'proposed' ? t('proposed') : item === 'passed' ? t('passed') : t('upcoming')}
            </button>
          ))}
        </div>
        {canPropose && (
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold" style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)' }}>
            <Plus size={14} /> {t('newEvent')}
          </button>
        )}
      </div>

      {tab !== 'proposed' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: category === item ? '#fff' : 'var(--ghost)', background: category === item ? 'rgba(124,58,237,0.34)' : 'rgba(255,255,255,0.035)', border: category === item ? '1px solid rgba(167,139,250,0.42)' : '1px solid rgba(255,255,255,0.07)' }}>
                {tEvents(`categories.${item.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <label className="relative block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ghost)' }} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tEvents('searchPlaceholder')} className="w-full rounded-xl py-2.5 pl-9 pr-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
          </label>
        </div>
      )}

      {tab === 'proposed' ? (
        <PendingEventsPanel galaxyId={galaxyId} enabled={isAdmin} />
      ) : loading ? (
        <p className="text-sm" style={{ color: 'var(--ghost)' }}>{tCommon('loading')}</p>
      ) : events.length === 0 ? (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
          <p className="text-sm" style={{ color: 'var(--ghost)' }}>{tEvents('emptyOrbit')}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} onOpen={openDetail} onRSVPChange={applyRSVPChange} />
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-70 flex items-end justify-center bg-black/68 px-0 backdrop-blur-md sm:items-center sm:px-6" role="dialog" aria-modal="true" aria-label={t('newEvent')}>
          <button type="button" className="absolute inset-0 cursor-default" onClick={() => setCreateOpen(false)} aria-label={tEvents('closeEventForm')} />
          <div className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl p-5 sm:max-w-xl sm:rounded-2xl sm:p-6" style={{ background: 'rgba(8,10,28,0.96)', border: '1px solid var(--border-soft)' }}>
            <button type="button" onClick={() => setCreateOpen(false)} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ghost)', border: '1px solid rgba(255,255,255,0.08)' }} aria-label={tEvents('close')}>
              <X size={16} />
            </button>
            <div className="mb-5 pr-10">
              <p className="text-eyebrow mb-2">{tEvents('galaxyEvent')}</p>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>{t('newEvent')}</h2>
            </div>
            <CreateEventForm
              galaxyId={galaxyId}
              onCreated={(event) => {
                if (event.status === 'APPROVED') setEvents((prev) => [event, ...prev])
              }}
            />
          </div>
        </div>
      )}

      <EventDetail
        event={selectedEvent}
        open={detailOpen}
        isAdmin={isAdmin}
        onClose={() => setDetailOpen(false)}
        onRSVPChange={applyRSVPChange}
        onStatusChange={(eventId) => {
          setEvents((prev) => prev.filter((event) => event.id !== eventId))
        }}
      />
    </section>
  )
}