'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
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
  return <div className="flex flex-col gap-2">
    <div className="text-xs text-white/60"><p>{t(kind)}</p>
      <input aria-label={t(kind === 'galaxies' ? 'searchGalaxy' : 'searchEvent')} placeholder={t('search')} maxLength={80} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 p-2" />
      <select aria-label={t(kind)} value={value ?? ''} disabled={busy || error} onChange={event => onSelect(event.target.value || null)} className="mt-2 w-full rounded-lg border border-white/10 bg-[#11152a] p-2">
        <option value="">{t('none')}</option>
        {value && !options.some(option => option.id === value) && <option value={value}>{t('selected')}</option>}
        {options.map(option => <option key={option.id} value={option.id}>{option.name ?? option.title}</option>)}
      </select>
    </div>
    {busy && <span role="status" className="text-xs text-white/40">{t('loading')}</span>}
    {error && <span role="alert" className="text-xs text-red-300">{t('failed')} <button type="button" className="underline" onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></span>}
    {(page > 1 || more) && <div className="flex justify-between text-xs text-violet-200"><button type="button" disabled={busy || page === 1} onClick={() => setPage(p => p - 1)}>{t('previous')}</button><span>{page}</span><button type="button" disabled={busy || !more} onClick={() => setPage(p => p + 1)}>{t('next')}</button></div>}
  </div>
}
export default function PostContextPicker({ value, onChange }: { value: ContextValue; onChange: (value: ContextValue) => void }) {
  const t = useTranslations('postContext')
  return <fieldset className="my-4 rounded-xl border border-white/10 p-4">
    <legend className="px-2 text-sm text-violet-200">{t('optional')}</legend>
    <p className="mb-3 text-xs text-white/50">{t(value.galaxyId || value.eventId ? 'memberAudience' : 'publicAudience')}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <Options kind="galaxies" value={value.galaxyId} onSelect={galaxyId => onChange({ galaxyId, eventId: null })} />
      {value.galaxyId && <Options key={value.galaxyId} kind="events" galaxyId={value.galaxyId} value={value.eventId} onSelect={eventId => onChange({ ...value, eventId })} />}
    </div>
    {(value.galaxyId || value.eventId) && <button type="button" className="mt-3 text-xs text-violet-200 underline" onClick={() => onChange({ galaxyId: null, eventId: null })}>{t('clear')}</button>}
  </fieldset>
}
