import { cookies } from 'next/headers'
import GlobeClient from './demo/cosmic-globe/GlobeClient'
import HomeDashboard from './HomeDashboard'

const SESSION_COOKIE = 'better-auth.session_token'

// Resolved server-side (same cookie check as app/demo/cosmic-globe/page.tsx) so a
// signed-out visitor's very first paint is the cosmic-globe showcase, with zero
// client-side flash while a session check resolves. Signed-in visitors get the
// live dashboard (HomeDashboard, the former content of this file).
export default async function HomePage() {
  const cookieStore = await cookies()
  const signedIn = Boolean(
    cookieStore.get(SESSION_COOKIE)?.value || cookieStore.get(`__Secure-${SESSION_COOKIE}`)?.value,
  )

  if (!signedIn) {
    return <GlobeClient signedIn={false} standalone />
  }

  return <HomeDashboard />
}
