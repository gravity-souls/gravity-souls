'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'
import CreateEventForm from '@/components/events/CreateEventForm'
import EventCard from '@/components/events/EventCard'
import EventDetail from '@/components/events/EventDetail'
import PendingEventsPanel from '@/components/events/PendingEventsPanel'
import type { GalaxyEventSummary, GalaxyEventDetail } from '@/types/event'
import type { AttendanceState } from '@/components/events/RSVPButton'
function EventsTabContent({
  galaxyId,
  isAdmin,
  canPropose = true,
}: {
  galaxyId: string | null
  isAdmin: boolean
  canPropose?: boolean
}) {
  const params = useSearchParams()
  const requestedEvent = params.get('event'), requestedTab = params.get('events')
  const selectionRequest = useRef(0)
  const retryEventId = useRef<string | null>(null)
  const t = useTranslations('galaxyWorkflow'),
    te = useTranslations('eventForms'),
    old = useTranslations('galaxies')
  const [tab, setTab] = useState('upcoming'),
    [category, setCategory] = useState('ALL'),
    [search, setSearch] = useState(''),
    [events, setEvents] = useState<GalaxyEventSummary[]>([]),
    [selected, setSelected] = useState<GalaxyEventDetail | null>(null),
    [creating, setCreating] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [detailError, setDetailError] = useState(''),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [pageSize, setPageSize] = useState(20),
    [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!galaxyId) return
    let alive = true
    const request = ++selectionRequest.current
    Promise.resolve().then(() => {
      if (!alive) return
      setSelected(null); setDetailError('')
      if (requestedTab === 'pending' && isAdmin)
        setTab('pending')
    })
    const id = requestedEvent && /^[A-Za-z0-9_-]{1,128}$/.test(requestedEvent) ? requestedEvent : null
    retryEventId.current = id
    if (id)
      galaxyRequest<{ event: GalaxyEventDetail }>(
        `/api/galaxies/${galaxyId}/events/${encodeURIComponent(id)}`,
      )
        .then((data) => {
          if (alive && request === selectionRequest.current) { setSelected(data.event); setDetailError('') }
        })
        .catch((err) => {
          if (alive && request === selectionRequest.current) { setSelected(null); setDetailError(t.has(err.message) ? t(err.message) : t('failed')) }
        })
    const invalidate = () => { ++selectionRequest.current }
    return () => { alive = false; invalidate() }
  }, [galaxyId, canPropose, isAdmin, requestedEvent, requestedTab, t])
  useEffect(() => {
    if (!galaxyId || !canPropose || tab === 'pending') return
    let alive = true
    Promise.resolve().then(() => {
      if (alive) setLoading(true)
    })
    const query = new URLSearchParams({ status: tab, page: String(page) })
    if (category !== 'ALL') query.set('category', category)
    if (search.trim()) query.set('search', search.trim())
    galaxyRequest<{
      events: GalaxyEventSummary[]
      total: number
      pageSize: number
    }>(`/api/galaxies/${galaxyId}/events?${query}`)
      .then((data) => {
        if (alive) {
          setEvents(data.events)
          setTotal(data.total)
          setPageSize(data.pageSize)
          setError('')
        }
      })
      .catch((err) => {
        if (alive) { setEvents([]); setTotal(0); setError(t.has(err.message) ? t(err.message) : t('failed')) }
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [galaxyId, canPropose, tab, page, category, search, revision, t])
  useEffect(() => {
    const foreground = () => { if (document.visibilityState !== 'hidden') setRevision(v => v + 1) }
    window.addEventListener('focus', foreground)
    document.addEventListener('visibilitychange', foreground)
    return () => { window.removeEventListener('focus', foreground); document.removeEventListener('visibilitychange', foreground) }
  }, [])
  const selectedId = selected?.id
  useEffect(() => {
    if (!selectedId || !galaxyId) return
    let alive = true
    async function refresh() {
      if (document.visibilityState === 'hidden') return
      const request = ++selectionRequest.current
      retryEventId.current = selectedId!
      try {
        const data = await galaxyRequest<{ event: GalaxyEventDetail }>(`/api/galaxies/${galaxyId}/events/${encodeURIComponent(selectedId!)}`)
        if (alive && request === selectionRequest.current) { setSelected(data.event); setDetailError('') }
      } catch (err) {
        if (!alive || request !== selectionRequest.current) return
        const key = err instanceof Error ? err.message : 'failed'
        setSelected(null); setDetailError(t.has(key) ? t(key) : t('failed'))
      }
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { alive = false; window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [selectedId, galaxyId, t])
  function open(event: GalaxyEventSummary) { return openId(event.id) }
  async function openId(id: string) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return
    retryEventId.current = id
    const request = ++selectionRequest.current
    setSelected(null); setDetailError('')
    try {
      const data = await galaxyRequest<{ event: GalaxyEventDetail }>(
        `/api/galaxies/${galaxyId}/events/${encodeURIComponent(id)}`,
      )
      if (request === selectionRequest.current) { setSelected(data.event); setDetailError('') }
    } catch (err) {
      const key = err instanceof Error ? err.message : 'failed'
      if (request === selectionRequest.current) { setSelected(null); setDetailError(t.has(key) ? t(key) : t('failed')) }
    }
  }
  async function attendance(id: string, state: AttendanceState) {
    const request = selectionRequest.current
    setEvents((rows) => rows.map((e) => (e.id === id ? { ...e, ...state } : e)))
    setSelected((e) =>
      e?.id === id
        ? {
            ...e,
            ...state,
            spotsRemaining:
              e.maxAttendees == null
                ? null
                : Math.max(0, e.maxAttendees - state.rsvpCount),
          }
        : e,
    )
    try {
      const data = await galaxyRequest<{ event: GalaxyEventDetail }>(`/api/galaxies/${galaxyId}/events/${id}`)
      if (request !== selectionRequest.current) return
      setSelected(previous => previous?.id === id && previous.rsvpCount === state.rsvpCount && previous.userHasRSVPed === state.userHasRSVPed ? data.event : previous)
    } catch (err) {
      if (request !== selectionRequest.current) return
      const key = err instanceof Error ? err.message : 'failed'
      setSelected(null); setDetailError(t.has(key) ? t(key) : t('failed'))
    }
  }
  function close() {
    ++selectionRequest.current
    retryEventId.current = null
    setDetailError(''); setSelected(null)
  }
  function changed() {
    close()
    setRevision((v) => v + 1)
  }
  function retry() {
    setRevision(v => v + 1)
    if (detailError && retryEventId.current) void openId(retryEventId.current)
  }
  if (!galaxyId) return <p>{te('databaseLocked')}</p>
  if (!canPropose)
    return (
      <>
        {detailError && <p role="alert" className="text-sm text-red-300">{detailError} <button type="button" onClick={retry} className="underline">{t('retry')}</button></p>}
        <p className="rounded-xl border border-white/10 p-5 text-sm text-white/60">
          {te('joinToView')}
        </p>
        <EventDetail
          event={selected?.galaxyId === galaxyId ? selected : null}
          open={!!selected && selected.galaxyId === galaxyId}
          isAdmin={isAdmin}
          onClose={close}
          onRSVPChange={attendance}
          onStatusChange={changed}
          onUpdated={changed}
        />
      </>
    )
  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {['upcoming', 'passed', 'mine', ...(isAdmin ? ['pending'] : [])].map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTab(value)
                  setPage(1)
                }}
                className={`rounded-lg border border-white/10 px-3 py-2 text-xs ${tab === value ? 'bg-violet-600/40' : 'text-white/60'}`}
              >
                {t(
                  value === 'mine'
                    ? 'myProposals'
                    : value === 'pending'
                      ? 'reviewProposals'
                      : value,
                )}
              </button>
            ),
          )}
        </div>
        <button
          type="button"
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs"
          onClick={() => setCreating(true)}
        >
          {old('newEvent')}
        </button>
      </div>
      {(error || detailError) && (
        <p role="alert" className="text-sm text-red-300">
          {detailError || error}
          <button
            onClick={retry}
            className="ml-3 underline"
          >
            {t('retry')}
          </button>
        </p>
      )}
      {tab === 'pending' ? (
        <PendingEventsPanel
          galaxyId={galaxyId}
          enabled={isAdmin}
          onReviewed={() => setRevision((v) => v + 1)}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {[
              'ALL',
              'MEETUP',
              'ONLINE',
              'WORKSHOP',
              'STARGAZING',
              'DISCUSSION',
              'OTHER',
            ].map((value) => (
              <button
                className={`rounded-full border border-white/10 px-3 py-1 text-xs ${category === value ? 'bg-violet-600/30' : ''}`}
                key={value}
                onClick={() => {
                  setCategory(value)
                  setPage(1)
                }}
              >
                {te(`categories.${value.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <input
            className="rounded-xl border border-white/15 bg-white/5 p-3 text-sm"
            aria-label={te('searchPlaceholder')}
            placeholder={te('searchPlaceholder')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
          {loading ? (
            <p>{t('loading')}</p>
          ) : events.length ? (
            events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isProposer={tab === 'mine'}
                onOpen={open}
                onRSVPChange={attendance}
              />
            ))
          ) : (
            <p className="text-sm text-white/50">{te('emptyOrbit')}</p>
          )}
          {total > pageSize && (
            <div className="flex justify-between text-sm">
              <button
                disabled={page === 1 || loading}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('previous')}
              </button>
              <span>
                {page} / {Math.ceil(total / pageSize)}
              </span>
              <button
                disabled={page * pageSize >= total || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('next')}
              </button>
            </div>
          )}
        </>
      )}
      {creating && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={old('newEvent')}
          className="fixed inset-0 z-70 flex items-end justify-center bg-black/70 p-3 sm:items-center"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950 p-5">
            <div className="mb-5 flex justify-between">
              <h2 className="font-semibold">{old('newEvent')}</h2>
              <button
                onClick={() => setCreating(false)}
                aria-label={t('close')}
              >
                ×
              </button>
            </div>
            <CreateEventForm
              galaxyId={galaxyId}
              onCreated={() => {
                setCreating(false)
                setTab('mine')
                setPage(1)
                setRevision((v) => v + 1)
              }}
            />
          </div>
        </div>
      )}
      <EventDetail
        event={selected?.galaxyId === galaxyId ? selected : null}
        open={!!selected && selected.galaxyId === galaxyId}
        isAdmin={isAdmin}
        onClose={close}
        onRSVPChange={attendance}
        onStatusChange={changed}
        onUpdated={changed}
      />
    </section>
  )
}


export default function EventsTab(props: { galaxyId: string | null; isAdmin: boolean; canPropose?: boolean }) {
  return <Suspense><EventsTabContent {...props} /></Suspense>
}
