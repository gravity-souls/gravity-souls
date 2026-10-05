'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { setUserFollowing } from '@/lib/planet-actions'

import { requestSocialRefresh, subscribeSocialRefresh } from '@/lib/social-refresh'

export default function FollowButton({ userId }: { userId: string }) {
  const t = useTranslations('planetActions')
  const generation = useRef(0), mutating = useRef(false)
  const [notice, setNotice] = useState('')
  const [state, setState] = useState<{ following: boolean; followedBy: boolean; available?: boolean } | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function refresh() {
      if (mutating.current) return
      const current = ++generation.current
      try {
        const response = await fetch(`/api/follows/${encodeURIComponent(userId)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
        const data = await response.json()
        if (!cancelled && current === generation.current) { setState(data); setError('') }
      } catch (cause) { if (!cancelled && current === generation.current) { setState(null); setError(cause instanceof Error ? cause.message : 'failed') } }
    }
    void refresh()
    const invalidate = () => { generation.current++ }
    const unsubscribe = subscribeSocialRefresh(() => { void refresh() })
    return () => { cancelled = true; invalidate(); unsubscribe() }
  }, [userId, revision])
  async function toggle() {
    if (!state || mutating.current) return
    const following = !state.following
    const current = ++generation.current
    mutating.current = true
    let succeeded = false
    setBusy(true); setError(''); setNotice('')
    try { await setUserFollowing(userId, following); succeeded = true; if (current === generation.current) { setState({ ...state, following }); setNotice(following ? 'followDone' : 'unfollowDone') } }
    catch (cause) { if (current === generation.current) { setState(null); setError(cause instanceof Error ? cause.message : 'failed') } }
    finally { mutating.current = false; setBusy(false); if (succeeded) setRevision(v => v + 1) }
  }
  return <div className="flex flex-col gap-1">
    <button type="button" aria-pressed={state?.following ?? false} onClick={toggle} disabled={busy || !state || state.available === false}
      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-violet-200 hover:bg-white/5 disabled:opacity-50">
      {busy ? t('working') : !state ? t('loading') : state.available === false ? t('unavailable') : state.following ? t('unfollow') : state.followedBy ? t('followBack') : t('follow')}
    </button>
    {state?.available !== false && state && <span className="text-xs text-white/50">{t(state.following && state.followedBy ? 'mutual' : state.following ? 'following' : state.followedBy ? 'followsYou' : 'notFollowing')}</span>}
    {notice && !error && <p role="status" className="text-xs text-violet-200">{t(notice)}</p>}
    {error && <div role="alert" className="text-xs text-red-300">{t(error === 'auth' ? 'signInRequired' : 'stateFailed')} {error === 'auth' ? <Link href="/sign-in">{t('signIn')}</Link> : <button type="button" className="underline" onClick={requestSocialRefresh}>{t('retry')}</button>}</div>}
  </div>
}
