'use client'

import type { ReactNode } from 'react'
import Topbar from './Topbar'
import CosmicBackground from '@/components/fx/CosmicBackground'
import StarfieldCanvas from '@/components/fx/StarfieldCanvas'
import LevelUpToast from '@/components/ui/LevelUpToast'

export default function StandardShell({ children }: { children: ReactNode }) {
  return (
    <>
      <CosmicBackground />
      <StarfieldCanvas />
      <Topbar />
      <LevelUpToast />
      <main className="relative z-10" style={{ paddingTop: 'var(--nav-h)' }}>
        {children}
      </main>
    </>
  )
}
