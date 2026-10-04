'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import FollowButton from '@/components/social/FollowButton'
import SendBeamInvitationButton from '@/components/social/SendBeamInvitationButton'
import { announcePlanetAction } from '@/lib/planet-actions'
import { withExplorationOrigin, type ExplorationOrigin } from '@/lib/exploration-return'
export default function BeamButton({ userId, planetId, hasFollowControl = false, conversationId, origin }: { userId?: string; planetId: string; hasFollowControl?: boolean; conversationId?: string; origin?: ExplorationOrigin | null }) {
  const t = useTranslations('planetActions'), router = useRouter()
  const tm = useTranslations('starMap')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function open() {
    if (conversationId) { router.push(withExplorationOrigin(`/messages/${encodeURIComponent(conversationId)}`, origin)); return }
    if (!userId) { router.push(`/messages?to=${encodeURIComponent(planetId)}`); return }
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId: userId }) })
      const data = await response.json().catch(() => ({}))
      if (response.ok && typeof data.conversationId === 'string' && data.conversationId.length > 0) {
        announcePlanetAction({ kind: 'conversation', userId, conversationId: data.conversationId })
        router.push(withExplorationOrigin(`/messages/${encodeURIComponent(data.conversationId)}`, origin)); return
      }
      setError(response.status === 401 ? 'auth' : data.code === 'mutualFollowRequired' || data.error?.includes('follow each other') ? 'mutualRequired' : 'failed')
    } catch { setError('failed') }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-2">
    <button type="button" disabled={busy} onClick={open} className="rounded-xl border border-violet-400/30 bg-violet-500/15 px-4 py-2 text-sm text-violet-200 disabled:opacity-50">{busy ? t('working') : conversationId ? tm('continueChat') : t('beam')}</button>
    <p className="max-w-xs text-xs text-white/50">{t('openOnly')}</p>
    {error && <div role="alert" className="max-w-xs text-xs text-red-300">{t(error === 'auth' ? 'signInRequired' : error)} {error === 'auth' ? <Link href="/sign-in">{t('signIn')}</Link> : <button type="button" className="underline" onClick={open}>{t('retry')}</button>}</div>}
    {error === 'mutualRequired' && <div className="flex flex-col gap-2">{userId && !hasFollowControl && <FollowButton userId={userId} />}<Link href="/relationships" className="text-xs text-violet-300 underline">{t('viewRelationships')}</Link></div>}
    {error === 'mutualRequired' && userId && <SendBeamInvitationButton userId={userId} origin={origin} />}
  </div>
}
