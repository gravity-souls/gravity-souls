'use client'

import type { ReactNode } from 'react'
import Topbar from './Topbar'
import CosmicBackground from '@/components/fx/CosmicBackground'
import StarfieldCanvas from '@/components/fx/StarfieldCanvas'
import LevelUpToast from '@/components/ui/LevelUpToast'

export default function StandardShell({ children }: { children: ReactNode }) {
  return <>
    <CosmicBackground />
    <StarfieldCanvas />
    <Topbar />
    <LevelUpToast />
    <main className="relative z-10" style={{ paddingTop: 'var(--nav-h)' }}>{children}</main>
    <footer className="relative z-10 text-center py-4 text-[10px] tracking-wide" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
      Planet textures by{' '}
      <a href="https://www.solarsystemscope.com/textures/" target="_blank" rel="noopener noreferrer" className="underline">Solar System Scope</a>{' '}
      (CC BY 4.0)
    </footer>
  </>
}
