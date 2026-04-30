import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import SectionHeader from '@/components/ui/SectionHeader'
import { getSharedPosts } from '@/lib/mock-posts'

export default function PostsPage() {
  const posts = getSharedPosts()

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-5xl mx-auto">
        <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.07} double={false} />

        <div className="relative z-10 flex flex-col gap-8 animate-fade-up">
          <SectionHeader
            eyebrow="Social orbit"
            level={1}
            title="All posts"
            subtitle="Shared moments from nearby planets. Open a post, visit its planet, or continue into the wider stream."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => (
              <article
                key={post.id}
                className="rounded-2xl p-5 flex flex-col gap-4"
                style={{
                  background: 'linear-gradient(160deg, rgba(18,14,52,0.78) 0%, rgba(6,4,20,0.88) 100%)',
                  border: `1px solid ${post.avatarGlow}20`,
                  boxShadow: `0 16px 48px rgba(0,0,0,0.32), 0 0 48px ${post.avatarGlow}08`,
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <PlanetAvatar textureFile={post.avatarTexture} size={42} glowColor={post.avatarGlow} />
                  <div className="min-w-0">
                    <Link href={`/planet/${post.planetId}`} className="text-sm font-semibold truncate block" style={{ color: 'var(--foreground)', textDecoration: 'none' }}>
                      {post.authorName}
                    </Link>
                    <p className="text-[10px]" style={{ color: 'var(--ghost)' }}>
                      {post.timeAgo}
                    </p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
                  {post.content}
                </p>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {post.hashtags.map((tag) => (
                      <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: `${post.avatarGlow}12`, border: `1px solid ${post.avatarGlow}24`, color: post.avatarGlow }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--ghost)' }}>
                  <span>{post.likes} likes</span>
                  <span>{post.replies} replies</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-auto pt-2">
                  <Link href={`/posts/${post.id}`} className="flex-1 text-center rounded-xl px-4 py-2.5 text-sm font-medium" style={{ background: `${post.avatarGlow}22`, border: `1px solid ${post.avatarGlow}38`, color: 'var(--foreground)', textDecoration: 'none' }}>
                    Open post
                  </Link>
                  <Link href={`/planet/${post.planetId}`} className="flex-1 text-center rounded-xl px-4 py-2.5 text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--ink)', textDecoration: 'none' }}>
                    View planet
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}