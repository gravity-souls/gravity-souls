'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import PostDetail from '@/components/stream/PostDetail'
import { authClient } from '@/lib/auth-client'
import { postContextReturnHref } from '@/lib/post-return'
import type { StreamPost } from '@/types/stream'

function StreamPostContent() {
  const t = useTranslations('postContext'), router = useRouter()
  const params = useParams<{ id: string }>(), search = useSearchParams()
  const returnHref = postContextReturnHref(search.get('fromContext'))
  const { data: session } = authClient.useSession()
  const [result, setResult] = useState<{ id: string; post: StreamPost | null; state: 'loading' | 'unavailable' | 'failed' | 'ready' }>({ id: params.id, post: null, state: 'loading' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    Promise.resolve().then(() => { if (!cancelled) setResult({ id: params.id, post: null, state: 'loading' }) })
    fetch(`/api/posts/${encodeURIComponent(params.id)}`, { cache: 'no-store', signal: controller.signal })
      .then(async res => {
        if ([401, 403, 404].includes(res.status)) return null
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!data.post) throw new Error('failed')
        return data.post as StreamPost
      })
      .then(post => { if (!cancelled) setResult({ id: params.id, post, state: post ? 'ready' : 'unavailable' }) })
      .catch(() => { if (!cancelled) setResult({ id: params.id, post: null, state: 'failed' }) })
    return () => { cancelled = true; controller.abort() }
  }, [params.id, revision, session?.user.id])
  const post = result.id === params.id ? result.post : null
  const state = result.id === params.id ? result.state : 'loading'
  return <AppShell>
    <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.07} double={false} />
    <div className="relative z-10 grid min-h-[calc(100vh-var(--nav-h))] place-content-center gap-4 px-6 py-20">
      {!post && <p role={state === 'failed' ? 'alert' : 'status'} className="text-sm" style={{ color: 'var(--ghost)' }}>{t(state === 'failed' ? 'readFailed' : state === 'unavailable' ? 'unavailable' : 'loading')}</p>}
      {!post && state !== 'loading' && <button className="text-sm text-violet-200 underline" onClick={() => setRevision(v => v + 1)}>{t('retry')}</button>}
      {returnHref && <Link href={returnHref} className="text-sm text-violet-200 underline">← {t(returnHref.includes('?event=') ? 'backEvent' : 'backGalaxy')}</Link>}
    </div>
    <PostDetail key={`${params.id}:${session?.user.id ?? 'guest'}`} post={post} open={!!post} currentUserId={session?.user.id} returnHref={returnHref}
      onClose={() => router.push(returnHref ?? '/stream')}
      onPostUpdated={updated => setResult({ id: params.id, post: updated, state: 'ready' })}
      onDeleted={() => router.push(returnHref ?? '/stream')} />
  </AppShell>
}
export default function StreamPostPage() { return <Suspense><StreamPostContent /></Suspense> }
