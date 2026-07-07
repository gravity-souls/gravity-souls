import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'better-auth.session_token'

export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const signIn = new URL('/sign-in', request.url)
    signIn.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(signIn)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/resonance',
    '/my-planet',
    '/discover',
    '/stream',
    '/settings/:path*',
    '/relationships',
    '/saved',
    '/universe/:path*',
    '/posts',
    '/conversations',
    '/notifications',
    '/communities',
  ],
}
