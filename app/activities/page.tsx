'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import EventCard from '@/components/events/EventCard'
import EventDetail from '@/components/events/EventDetail'
import type { AttendanceState } from '@/components/events/RSVPButton'
import SectionHeader from '@/components/ui/SectionHeader'
import type { EventCategory, GalaxyEventDetail, GalaxyEventSummary } from '@/types/event'

const CATEGORIES: ('ALL' | EventCategory)[] = ['ALL', 'MEETUP', 'ONLINE', 'WORKSHOP', 'STARGAZING', 'DISCUSSION', 'OTHER']
type EventListTab = 'upcoming' | 'going' | 'passed' | 'mine' | 'requests' | 'interested'

const TABS: { value: EventListTab; labelKey: string; emptyKey: string }[] = [
  { value: 'upcoming', labelKey: 'tabs.upcoming', emptyKey: 'emptyUpcoming' },
  { value: 'interested', labelKey: 'tabs.interested', emptyKey: 'emptyInterested' },
  { value: 'going', labelKey: 'tabs.going', emptyKey: 'emptyGoing' },
  { value: 'mine', labelKey: 'tabs.mine', emptyKey: 'emptyMine' },
  { value: 'requests', labelKey: 'tabs.requests', emptyKey: 'emptyRequests' },
  { value: 'passed', labelKey: 'tabs.passed', emptyKey: 'emptyPassed' },
]

export default function GalaxyEventsPage() {
  const tw = useTranslations('galaxyWorkflow')
  const [page,setPage] = useState(1), [total,setTotal] = useState(0), [pageSize,setPageSize] = useState(20), [error,setError] = useState(''), [selectedAdmin,setSelectedAdmin] = useState(false), [revision,setRevision] = useState(0)
  const t = useTranslations('eventsPage')
  const tAuth = useTranslations('auth')
  const [events, setEvents] = useState<GalaxyEventSummary[]>([])
  const [tab, setTab] = useState<EventListTab>('upcoming')
  const [category, setCategory] = useState<'ALL' | EventCategory>('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [authRequired, setAuthRequired] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<GalaxyEventDetail | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ status: tab, page: String(page) })
    if (category !== 'ALL') params.set('category', category)
    if (search.trim()) params.set('search', search.trim())
    return params.toString()
  }, [category, search, tab, page])

  const currentTab = TABS.find((item) => item.value === tab) ?? TABS[0]

  useEffect(() => {
    let cancelled = false
    const requestedStatus = new URLSearchParams(window.location.search).get('status')
    if (requestedStatus === 'upcoming' || requestedStatus === 'going' || requestedStatus === 'passed' || requestedStatus === 'mine' || requestedStatus === 'requests' || requestedStatus === 'interested') {
      Promise.resolve().then(() => {
        if (!cancelled) setTab(requestedStatus)
      })
    }
    return () => { cancelled = true }
  }, [])

  function selectTab(nextTab: EventListTab) {
    setTab(nextTab)
    setPage(1)
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
        if (!res.ok) throw new Error('failed')
        return res.json()
      })
      .then((data: { events?: GalaxyEventSummary[]; total?: number; pageSize?: number }) => {
        if (!cancelled) { setEvents(data.events ?? []);setTotal(data.total??0);setPageSize(data.pageSize??20);setPage(p=>Math.min(p,Math.max(1,Math.ceil((data.total??0)/(data.pageSize??20)))));setError('') }
      })
      .catch(() => {
        if (!cancelled) setError(tw('failed'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [queryString,revision,tw])

  useEffect(() => {
    function sync(change: Event) {
      const { eventId, interested } = (change as CustomEvent<{ eventId: string; interested: boolean }>).detail
      setEvents(previous => previous.map(event => event.id === eventId ? { ...event, userInterested: interested } : event))
      setSelectedEvent(previous => previous?.id === eventId ? { ...previous, userInterested: interested } : previous)
      // Fetch again so pagination, empty state and totals stay correct after removal.
      if (tab === 'interested' && !interested) setRevision(value => value + 1)
    }
    window.addEventListener('event-interest:changed', sync)
    return () => window.removeEventListener('event-interest:changed', sync)
  }, [tab])

  async function openDetail(event: GalaxyEventSummary) {
    try {
    const res = await fetch(`/api/galaxies/${event.galaxyId}/events/${event.id}`)
    if (!res.ok) { setError(tw('failed'));return }
    const data = await res.json() as { event: GalaxyEventDetail; isAdmin?: boolean }
    setSelectedEvent(data.event)
    setSelectedAdmin(data.isAdmin ?? false)
    } catch { setError(tw('failed')) }
  }

  async function applyRSVPChange(eventId: string, state: AttendanceState) {
    setEvents((prev) => prev.map((event) => event.id === eventId ? { ...event, ...state } : event))
    setSelectedEvent((event) => event?.id === eventId ? { ...event, ...state, spotsRemaining: event.maxAttendees == null ? null : Math.max(0, event.maxAttendees - state.rsvpCount) } : event)
    const summary = events.find(event => event.id === eventId)
    if (!summary) return
    try {
      const response = await fetch(`/api/galaxies/${summary.galaxyId}/events/${eventId}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('failed')
      const data = await response.json() as { event: GalaxyEventDetail }
      setSelectedEvent(previous => previous?.id === eventId && previous.rsvpCount === state.rsvpCount && previous.userHasRSVPed === state.userHasRSVPed ? data.event : previous)
    } catch { setError(tw('failed')) }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-8">
        <SectionHeader
          eyebrow={t('eyebrow')}
          level={1}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="mt-4">
          <Link href="/galaxies" className="inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: 'var(--star)', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.18)', textDecoration: 'none' }}>
            {t('discoverGalaxies')}
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5 rounded-2xl p-1" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.07)' }}>
            {TABS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={tab === item.value}
                onClick={() => selectTab(item.value)}
                className="rounded-xl px-3 py-2 text-xs font-semibold"
                style={{ color: tab === item.value ? '#fff' : 'var(--ghost)', background: tab === item.value ? 'rgba(124,58,237,0.50)' : 'transparent' }}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => (
              <button key={item} type="button" onClick={() => {setCategory(item);setPage(1)}} className="rounded-full px-3 py-1.5 text-[11px] font-semibold" style={{ color: category === item ? '#fff' : 'var(--ghost)', background: category === item ? 'rgba(124,58,237,0.34)' : 'rgba(255,255,255,0.035)', border: category === item ? '1px solid rgba(167,139,250,0.42)' : '1px solid rgba(255,255,255,0.07)' }}>
                {t(`categories.${item.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <input aria-label={t('searchPlaceholder')} maxLength={80} value={search} onChange={(event) => {setSearch(event.target.value);setPage(1)}} placeholder={t('searchPlaceholder')} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--foreground)' }} />
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}<button className="ml-3 underline" onClick={()=>setRevision(v=>v+1)}>{tw('retry')}</button></p>}
        <div className="mt-6 grid gap-3">
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--ghost)' }}>{t('loading')}</p>
          ) : authRequired ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
              <p className="text-sm" style={{ color: 'var(--ghost)' }}>{t('signInRequired')}</p>
              <Link href="/sign-in" className="mt-4 inline-flex rounded-xl px-4 py-2 text-xs font-semibold" style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)', textDecoration: 'none' }}>
                {tAuth('signIn')}
              </Link>
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)' }}>
              <p className="text-sm" style={{ color: 'var(--ghost)' }}>{t(currentTab.emptyKey)}</p>
            </div>
          ) : (
            events.map((event) => (
              <EventCard key={event.id} event={event} isProposer={tab==='mine'} onOpen={openDetail} onRSVPChange={applyRSVPChange} />
            ))
          )}
        </div>

        {total>pageSize && <div className="mt-5 flex justify-between text-sm"><button disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>{tw('previous')}</button><span>{page} / {Math.ceil(total/pageSize)}</span><button disabled={page*pageSize>=total||loading} onClick={()=>setPage(p=>p+1)}>{tw('next')}</button></div>}
        <EventDetail
          event={selectedEvent}
          open={!!selectedEvent}
          isAdmin={selectedAdmin}
          onUpdated={()=>setRevision(v=>v+1)}
          onStatusChange={()=>{setSelectedEvent(null);setRevision(v=>v+1)}}
          onClose={() => setSelectedEvent(null)}
          onRSVPChange={applyRSVPChange}
        />
      </div>
    </AppShell>
  )
}