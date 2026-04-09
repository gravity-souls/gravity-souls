'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import SideNav from '@/components/nav/SideNav'

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppShellContextValue {
  sideNavCollapsed: boolean
  toggleSideNav: () => void
}

const AppShellContext = createContext<AppShellContextValue>({
  sideNavCollapsed: true,
  toggleSideNav: () => {},
})

export function useAppShell() {
  return useContext(AppShellContext)
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode
  /** Start with sidebar expanded (default: collapsed) */
  defaultExpanded?: boolean
  /** Disable the sidebar entirely for focused pages */
  noSideNav?: boolean
}

/**
 * AppShell — layout wrapper for inner pages.
 * Composes SideNav + main content area with correct offset.
 * Use on inner pages (/stream, /discover, /my-planet, etc.).
 *
 * The root layout.tsx provides CosmicBackground + StarfieldCanvas + TopNav.
 * AppShell sits inside <main> and provides the sidebar layout layer.
 *
 *   // app/stream/page.tsx
 *   import AppShell from '@/components/layout/AppShell'
 *
 *   export default function StreamPage() {
 *     return (
 *       <AppShell>
 *         <div className="px-6 pt-8 pb-16 max-w-6xl mx-auto">
 *           ...
 *         </div>
 *       </AppShell>
 *     )
 *   }
 */
export default function AppShell({ children, defaultExpanded = false, noSideNav = false }: Props) {
  const [collapsed, setCollapsed] = useState(!defaultExpanded)

  const toggleSideNav = () => setCollapsed((c) => !c)

  const sideW = noSideNav
    ? 0
    : collapsed
    ? 'var(--sidebar-w-collapsed)'
    : 'var(--sidebar-w-expanded)'

  return (
    <AppShellContext.Provider value={{ sideNavCollapsed: collapsed, toggleSideNav }}>
      {/* Sidebar */}
      {!noSideNav && (
        <SideNav collapsed={collapsed} onToggle={toggleSideNav} />
      )}

      {/* Main content — offset by sidebar width */}
      <div
        style={{
          paddingLeft: noSideNav ? 0 : sideW,
          transition: `padding-left var(--duration-slow) var(--ease-cosmic)`,
          minHeight: `calc(100vh - var(--nav-h))`,
        }}
      >
        {children}
      </div>
    </AppShellContext.Provider>
  )
}
