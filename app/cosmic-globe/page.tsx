import { cookies } from 'next/headers'
import { getFeaturedGalaxy } from '@/lib/featured-galaxy'
import GlobeClient from './GlobeClient'

const SESSION_COOKIE = 'better-auth.session_token'

// Resolved server-side so a signed-in visitor's CTAs are correct with zero
// added client-side requests — the session cookie is HttpOnly and cannot be
// read from the page's own JavaScript. See e2e/demo/cosmic-globe.spec.ts,
// which asserts this route never makes an /api/* request. The featured
// galaxy is fetched here (server-side, via Prisma) for the same reason —
// never as a client fetch to an /api/* route.
export default async function CosmicGlobePage() {
  const cookieStore = await cookies()
  const signedIn = Boolean(
    cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(`__Secure-${SESSION_COOKIE}`)?.value,
  )
  const featuredGalaxy = await getFeaturedGalaxy()

  return <GlobeClient signedIn={signedIn} featuredGalaxy={featuredGalaxy} />
}
