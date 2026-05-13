'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import LightCone from '@/components/fx/LightCone'
import AppShell from '@/components/layout/AppShell'
import CategoryTabs, { type StreamCategoryTab } from '@/components/stream/CategoryTabs'
import CreatePostModal from '@/components/stream/CreatePostModal'
import PostDetail from '@/components/stream/PostDetail'
import PostGrid from '@/components/stream/PostGrid'
import StreamSearchBar from '@/components/stream/StreamSearchBar'
import { authClient } from '@/lib/auth-client'
import type { StreamPost } from '@/types/stream'

export default function StreamPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const [category, setCategory] = useState<StreamCategoryTab>('ALL')
  const [search, setSearch] = useState('')
  const [tag, setTag] = useState<string | undefined>()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<StreamPost | null>(null)
  const [createdPost, setCreatedPost] = useState<StreamPost | null>(null)
  const [resultCount, setResultCount] = useState<number | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)

  function openCreate() {
    if (!session?.user) {
      router.push('/sign-in?next=/stream')
      return
    }
    setCreateOpen(true)
  }

  function handleTagClick(nextTag: string) {
    setTag(nextTag)
    setSearch(`#${nextTag}`)
    setSelectedPost(null)
  }

  function clearSearch(nextSearch: string) {
    setSearch(nextSearch)
    if (!nextSearch.startsWith('#')) setTag(undefined)
  }

  return (
    <AppShell>
      <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.07} double={false} />
      <div className="relative z-10 mx-auto max-w-7xl px-3 pb-24 pt-4 sm:px-6">
        <div className="sticky top-[var(--nav-h)] z-30 -mx-3 border-b border-white/8 px-3 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6" style={{ background: 'rgba(3,3,15,0.80)' }}>
          <div className="mx-auto flex max-w-5xl flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <StreamSearchBar value={search} resultCount={resultCount} onChange={clearSearch} />
              </div>
              <button type="button" onClick={openCreate} className="hidden rounded-2xl px-4 py-3 text-sm font-semibold sm:inline-flex" style={{ color: '#fff', background: 'rgba(124,58,237,0.78)', border: '1px solid rgba(167,139,250,0.42)' }}>
                Send Signal
              </button>
            </div>
            <CategoryTabs value={category} onChange={setCategory} />
          </div>
        </div>

        <main className="pt-5">
          <PostGrid
            category={category}
            search={search && !tag ? search : undefined}
            tag={tag}
            refreshKey={refreshKey}
            prependPost={createdPost}
            onPostOpen={setSelectedPost}
            onPostsChange={(posts) => setResultCount(posts.length)}
          />
        </main>

        <button type="button" onClick={openCreate} className="fixed bottom-6 right-5 z-40 grid h-14 w-14 place-items-center rounded-full sm:hidden" style={{ color: '#fff', background: 'linear-gradient(135deg, rgba(124,58,237,0.96), rgba(99,102,241,0.92))', border: '1px solid rgba(167,139,250,0.55)', boxShadow: '0 18px 42px rgba(99,102,241,0.32)' }} aria-label="Create post">
          <Plus size={22} />
        </button>
      </div>

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(post) => {
          setCreatedPost(post)
          setRefreshKey((key) => key + 1)
        }}
      />
      <PostDetail
        post={selectedPost}
        open={!!selectedPost}
        currentUserId={session?.user.id}
        onClose={() => setSelectedPost(null)}
        onTagClick={handleTagClick}
        onPostUpdated={(post) => setSelectedPost(post)}
        onDeleted={() => {
          setSelectedPost(null)
          setRefreshKey((key) => key + 1)
        }}
      />
    </AppShell>
  )
}
