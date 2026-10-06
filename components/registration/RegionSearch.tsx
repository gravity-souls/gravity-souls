'use client'
import { useEffect, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { RegionSuggestion } from '@/lib/region-search'
import { searchableRegionQuery } from '@/lib/region-aliases'

export default function RegionSearch({ value, onChange, label, className = '', placeholder }: { value: string; onChange: (value: string) => void; label: string; className?: string; placeholder?: string }) {
  const t = useTranslations('onboardingRefinements'), id = useId()
  const [query, setQuery] = useState(value), [open, setOpen] = useState(false)
  const [results, setResults] = useState<RegionSuggestion[]>([]), [state, setState] = useState<'idle'|'loading'|'ready'|'error'>('idle')
  const [active, setActive] = useState(-1)
  // A parent reset must also clear the search text.
  useEffect(() => { setQuery(value) }, [value])
  useEffect(() => {
    if (!open || !searchableRegionQuery(query.trim())) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setState('loading'); setResults([]); setActive(-1)
      try {
        const response = await fetch(`/api/regions?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        if (!response.ok) throw new Error('search')
        const data = await response.json()
        if (!controller.signal.aborted) { setResults(data.suggestions || []); setState('ready') }
      } catch { if (!controller.signal.aborted) setState('error') }
    },500)
    return () => { clearTimeout(timer); controller.abort() }
  },[query,open])
  function choose(item: RegionSuggestion) { onChange(item.value); setQuery(item.value); setOpen(false); setResults([]); setActive(-1) }
  return <div className={`relative grid gap-2 ${className}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <label htmlFor={id} className="text-sm">{label}</label>
    <div className="flex gap-2">
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && results.length > 0} aria-controls={`${id}-results`} aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined} autoComplete="off" value={query} maxLength={100} placeholder={placeholder || t('citySearch')} onFocus={() => setOpen(true)} onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); setResults([]); setState('idle'); setActive(-1) }} onKeyDown={e => {
        if (e.key === 'Escape') { setOpen(false); setActive(-1) }
        if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setActive(i => (i+1)%results.length) }
        if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive(i => (i-1+results.length)%results.length) }
        if (e.key === 'Enter' && active >= 0 && results[active]) { e.preventDefault(); choose(results[active]) }
      }} className="min-h-12 min-w-0 w-full rounded-xl border border-white/15 bg-white/5 px-3 text-base" />
      {!!query && <button type="button" aria-label={t('clearRegion')} onClick={() => { setQuery(''); onChange(''); setOpen(false); setResults([]) }} className="min-h-11 min-w-11 rounded-xl border border-white/15">×</button>}
    </div>
    {open && searchableRegionQuery(query.trim()) && <div className="rounded-xl border border-violet-300/30 bg-slate-950 p-2 text-sm">
      <ul id={`${id}-results`} role="listbox" aria-label={label}>{results.map((item,i) => <li key={item.value} id={`${id}-${i}`} role="option" aria-selected={i === active}><button type="button" onMouseDown={e => e.preventDefault()} onClick={() => choose(item)} className={`min-h-12 w-full rounded-lg px-3 text-left ${i === active ? 'bg-violet-400/20' : 'hover:bg-white/10'}`}>{item.label}</button></li>)}</ul>
      <p role="status" className="px-3 py-2 text-xs opacity-60">{state === 'loading' ? t('searching') : state === 'error' ? t('regionUnavailable') : state === 'ready' && !results.length ? t('noCities') : t('chooseCity')}</p>
    </div>}
  </div>
}
