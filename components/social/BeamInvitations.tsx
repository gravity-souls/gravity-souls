'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { INBOX_CHANGED, notifyInboxChanged } from '@/lib/inbox-client'
import type { PlanetConfig } from '@/types/planet'
import { withExplorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'

type Direction = 'received' | 'sent'
type Row = { id: string; status: string; createdAt: string; otherUser: { id: string; name: string }; planet: { id: string; name: string; planetConfig?: PlanetConfig | null } | null; conversationId: string | null }
export function BeamInvitationCard({ row, direction, busy = null, selected = false, onAction, origin }: { row: Row; direction: Direction; busy?: string | null; selected?: boolean; onAction: (id: string, action: string) => void; origin?: ExplorationOrigin | null }) {
  const t = useTranslations('beamInvitations'), locale = useLocale()
  return <article aria-label={row.planet?.name ?? row.otherUser.name} className={`grid gap-2 rounded-xl p-3 ${selected ? 'bg-violet-400/10' : 'bg-white/5'}`}>
      <div className="flex items-center gap-3">{row.planet ? <PlanetAvatar planetConfig={row.planet.planetConfig ?? undefined} size={32} /> : <span className="text-white/50" aria-hidden="true">?</span>}<span>{row.planet?.name ?? row.otherUser.name}</span></div>
      <p className="text-xs text-white/60">{t.has(row.status) ? t(row.status) : t('unavailable')} · {new Date(row.createdAt).toLocaleDateString(locale)}</p>
      <div className="flex flex-wrap gap-3">
        {row.planet && <Link href={withExplorationOrigin(`/planet/${row.planet.id}`, origin)} className="text-xs text-violet-200 underline">{t('viewPlanet')}</Link>}
        {row.status === 'PENDING' && (direction === 'received' ? ['accept', 'reject'] : ['cancel']).map(action => <button key={action} type="button" disabled={busy !== null} onClick={() => onAction(row.id, action)} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-violet-200 disabled:opacity-50">{t(busy === row.id ? 'working' : action)}</button>)}
        {row.conversationId && <Link href={withExplorationOrigin(`/messages/${encodeURIComponent(row.conversationId)}`, origin)} className="text-xs text-violet-200 underline">{t('openChat')}</Link>}
      </div>
  </article>
}

export default function BeamInvitations({ initialDirection = 'received', selectedId, origin }: { initialDirection?: Direction; selectedId?: string | null; origin?: ExplorationOrigin | null }) {
  const t = useTranslations('beamInvitations'), router = useRouter()
  const [direction, setDirection] = useState(initialDirection), [rows, setRows] = useState<Row[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null), [loading, setLoading] = useState(true)
  const [error, setError] = useState(''), [busy, setBusy] = useState<string | null>(null), [revision, setRevision] = useState(0)
  const [actionError, setActionError] = useState('')
  const generation = useRef(0)
  useEffect(() => {
    let cancelled = false
    const invalidate = () => { generation.current++ }
    async function refresh() {
      const current = ++generation.current
      try {
        const response = await fetch(`/api/beam-invitations?direction=${direction}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('failed')
        const data = await response.json()
        if (!cancelled && current === generation.current) { setRows(data.invitations); setNextCursor(data.nextCursor); setError('') }
      } catch { if (!cancelled && current === generation.current) setError('failed') }
      finally { if (!cancelled && current === generation.current) setLoading(false) }
    }
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 20_000)
    window.addEventListener('focus', refresh); window.addEventListener(INBOX_CHANGED, refresh)
    return () => { cancelled = true; invalidate(); clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener(INBOX_CHANGED, refresh) }
  }, [direction, revision])
  async function act(id: string, action: string) {
    setBusy(id); setActionError('')
    try {
      const response = await fetch(`/api/beam-invitations/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const data = await response.json()
      if (!response.ok) throw new Error(t.has(data.error) ? data.error : 'failed')
      setRows(current => current.map(row => row.id === id ? { ...row, status: data.status, conversationId: data.conversationId } : row))
      notifyInboxChanged()
      if (data.conversationId) router.push(withExplorationOrigin(`/messages/${encodeURIComponent(data.conversationId)}`, origin))
    } catch (cause) { setActionError(cause instanceof Error && t.has(cause.message) ? cause.message : 'failed'); setRevision(v => v + 1) }
    finally { setBusy(null) }
  }
  async function more() {
    if (!nextCursor || loading) return
    const currentGeneration = ++generation.current
    setLoading(true)
    try {
      const response = await fetch(`/api/beam-invitations?direction=${direction}&cursor=${encodeURIComponent(nextCursor)}`, { cache: 'no-store' })
      if (!response.ok) throw new Error()
      const data = await response.json()
      if (currentGeneration !== generation.current) return
      setRows(current => [...new Map([...current, ...data.invitations].map((row: Row) => [row.id, row])).values()]); setNextCursor(data.nextCursor); setError('')
    } catch { if (currentGeneration === generation.current) setError('failed') } finally { if (currentGeneration === generation.current) setLoading(false) }
  }
  return <section aria-label={t('title')} className="my-6 grid gap-3 rounded-2xl border border-white/10 p-4">
    <h2 className="text-lg text-violet-100">{t('title')}</h2>
    <p className="text-xs text-white/60">{t('explanation')}</p>
    <nav aria-label={t('lists')} className="flex gap-3">{(['received', 'sent'] as const).map(value => <button key={value} type="button" aria-pressed={direction === value} disabled={busy !== null} onClick={() => { if (value === direction) return; generation.current++; setDirection(value); setRows([]); setNextCursor(null); setLoading(true); setError(''); setActionError('') }} className="text-sm text-violet-200">{t(value)}</button>)}</nav>
    {loading && !rows.length && <p>{t('loading')}</p>}
    {!loading && !error && !rows.length && <p className="text-sm text-white/50">{t('empty')}</p>}
    {rows.map(row => <BeamInvitationCard key={row.id} row={row} direction={direction} busy={busy} selected={selectedId === row.id} origin={origin} onAction={(id, action) => void act(id, action)} />)}
    {nextCursor && <button type="button" disabled={loading} onClick={() => void more()}>{t('more')}</button>}
    {(actionError || error) && <p role="alert" className="text-xs text-red-300">{t(actionError || error)} <button type="button" onClick={() => { setActionError(''); setRevision(v => v + 1) }} className="underline">{t('retry')}</button></p>}
  </section>
}
