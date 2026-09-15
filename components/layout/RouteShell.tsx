'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { authClient } from '@/lib/auth-client'

const StandardShell = dynamic(() => import('./StandardShell'))

// Only mounted for "/", so the session fetch it needs never happens on
// /demo/cosmic-globe or any other route — that page's own e2e spec asserts
// zero /api/* requests, which a hook mounted in the shared RouteShell below
// would otherwise break for every route, not just this one.
function HomeRouteShell({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession()
  // `session` is null both while pending and when truly signed out, which
  // matches app/page.tsx's server-resolved choice on first paint (no flash);
  // it only flips to StandardShell after hydration if the visitor turns out
  // to be signed in.
  if (!session?.user) return <main>{children}</main>
  return <StandardShell>{children}</StandardShell>
}

export default function RouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/demo/cosmic-globe') return <main>{children}</main>
  if (pathname === '/') return <HomeRouteShell>{children}</HomeRouteShell>
  return <StandardShell>{children}</StandardShell>
}
