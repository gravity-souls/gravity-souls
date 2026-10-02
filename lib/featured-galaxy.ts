import { prisma } from '@/lib/prisma'

export interface FeaturedGalaxy {
  slug: string
  name: string
  symbol: string
  tagline: string | null
  accentColor: string
  memberCount: number
}

// Used by app/page.tsx and app/cosmic-globe/page.tsx to preview a real galaxy
// before sign-up. Fetched server-side (not via GET /api/communities) because
// e2e/demo/cosmic-globe.spec.ts asserts that page makes zero client API
// calls, by design, so it never breaks if the database is unreachable — a
// query failure here just means no galaxy card renders, not a broken page.
export async function getFeaturedGalaxy(): Promise<FeaturedGalaxy | null> {
  try {
    const communities = await prisma.community.findMany({
      select: { slug: true, name: true, symbol: true, tagline: true, accentColor: true, _count: { select: { memberships: true } } },
    })
    if (communities.length === 0) return null

    const featured = communities.reduce((best, c) => (c._count.memberships > best._count.memberships ? c : best))
    return {
      slug: featured.slug,
      name: featured.name,
      symbol: featured.symbol,
      tagline: featured.tagline,
      accentColor: featured.accentColor,
      memberCount: featured._count.memberships,
    }
  } catch {
    return null
  }
}
