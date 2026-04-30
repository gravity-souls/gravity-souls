'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import {
  Globe, Users, Compass, Sparkles, Zap, MessageCircle, Newspaper,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

// --- Navigation items (flat list matching mockup) ----------------------------

interface NavItem {
  href:    string
  label:   string
  Icon:    LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { href: '/my-planet',   label: 'My Planet',    Icon: Globe },
  { href: '/resonance',   label: 'Matches',      Icon: Sparkles },
  { href: '/messages',    label: 'Messages',     Icon: MessageCircle },
  { href: '/posts',       label: 'Posts',        Icon: Newspaper },
  { href: '/communities', label: 'Communities',   Icon: Users },
  { href: '/stream',      label: 'Activities',    Icon: Zap },
  { href: '/discover',    label: 'Stream',        Icon: Compass },
]

// --- SideNav ------------------------------------------------------------------

interface Props {
  collapsed: boolean
  onToggle:  () => void
}

export default function SideNav({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const hydrated = useHydrated()
  const isAuthenticated = hydrated && !!session?.user
  const w = collapsed ? 'var(--sidebar-w-collapsed)' : 'var(--sidebar-w-expanded)'

  return (
    <aside
      aria-label="Side navigation"
      style={{
        position:   'fixed',
        top:        'var(--nav-h)',
        left:       0,
        bottom:     0,
        width:      w,
        zIndex:     40,
        transition: `width var(--duration-slow) var(--ease-cosmic)`,
        overflow:   'hidden',
      }}
    >
      {/* Glass panel background */}
      <div
        className="absolute inset-0"
        style={{
          background:    'linear-gradient(180deg, rgba(11,15,26,0.97) 0%, rgba(17,24,39,0.98) 100%)',
          backdropFilter: 'blur(20px)',
          borderRight:   '1px solid rgba(255,255,255,0.06)',
        }}
      />

      {/* Nav content */}
      <nav
        className="relative flex flex-col h-full py-5"
        style={{ width: 'var(--sidebar-w-expanded)' }}
      >
        {/* Logo / brand */}
        <div className="flex items-center gap-3 px-5 mb-6">
          <div
            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.3) 0%, rgba(79,70,229,0.2) 100%)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            <span className="text-sm" style={{ color: 'var(--star)' }}>◎</span>
          </div>
          <span
            className="text-sm font-semibold tracking-wide"
            style={{
              color: 'var(--foreground)',
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            gravity
          </span>
        </div>

        {/* Nav items — flat list */}
        <div className="flex flex-col gap-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  color:          isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  background:     isActive ? 'rgba(124,58,237,0.18)' : 'transparent',
                  border:         'none',
                  textDecoration: 'none',
                }}
                title={collapsed ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'
                  }
                }}
              >
                {/* Icon */}
                <item.Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.5}
                  className="shrink-0"
                />

                {/* Label */}
                <span
                  className="text-sm font-medium leading-none"
                  style={{
                    opacity: collapsed ? 0 : 1,
                    transition: 'opacity 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom section */}
        <div className="flex flex-col gap-2 px-2">
          {/* Sign In */}
          {!isAuthenticated && (
            <Link
              href="/sign-in"
              className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                opacity: collapsed ? 0 : 1,
                transition: 'opacity 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              Sign in
            </Link>
          )}

          {/* Inspirational quote */}
          <div
            className="mx-1 px-3 py-3 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.04)',
              opacity: collapsed ? 0 : 1,
              transition: 'opacity 0.15s ease',
              pointerEvents: collapsed ? 'none' : 'auto',
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(167,139,250,0.1)' }}>
                <span style={{ fontSize: 9, color: 'var(--star)' }}>◎</span>
              </div>
            </div>
            <p className="text-[10px] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>
              You are not lost.<br />
              You are becoming.
            </p>
          </div>

          {/* User identity row */}
          {isAuthenticated && session?.user && (
            <div
              className="flex items-center gap-2.5 mx-1 px-3 py-2.5 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                opacity: collapsed ? 0 : 1,
                transition: 'opacity 0.15s ease',
              }}
            >
              <div
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs"
                style={{
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))',
                  color: 'var(--star)',
                }}
              >
                {(session.user.name ?? 'U').charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium truncate" style={{ color: 'var(--foreground)' }}>
                  {session.user.name ?? 'Explorer'}
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Explorer
                </span>
              </div>
              <button
                onClick={onToggle}
                className="ml-auto shrink-0 text-xs"
                style={{ color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                ⌄
              </button>
            </div>
          )}

          {/* Toggle button (when not authenticated) */}
          {!isAuthenticated && (
            <button
              onClick={onToggle}
              className="flex items-center gap-3 mx-1 px-3 py-2 rounded-xl transition-all"
              style={{
                color: 'rgba(255,255,255,0.3)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="text-xs">{collapsed ? '›' : '‹'}</span>
              <span
                className="text-[10px]"
                style={{
                  opacity: collapsed ? 0 : 1,
                  transition: 'opacity 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                Collapse
              </span>
            </button>
          )}
        </div>
      </nav>
    </aside>
  )
}
