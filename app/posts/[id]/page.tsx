import Link from 'next/link'
import { notFound } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import GlowButton from '@/components/ui/GlowButton'
import { getSharedPostAuthor, getSharedPostById, getSharedPosts } from '@/lib/mock-posts'

interface Props {
  params: Promise<{ id: string }>
}

export function generateStaticParams() {
  return getSharedPosts().map((post) => ({ id: post.id }))
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const post = getSharedPostById(id)
  if (!post) notFound()

  const author = getSharedPostAuthor(post)

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-3xl mx-auto">
        <LightCone origin="top-center" color={post.avatarGlow} opacity={0.08} double={false} />

        <article
          className="relative z-10 rounded-2xl overflow-hidden animate-fade-up"
          style={{
            background: 'linear-gradient(160deg, rgba(18,14,52,0.88) 0%, rgba(6,4,20,0.95) 100%)',
            border: `1px solid ${post.avatarGlow}28`,
            boxShadow: `0 24px 80px rgba(0,0,0,0.48), 0 0 64px ${post.avatarGlow}10`,
          }}
        >
          <div className="flex items-center justify-between gap-4 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <PlanetAvatar textureFile={post.avatarTexture} size={44} glowColor={post.avatarGlow} />
              <div className="min-w-0">
                <Link href={`/planet/${post.planetId}`} className="text-sm font-semibold truncate block" style={{ color: 'var(--foreground)', textDecoration: 'none' }}>
                  {post.authorName}
                </Link>
                <p className="text-[10px]" style={{ color: 'var(--ghost)' }}>
                  {post.timeAgo}
                </p>
              </div>
            </div>
            <Link href="/posts" className="text-xs" style={{ color: 'var(--ghost)', textDecoration: 'none' }}>
              All posts
            </Link>
          </div>

          <div className="p-6 flex flex-col gap-5">
            <p className="text-lg leading-relaxed" style={{ color: 'var(--foreground)' }}>
              {post.content}
            </p>

            {post.hashtags && post.hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: `${post.avatarGlow}14`, border: `1px solid ${post.avatarGlow}28`, color: post.avatarGlow }}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--ghost)' }}>
              <span>{post.likes} likes</span>
              <span>{post.replies} replies</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
            </div>

            {author?.tagline && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs uppercase tracking-[0.22em] mb-2" style={{ color: post.avatarGlow }}>
                  Author planet
                </p>
                <p className="text-sm italic" style={{ color: 'var(--ink)', opacity: 0.74 }}>
                  &ldquo;{author.tagline}&rdquo;
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <GlowButton href={`/planet/${post.planetId}`} variant="primary" className="flex-1 text-center py-3 text-sm">
                View planet
              </GlowButton>
              <GlowButton href="/posts" variant="ghost" className="flex-1 text-center py-3 text-sm">
                Back to posts
              </GlowButton>
            </div>
          </div>
        </article>
      </div>
    </AppShell>
  )
}