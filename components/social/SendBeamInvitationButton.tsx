'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { notifyInboxChanged } from '@/lib/inbox-client'
import { withExplorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'
import { announcePlanetAction } from '@/lib/planet-actions'
import { subscribeSocialRefresh } from '@/lib/social-refresh'

type Status = { available: boolean; invitationId: string | null; status: string | null; conversationId: string | null; incomingPending: boolean }
export default function SendBeamInvitationButton({ userId, origin }: { userId: string; origin?: ExplorationOrigin | null }) {
  const t = useTranslations('beamInvitations'), router = useRouter()
  const [state, setState] = useState<Status | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  const generation = useRef(0), mutating = useRef(false)
  useEffect(() => {
    let disposed = false
    async function refresh() {
      if (mutating.current) return
      const current = ++generation.current
      try {
        const response = await fetch(`/api/beam-invitations/status?recipientId=${encodeURIComponent(userId)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('failed')
        const data = await response.json() as Status
        if (!disposed && current === generation.current) { setState(data); setError('') }
      } catch { if (!disposed && current === generation.current) { setState(null); setError('failed') } }
    }
    void refresh()
    const invalidate = () => { generation.current++ }
    const unsubscribe = subscribeSocialRefresh(() => { void refresh() })
    return () => { disposed = true; invalidate(); unsubscribe() }
  }, [userId, revision])
  async function change(cancel = false) {
    if (mutating.current || !state?.available || cancel && !state.invitationId) return
    const current = ++generation.current
    mutating.current = true; setBusy(true); setError('')
    let succeeded = false
    try {
      const response = await fetch(cancel ? `/api/beam-invitations/${encodeURIComponent(state.invitationId!)}` : '/api/beam-invitations', { method: cancel ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cancel ? { action: 'cancel' } : { recipientId: userId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(t.has(data.error) ? data.error : 'failed')
      if (current !== generation.current) return
      succeeded = true
      if (data.conversationId) {
        announcePlanetAction({ kind: 'conversation', userId, conversationId: data.conversationId })
        router.push(withExplorationOrigin(`/messages/${encodeURIComponent(data.conversationId)}`, origin)); return
      }
      setState({ ...state, invitationId: data.invitationId ?? state.invitationId, status: data.status })
      notifyInboxChanged()
    } catch (cause) { if (current === generation.current) { setState(null); setError(cause instanceof Error && t.has(cause.message) ? cause.message : 'failed') } }
    finally { mutating.current = false; setBusy(false); if (succeeded) setRevision(v => v + 1) }
  }
  return <div className="grid gap-2">
    <p className="text-xs text-white/60">{t('sendExplanation')}</p>
    {state?.conversationId ? <Link href={withExplorationOrigin(`/messages/${encodeURIComponent(state.conversationId)}`, origin)} className="text-sm text-violet-200 underline">{t('openChat')}</Link>
      : state && !state.available ? <p role="status">{t('unavailable')}</p>
      : state?.incomingPending ? <p role="status">{t('incomingPending')}</p>
      : state?.status ? <><p role="status" className="text-xs text-violet-200">{t.has(state.status) ? t(state.status) : t('unavailable')}</p>
        {state.status === 'PENDING' && <button type="button" disabled={busy} onClick={() => void change(true)} className="min-h-10 rounded-xl border border-white/15 px-4 py-2 text-sm text-violet-200">{t(busy ? 'working' : 'cancel')}</button>}</>
      : <button type="button" disabled={busy || !state} onClick={() => void change()} className="rounded-xl border border-violet-300/30 px-4 py-2 text-sm text-violet-200 disabled:opacity-50">{t(busy ? 'working' : 'send')}</button>}
    <Link href={withExplorationOrigin(`/messages?invitations=${state?.incomingPending || error === 'incomingPending' ? 'received' : 'sent'}`, origin)} className="text-xs underline">{t(state?.incomingPending || error === 'incomingPending' ? 'received' : 'sent')}</Link>
    {error && <p role="alert" className="text-xs text-red-300">{t(error)} <button type="button" disabled={busy} className="underline" onClick={() => setRevision(v => v + 1)}>{t('retry')}</button></p>}
  </div>
}
