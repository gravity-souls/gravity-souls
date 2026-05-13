'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import EventCard from '@/components/events/EventCard'
import EventDetail from '@/components/events/EventDetail'
import SectionHeader from '@/components/ui/SectionHeader'
import type { EventCategory, GalaxyEventDetail, GalaxyEventSummary } from '@/types/event'

const CATEGORIES: ('ALL' | EventCategory)[] = ['ALL', 'MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER']
type EventListTab = 'upcoming' | 'going' | 'passed'

const TABS: { value: EventListTab; label: string; empty: string }[] = [
  { value: 'upcoming', label: 'Upcoming', empty: 'No upcoming events in your joined galaxies yet.' },
  { value: 'going', label: 'Going', empty: 'You have not RSVPed to any upcoming events yet.' },
  { value: 'passed', label: 'Passed', empty: 'No passed events in your joined galaxies yet.' },
]

export default function GalaxyEventsPage() {
  const [events, setEvents] = useState<GalaxyEventSummary[]>([])
  const [tab, setTab] = useState<EventListTab>('upcoming')
  const [category, setCategory] = useState<'ALL' | EventCategory>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<GalaxyEventDetail | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ status: tab })
    if (category !== 'ALL') params.set('category', category)
    if (search.trim()) params.set('search', search.trim())
    return params.toString()
  }, [category, search, tab])

  const currentTab = TABS.find((item) => item.value === tab) ?? TABS[0]

  useEffect(() => {
    let cancelled = false
    const requestedStatus = new URLSearchParams(window.location.search).get('status')
    if (requestedStatus === 'upcoming' || requestedStatus === 'going' || requestedStatus === 'passed') {
      Promise.resolve().then(() => {
        if (!cancelled) setTab(requestedStatus)
      })
    }
    return () => { cancelled = true }
  }, [])

  function selectTab(nextTab: EventListTab) {
    setTab(nextTab)
    const url = new URL(window.location.href)
    url.searchParams.set('status', nextTab)
    window.history.replaceState(null, '', url)
  }

  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true)
    })
    fetch(`/api/galaxies/events?${queryString}`)
      .then((res) => {
        if (res.status === 401) {
          if (!cancelled) setAuthRequired(true)
          return { events: [] }
        }
        if (!cancelled) setAuthRequired(false)
        return res.ok ? res.json() : { events: [] }
      })
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
  }, [queryString])

  async function openDetail(event: GalaxyEventSummary) {
    const res = await fetch(`/api/galaxies/${event.galaxyId}/events/${event.id}`)
    if (!res.ok) return
    const data = await res.json() as { event: GalaxyEventDetail }
    setSelectedEvent(data.event)
  }

  function applyRSVPChange(eventId: string, state: { rsvpCount: number; userHasRSVPed: boolean }) {
    setEvents((prev) => prev.map((event) => event.id === eventId ? { ...event, ...state } : event))
    setSelectedEvent((event) => event?.id === eventId ? { ...event, ...state, spotsRemaining: event.maxAttendees == null ? null : Math.max(0, event.maxAttendees - state.rsvpCount) } : event)
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-8">
        <SectionHeader
          eyebrow="Galaxies"
          level={1}
          title="Joined galaxy events"
          subtitle="Member-only events from galaxies you have joined. Use Galaxies to discover and join more."
        />

        <div className="mt-4">
          <Link href="/galaxies" className="inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', textDecoration: 'none' }}>
            Discover galaxies
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex gap-1.5 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => selectTab(item.value)}
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ color: tab === item.value ? '#fff' : 'var(--ghost)', background: tab === item.value ? 'rgba(124,58,237,0.50)' : 'transparent' }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: category === item ? '#fff' : 'var(--ghost)', background: category === item ? 'rgba(124,58,237,0.34)' : 'rgba(255,255,255,0.035)', border: category === item ? '1px solid rgba(167,139,250,0.42)' : '1px solid rgba(255,255,255,0.07)' }}>
                {item}
              </button>
            ))}
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events" className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
        </div>

        <div className="mt-6 grid gap-3">
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--ghost)' }}>Loading events...</p>
          ) : authRequired ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
              <p className="text-sm" style={{ color: 'var(--ghost)' }}>Sign in to see upcoming events from galaxies you have joined.</p>
              <Link href="/sign-in" className="mt-4 inline-flex rounded-xl px-4 py-2 text-xs font-semibold" style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)', textDecoration: 'none' }}>
                Sign in
              </Link>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
              <p className="text-sm" style={{ color: 'var(--ghost)' }}>{currentTab.empty}</p>
            </div>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} onOpen={openDetail} onRSVPChange={applyRSVPChange} />
            ))
          )}
        </div>

        <EventDetail
          event={selectedEvent}
          open={!!selectedEvent}
          isAdmin={false}
          onClose={() => setSelectedEvent(null)}
          onRSVPChange={applyRSVPChange}
        />
      </div>
    </AppShell>
  )
}