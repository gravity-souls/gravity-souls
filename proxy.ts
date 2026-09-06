import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'better-auth.session_token'

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE) || request.cookies.has(`__Secure-${SESSION_COOKIE}`)
  if (!hasSession) {
    const signIn = new URL('/sign-in', request.url)
    signIn.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(signIn)
  }
  return NextResponse.next()
}

// /messages, /onboarding, and /galaxy/[slug] are deliberately excluded here —
// each already has its own tested, graceful client-side handling for a
// signed-out visitor (a "Sign in required" state, an explore-then-sign-up
// handoff, and public content, respectively). A hard proxy redirect would
// override that intentional UX. See e2e/phase18.spec.ts, e2e/phase3.spec.ts,
// and e2e/beta-safety.spec.ts.
export const config = {
  matcher: [
    '/resonance',
    '/my-planet/:path*',
    '/discover',
    '/stream',
    '/settings/:path*',
    '/relationships',
    '/saved',
    '/universe/:path*',
    '/posts',
    '/notifications',
    '/communities',
    '/my-universe',
  ],
}
