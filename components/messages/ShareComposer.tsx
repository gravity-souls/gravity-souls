'use client'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Share2, X } from 'lucide-react'
import { SHARE_KINDS, type SharedCard, type ShareKind, type ShareSelection } from '@/lib/chat-share-types'
export default function ShareComposer({ conversationId, disabled, onSend }: { conversationId: string; disabled: boolean; onSend: (selection: ShareSelection) => Promise<boolean> }) {
  const t = useTranslations('chatShares')
  const [open, setOpen] = useState(false), [kind, setKind] = useState<ShareKind>('planet'), [search, setSearch] = useState('')
  const [options, setOptions] = useState<Extract<SharedCard, { available: true }>[]>([]), [cursor, setCursor] = useState<string | null>(null)
  const [selected, setSelected] = useState<Extract<SharedCard, { available: true }> | null>(null)
  const [loading, setLoading] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const generation = useRef(0), sending = useRef(false), toggle = useRef<HTMLButtonElement>(null)
  const locked = disabled || busy
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    const current = ++generation.current
    const timer = setTimeout(async () => {
      setLoading(true); setOptions([]); setCursor(null)
      try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/share-options?${new URLSearchParams({ kind, search })}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (!controller.signal.aborted && current === generation.current) { setOptions(data.options); setCursor(data.nextCursor); setError('') }
      } catch { if (!controller.signal.aborted && current === generation.current) setError('loadFailed') }
      finally { if (!controller.signal.aborted && current === generation.current) setLoading(false) }
    }, 200)
    return () => { controller.abort(); clearTimeout(timer) }
  }, [open, kind, search, conversationId, revision])
  async function more() {
    if (!cursor || loading) return
    const current = ++generation.current
    setLoading(true)
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/share-options?${new URLSearchParams({ kind, search, cursor })}`, { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const data = await response.json()
      if (current === generation.current) { setOptions(previous => [...new Map([...previous, ...data.options].map(card => [card.id, card])).values()]); setCursor(data.nextCursor); setError('') }
    } catch { if (current === generation.current) setError('loadFailed') }
    finally { if (current === generation.current) setLoading(false) }
  }
  async function send() {
    if (!selected || locked || sending.current) return
    sending.current = true; setBusy(true); setError('')
    try {
      if (await onSend({ kind: selected.kind, targetId: selected.id })) { setSelected(null); setOpen(false); toggle.current?.focus() }
      else setError('sendFailed')
    } catch { setError('sendFailed') }
    finally { sending.current = false; setBusy(false) }
  }
  function reset() { generation.current++; setSelected(null); setOptions([]); setCursor(null); setError(''); setLoading(true) }
  return <div className="shrink-0 border-t border-white/10 px-4 py-2" onKeyDown={event => { if (event.key === 'Escape' && open && !busy) { generation.current++; setOpen(false); toggle.current?.focus() } }}>
    <button ref={toggle} type="button" disabled={locked} aria-expanded={open} onClick={() => { generation.current++; setOpen(value => !value) }} className="flex min-h-10 items-center gap-2 text-xs text-violet-200 disabled:opacity-40"><Share2 size={16} />{t('share')}</button>
    {open && <section aria-label={t('picker')} className="grid max-h-[40dvh] gap-3 overflow-y-auto rounded-xl border border-white/15 bg-[#14112b] p-3">
      <div className="flex items-center justify-between"><h2 className="text-sm text-violet-100">{t('picker')}</h2><button type="button" disabled={busy} aria-label={t('close')} onClick={() => { generation.current++; setOpen(false); toggle.current?.focus() }} className="p-2"><X size={16} /></button></div>
      <p className="text-xs text-white/60">{t('explanation')}</p>
      <nav aria-label={t('kinds')} className="flex gap-4">{SHARE_KINDS.map(value => <button key={value} type="button" disabled={locked} aria-pressed={kind === value} onClick={() => { if (value !== kind) { reset(); setKind(value) } }} className="min-h-10 text-sm text-violet-200">{t(value)}</button>)}</nav>
      <input type="search" value={search} maxLength={80} disabled={locked} aria-label={t('search')} placeholder={t('search')} onChange={event => { reset(); setSearch(event.target.value) }} className="rounded-lg border border-white/15 bg-transparent p-2 text-sm text-white" />
      {loading && <p className="text-xs text-white/60">{t('loading')}</p>}
      {!loading && !options.length && !error && <p className="text-xs text-white/60">{t('empty')}</p>}
      {options.map(card => <button key={card.id} type="button" disabled={locked} aria-pressed={selected?.id === card.id && selected.kind === card.kind} onClick={() => { setSelected(card); setError('') }} className="rounded-lg border border-white/15 p-3 text-left text-sm text-white [overflow-wrap:anywhere] aria-pressed:bg-violet-400/20">{card.title}</button>)}
      {cursor && <button type="button" disabled={loading || locked} onClick={() => void more()} className="text-sm text-violet-200">{t('more')}</button>}
      {selected && <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3"><span className="min-w-0 break-words text-sm text-white">{t('selected', { title: selected.title })}</span><button type="button" disabled={locked} onClick={() => void send()} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-sm text-white disabled:opacity-40">{t(busy ? 'sending' : 'send')}</button></div>}
      {error && <p role="alert" className="text-xs text-rose-200">{t(error)}{error === 'loadFailed' && <button type="button" onClick={() => { reset(); setRevision(value => value + 1) }} className="ml-2 underline">{t('retry')}</button>}</p>}
    </section>}
  </div>
}
