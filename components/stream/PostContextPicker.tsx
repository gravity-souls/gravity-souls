'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarDays, ChevronDown, Orbit, Search } from 'lucide-react'
export type ContextValue = { galaxyId: string | null; eventId: string | null }
function Options({ kind, galaxyId, value, onSelect }: { kind: 'galaxies' | 'events'; galaxyId?: string; value: string | null; onSelect: (id: string | null) => void }) {
  const t = useTranslations('postContext')
  const [options, setOptions] = useState<{ id: string; name?: string; title?: string }[]>([])
  const [search, setSearch] = useState(''), [page, setPage] = useState(1), [more, setMore] = useState(false), [busy, setBusy] = useState(true), [error, setError] = useState(false), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => { if (!cancelled) setBusy(true) })
    const query = new URLSearchParams({ kind, search, page: String(page) })
    if (galaxyId) query.set('galaxyId', galaxyId)
    fetch(`/api/posts/context?${query}`, { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('failed')
      const data = await response.json()
      if (!cancelled) { setOptions(data.options); setMore(data.more); setError(false) }
    }).catch(() => { if (!cancelled) setError(true) }).finally(() => { if (!cancelled) setBusy(false) })
    return () => { cancelled = true }
  }, [kind, galaxyId, search, page, revision])
  return <div className="flex min-w-0 flex-col gap-2">
    <div className="text-xs text-white/60"><p className="mb-2 flex items-center gap-2 text-violet-200/80">{kind === 'galaxies' ? <Orbit size={14} aria-hidden="true" /> : <CalendarDays size={14} aria-hidden="true" />}{t(kind)}</p>
      <div className="relative">
        <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-white/30" />
        <input aria-label={t(kind === 'galaxies' ? 'searchGalaxy' : 'searchEvent')} placeholder={t('search')} maxLength={80} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className="w-full rounded-t-xl border border-b-0 border-white/8 bg-white/[0.025] py-2.5 pl-9 pr-3 text-xs text-white/80 outline-none placeholder:text-white/25 focus:border-violet-300/30" />
      </div>
      <div className="relative">
      <select aria-label={t(kind)} value={value ?? ''} disabled={busy || error} onChange={event => onSelect(event.target.value || null)} className="w-full appearance-none rounded-b-xl border border-white/8 bg-[#101225] px-3 py-3 pr-9 text-sm text-violet-100 outline-none focus:border-violet-300/40 focus:ring-1 focus:ring-violet-300/20 disabled:opacity-50">
        <option value="">{t('none')}</option>
        {value && !options.some(option => option.id === value) && <option value={value}>{t('selected')}</option>}
        {options.map(option => <option key={option.id} value={option.id}>{option.name ?? option.title}</option>)}
      </select>
      <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-3.5 text-violet-200/50" />
      </div>
    </div>
    {busy && <span role="status" className="text-xs text-white/40">{t('loading')}</span>}
    {error && <span role="alert" className="text-xs text-red-300">{t('failed')} <button type="button" className="underline" onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></span>}
    {(page > 1 || more) && <div className="flex justify-between text-xs text-violet-200"><button type="button" disabled={busy || page === 1} onClick={() => setPage(p => p - 1)}>{t('previous')}</button><span>{page}</span><button type="button" disabled={busy || !more} onClick={() => setPage(p => p + 1)}>{t('next')}</button></div>}
  </div>
}
export default function PostContextPicker({ value, onChange }: { value: ContextValue; onChange: (value: ContextValue) => void }) {
  const t = useTranslations('postContext')
  return <fieldset className="my-5 min-w-0 border-t border-white/8 pt-4">
    <legend className="pr-3 text-[11px] font-medium tracking-wide text-violet-200/70">{t('optional')}</legend>
    <div className={`grid gap-3 ${value.galaxyId ? 'sm:grid-cols-2' : ''}`}>
      <Options kind="galaxies" value={value.galaxyId} onSelect={galaxyId => onChange({ galaxyId, eventId: null })} />
      {value.galaxyId && <Options key={value.galaxyId} kind="events" galaxyId={value.galaxyId} value={value.eventId} onSelect={eventId => onChange({ ...value, eventId })} />}
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
      <p className="max-w-md text-[11px] leading-relaxed text-white/40">{t(value.galaxyId || value.eventId ? 'memberAudience' : 'publicAudience')}</p>
      {(value.galaxyId || value.eventId) && <button type="button" className="rounded-full px-2 py-1 text-[11px] text-violet-200/70 transition-colors hover:bg-white/5 hover:text-violet-100 focus-visible:outline-2 focus-visible:outline-violet-300" onClick={() => onChange({ galaxyId: null, eventId: null })}>{t('clear')}</button>}
    </div>
  </fieldset>
}
