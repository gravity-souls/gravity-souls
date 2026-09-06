import { cookies } from 'next/headers'
import GlobeClient from './GlobeClient'

const SESSION_COOKIE = 'better-auth.session_token'

// Resolved server-side so a signed-in visitor's CTAs are correct with zero
// added client-side requests — the session cookie is HttpOnly and cannot be
// read from the page's own JavaScript. See e2e/demo/cosmic-globe.spec.ts,
// which asserts this route never makes an /api/* request.
export default async function CosmicGlobeDemoPage() {
  const cookieStore = await cookies()
  const signedIn = Boolean(
    cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(`__Secure-${SESSION_COOKIE}`)?.value,
  )

  return <GlobeClient signedIn={signedIn} />
}
