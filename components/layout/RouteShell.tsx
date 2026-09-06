'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const StandardShell = dynamic(() => import('./StandardShell'))

export default function RouteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname === '/demo/cosmic-globe') return <main>{children}</main>
  return <StandardShell>{children}</StandardShell>
}
