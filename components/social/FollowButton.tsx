'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { PLANET_ACTION_CHANGED, setUserFollowing, type PlanetActionChange } from '@/lib/planet-actions'

export default function FollowButton({ userId }: { userId: string }) {
  const t = useTranslations('planetActions')
  const [state, setState] = useState<{ following: boolean; followedBy: boolean; available?: boolean } | null>(null)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false, sequence = 0
    async function refresh() {
      const current = ++sequence
      try {
        const response = await fetch(`/api/follows/${encodeURIComponent(userId)}`, { cache: 'no-store' })
        if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
        const data = await response.json()
        if (!cancelled && current === sequence) { setState(data); setError('') }
      } catch (cause) { if (!cancelled && current === sequence) setError(cause instanceof Error ? cause.message : 'failed') }
    }
    function sync(event: Event) {
      const detail = (event as CustomEvent<PlanetActionChange>).detail
      if (detail.kind === 'follow' && detail.userId === userId) void refresh()
    }
    void refresh()
    window.addEventListener('focus', refresh); window.addEventListener(PLANET_ACTION_CHANGED, sync)
    return () => { cancelled = true; window.removeEventListener('focus', refresh); window.removeEventListener(PLANET_ACTION_CHANGED, sync) }
  }, [userId, revision])
  async function toggle() {
    if (!state) return
    setBusy(true); setError('')
    try { await setUserFollowing(userId, !state.following); setState({ ...state, following: !state.following }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'failed') }
    finally { setBusy(false) }
  }
  return <div className="flex flex-col gap-1">
    <button type="button" aria-pressed={state?.following ?? false} onClick={toggle} disabled={busy || !state || state.available === false}
      className="rounded-xl border border-white/15 px-4 py-2 text-sm text-violet-200 hover:bg-white/5 disabled:opacity-50">
      {busy ? t('working') : !state ? t('loading') : state.available === false ? t('unavailable') : state.following ? t('unfollow') : state.followedBy ? t('followBack') : t('follow')}
    </button>
    {state?.available !== false && state && <span className="text-xs text-white/50">{t(state.following && state.followedBy ? 'mutual' : state.following ? 'following' : state.followedBy ? 'followsYou' : 'notFollowing')}</span>}
    {error && <div role="alert" className="text-xs text-red-300">{t(error === 'auth' ? 'signInRequired' : 'failed')} {error === 'auth' ? <Link href="/sign-in">{t('signIn')}</Link> : <button type="button" className="underline" onClick={() => state ? void toggle() : setRevision(v => v + 1)}>{t('retry')}</button>}</div>}
  </div>
}
