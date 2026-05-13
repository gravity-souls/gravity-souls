'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import PostDetail from '@/components/stream/PostDetail'
import { authClient } from '@/lib/auth-client'
import type { StreamPost } from '@/types/stream'

export default function StreamPostPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { data: session } = authClient.useSession()
  const [post, setPost] = useState<StreamPost | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!params.id) return
    let cancelled = false
    fetch(`/api/posts/${params.id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data: { post?: StreamPost } | null) => {
        if (cancelled) return
        if (data?.post) setPost(data.post)
        else setNotFound(true)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
    return () => { cancelled = true }
  }, [params.id])

  return (
    <AppShell>
      <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.07} double={false} />
      <div className="relative z-10 grid min-h-[calc(100vh-var(--nav-h))] place-items-center px-6 py-20">
        <p className="text-sm" style={{ color: 'var(--ghost)' }}>{notFound ? 'Signal not found.' : 'Opening signal...'}</p>
      </div>
      <PostDetail
        post={post}
        open={!!post}
        currentUserId={session?.user.id}
        onClose={() => router.push('/stream')}
        onPostUpdated={setPost}
        onDeleted={() => router.push('/stream')}
      />
    </AppShell>
  )
}