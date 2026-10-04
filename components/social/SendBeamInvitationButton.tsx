'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { notifyInboxChanged } from '@/lib/inbox-client'
import { withExplorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'
import { announcePlanetAction } from '@/lib/planet-actions'

export default function SendBeamInvitationButton({ userId, origin }: { userId: string; origin?: ExplorationOrigin | null }) {
  const t = useTranslations('beamInvitations'), router = useRouter()
  const [status, setStatus] = useState<string | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function send() {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/beam-invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId: userId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(t.has(data.error) ? data.error : 'failed')
      if (data.conversationId) {
        announcePlanetAction({ kind: 'conversation', userId, conversationId: data.conversationId })
        router.push(withExplorationOrigin(`/messages/${encodeURIComponent(data.conversationId)}`, origin)); return
      }
      setStatus(data.status); notifyInboxChanged()
    } catch (cause) { setError(cause instanceof Error && t.has(cause.message) ? cause.message : 'failed') }
    finally { setBusy(false) }
  }
  return <div className="grid gap-2">
    <p className="text-xs text-white/60">{t('sendExplanation')}</p>
    {status ? <p role="status" className="text-xs text-violet-200">{t.has(status) ? t(status) : t('PENDING')}</p> : <button type="button" disabled={busy} onClick={send} className="rounded-xl border border-violet-300/30 px-4 py-2 text-sm text-violet-200 disabled:opacity-50">{t(busy ? 'working' : 'send')}</button>}
    <Link href={withExplorationOrigin(`/messages?invitations=${error === 'incomingPending' ? 'received' : 'sent'}`, origin)} className="text-xs underline">{t(error === 'incomingPending' ? 'received' : 'sent')}</Link>
    {error && <p role="alert" className="text-xs text-red-300">{t(error)}</p>}
  </div>
}
