'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Globe2,
  Home,
  Lock,
  MessageCircle,
  Orbit,
  Settings,
  Sparkles,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { clampLevel } from '@/lib/xp'
import LevelBadge from '@/components/planet/LevelBadge'

const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

const SIDEBAR_COLLAPSED_WIDTH = 40
const SIDEBAR_EXPANDED_WIDTH = 220

const LEVEL_DOT_COLORS = {
  1: '#6b7280',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#a855f7',
  5: '#f59e0b',
} as const

interface MeResponse {
  user?: {
    userLevel?: number | null
  }
}

interface NavItem {
  href: string
  labelKey: 'home' | 'stream' | 'resonance' | 'galaxies' | 'myPlanet' | 'messages' | 'settings' | 'starMap' | 'events'
  Icon: LucideIcon
  badge?: boolean
  // Requires an account — see proxy.ts's matcher, the actual source of truth
  // for which routes bounce a signed-out visitor to /sign-in.
  gated?: boolean
}

const MAIN_ITEMS: NavItem[] = [
  { href: '/', labelKey: 'home', Icon: Home },
  { href: '/stream', labelKey: 'stream', Icon: Waves, gated: true },
  { href: '/resonance', labelKey: 'resonance', Icon: CircleDot, gated: true },
  { href: '/activities', labelKey: 'events', Icon: CalendarDays, gated: true },
  { href: '/star-map', labelKey: 'starMap', Icon: Sparkles, gated: true },
]

const GALAXIES_ITEM: NavItem = { href: '/galaxies', labelKey: 'galaxies', Icon: Globe2 }
const MY_PLANET_ITEM: NavItem = { href: '/my-planet', labelKey: 'myPlanet', Icon: Orbit, badge: true, gated: true }

const MOBILE_TABS: NavItem[] = [
  { href: '/', labelKey: 'home', Icon: Home },
  { href: '/stream', labelKey: 'stream', Icon: Waves, gated: true },
  { href: '/resonance', labelKey: 'resonance', Icon: CircleDot, gated: true },
  { href: '/galaxies', labelKey: 'galaxies', Icon: Globe2 },
  { href: '/my-planet', labelKey: 'myPlanet', Icon: Orbit, badge: true, gated: true },
]

interface Props {
  personalMapActive?: boolean
  collapsed: boolean
  onToggle: () => void
}

function isRouteActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function SectionLabel({ children, collapsed }: { children: string; collapsed: boolean }) {
  return (
    <div
      className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/34"
      style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}
    >
      {children}
    </div>
  )
}

function NavLink({ item, active, collapsed, level, label, showLock, lockLabel }: { item: NavItem; active: boolean; collapsed: boolean; level: number; label: string; showLock: boolean; lockLabel: string }) {
  return (
    <Link
      href={item.href}
      title={collapsed ? (showLock ? `${label} — ${lockLabel}` : label) : undefined}
      aria-current={active ? 'page' : undefined}
      className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium no-underline transition-colors hover:bg-white/5"
      style={{
        color: active ? '#fff' : 'rgba(255,255,255,0.62)',
        background: active ? 'rgba(124,58,237,0.20)' : 'transparent',
        boxShadow: active ? 'inset 2px 0 0 rgba(167,139,250,0.95)' : 'none',
      }}
    >
      <item.Icon size={18} strokeWidth={active ? 2.1 : 1.7} className="shrink-0" />
      <span
        className="flex min-w-0 flex-1 items-center gap-2 truncate"
        style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}
      >
        <span className="truncate">{label}</span>
        {item.badge && <LevelBadge level={level} size="sm" />}
        {showLock && (
          <Lock size={11} strokeWidth={2} className="shrink-0 opacity-50" aria-hidden="true" />
        )}
      </span>
    </Link>
  )
}

function SubMenu({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SubLink({ href, label, active, Icon }: { href: string; label: string; active: boolean; Icon: LucideIcon }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="ml-4 mt-1 flex h-8 items-center gap-2 rounded-lg px-2.5 text-xs font-medium no-underline transition-colors hover:bg-white/5"
      style={{
        color: active ? '#f5f3ff' : 'rgba(255,255,255,0.48)',
        background: active ? 'rgba(124,58,237,0.16)' : 'transparent',
      }}
    >
      <Icon size={15} className="shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export default function SideNav({ collapsed, onToggle, personalMapActive = false }: Props) {
  const pathname = usePathname()
  const tNav = useTranslations('nav')
  const tA11y = useTranslations('a11y')
  const { data: session } = authClient.useSession()
  const hydrated = useHydrated()
  const isAuthenticated = hydrated && !!session?.user
  const sessionLevel = (session?.user as { userLevel?: unknown } | undefined)?.userLevel
  const [userLevel, setUserLevel] = useState(typeof sessionLevel === 'number' ? sessionLevel : 1)

  const currentUserLevel = clampLevel(isAuthenticated ? userLevel : 1)
  const levelDotColor = LEVEL_DOT_COLORS[currentUserLevel]
  const lockLabel = tNav('signInRequired')
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
  const galaxiesActive = isRouteActive(pathname, '/galaxies')
  const myPlanetActive = isRouteActive(pathname, '/my-planet')
  const mySpaceActive = personalMapActive || myPlanetActive || pathname === '/saved' || pathname === '/relationships'
  const showMyPlanetSubItems = !collapsed && mySpaceActive

  useEffect(() => {
    const root = document.documentElement

    function syncSidebarVariables() {
      const desktop = window.matchMedia('(min-width: 768px)').matches
      root.style.setProperty('--sidebar-w-collapsed', desktop ? `${SIDEBAR_COLLAPSED_WIDTH}px` : '0px')
      root.style.setProperty('--sidebar-w-expanded', desktop ? `${SIDEBAR_EXPANDED_WIDTH}px` : '0px')
    }

    syncSidebarVariables()
    window.addEventListener('resize', syncSidebarVariables)

    return () => window.removeEventListener('resize', syncSidebarVariables)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false

    async function loadUserSummary() {
      const response = await fetch('/api/me', { cache: 'no-store' })
      if (!response.ok) return

      const data = (await response.json()) as MeResponse
      if (cancelled) return

      setUserLevel(data.user?.userLevel ?? (typeof sessionLevel === 'number' ? sessionLevel : 1))
    }

    void loadUserSummary()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, sessionLevel])

  return (
    <>
      <aside
        aria-label={tA11y('sideNav')}
        className="fixed bottom-0 left-0 top-(--nav-h) z-40 hidden overflow-hidden border-r border-white/6 bg-[#090d18]/95 backdrop-blur-xl transition-[width] duration-300 ease-out md:block"
        style={{ width }}
      >
        <nav className="flex h-full w-55 flex-col px-1.5 py-4">
          <SectionLabel collapsed={collapsed}>{tNav('main')}</SectionLabel>
          <div className="space-y-1">
            {MAIN_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                label={tNav(item.labelKey)}
                active={isRouteActive(pathname, item.href) && !(personalMapActive && item.href === '/star-map')}
                collapsed={collapsed}
                level={currentUserLevel}
                showLock={!!item.gated && !isAuthenticated}
                lockLabel={lockLabel}
              />
            ))}

            <NavLink item={GALAXIES_ITEM} label={tNav('galaxies')} active={galaxiesActive} collapsed={collapsed} level={currentUserLevel} showLock={false} lockLabel={lockLabel} />
          </div>

          <SectionLabel collapsed={collapsed}>{tNav('mySpace')}</SectionLabel>
          <div className="space-y-1">
            <NavLink
              item={MY_PLANET_ITEM}
              label={tNav('myPlanet')}
              active={myPlanetActive}
              collapsed={collapsed}
              level={currentUserLevel}
              showLock={!isAuthenticated}
              lockLabel={lockLabel}
            />
            <SubMenu open={showMyPlanetSubItems}>
              <SubLink href="/star-map?mode=personal" label={tNav('personalStarMap')} active={personalMapActive} Icon={Sparkles} />
              <SubLink href="/saved" label={tNav('savedOrbit')} active={isRouteActive(pathname, '/saved')} Icon={Orbit} />
              <SubLink href="/relationships" label={tNav('relationships')} active={isRouteActive(pathname, '/relationships')} Icon={Globe2} />
              <SubLink href="/my-planet/customize" label={tNav('customizePlanet')} active={isRouteActive(pathname, '/my-planet/customize')} Icon={Orbit} />
              <SubLink href="/my-planet/report" label={tNav('matchReport')} active={isRouteActive(pathname, '/my-planet/report')} Icon={CircleDot} />
            </SubMenu>
          </div>

          <NavLink item={{ href: '/messages', labelKey: 'messages', Icon: MessageCircle, gated: true }} level={currentUserLevel} label={tNav('messages')} active={isRouteActive(pathname, '/messages')} collapsed={collapsed} showLock={!isAuthenticated} lockLabel={lockLabel} />

          <SectionLabel collapsed={collapsed}>{tNav('account')}</SectionLabel>
          <div className="space-y-1">
            <NavLink
              item={{ href: '/settings/planet', labelKey: 'settings', Icon: Settings, gated: true }}
              label={tNav('settings')}
              active={isRouteActive(pathname, '/settings')}
              collapsed={collapsed}
              level={currentUserLevel}
              showLock={!isAuthenticated}
              lockLabel={lockLabel}
            />
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onToggle}
            className="mb-1 flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-white/42 transition hover:bg-white/5 hover:text-white/72"
            aria-label={tNav(collapsed ? 'expandSidebar' : 'collapseSidebar')}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}>
              {tNav('collapse')}
            </span>
          </button>
        </nav>
      </aside>

      <nav
        aria-label={tA11y('mobileNav')}
        className="fixed inset-x-0 bottom-0 z-50 grid h-16 grid-cols-5 border-t border-white/8 bg-[#090d18]/96 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        {MOBILE_TABS.map((item) => {
          const active = isRouteActive(pathname, item.href)
          const Icon = item.Icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="relative flex min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-medium no-underline transition-colors"
              style={{ color: active ? '#c4b5fd' : 'rgba(255,255,255,0.44)' }}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
                {item.badge && isAuthenticated && (
                  <span
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-[#090d18]"
                    style={{ background: levelDotColor, boxShadow: `0 0 8px ${levelDotColor}88` }}
                    aria-hidden="true"
                  />
                )}
                {item.gated && !isAuthenticated && (
                  <Lock
                    size={10}
                    strokeWidth={2.4}
                    className="absolute -right-1.5 -top-1 rounded-full bg-[#090d18] p-0.5 opacity-70"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="max-w-full truncate">{tNav(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
