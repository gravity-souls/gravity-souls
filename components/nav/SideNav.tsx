'use client'

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Globe2,
  Home,
  Languages,
  Orbit,
  Settings,
  Telescope,
  Waves,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { clampLevel } from '@/lib/xp'
import { useLanguage, type Language } from '@/contexts/language-context'
import LevelBadge from '@/components/planet/LevelBadge'

const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

const SIDEBAR_COLLAPSED_WIDTH = 40
const SIDEBAR_EXPANDED_WIDTH = 220

const LANGS: { value: Language; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh-CN', label: '中' },
]

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
  label: string
  Icon: LucideIcon
  badge?: boolean
}

const MAIN_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/stream', label: 'Stream', Icon: Waves },
  { href: '/resonance', label: 'Resonance', Icon: CircleDot },
]

const GALAXIES_ITEM: NavItem = { href: '/galaxies', label: 'Galaxies', Icon: Globe2 }
const MY_PLANET_ITEM: NavItem = { href: '/my-planet', label: 'My Planet', Icon: Orbit, badge: true }

const MOBILE_TABS: NavItem[] = [
  { href: '/', label: 'Home', Icon: Home },
  { href: '/stream', label: 'Stream', Icon: Waves },
  { href: '/resonance', label: 'Resonance', Icon: CircleDot },
  { href: '/galaxies', label: 'Galaxies', Icon: Globe2 },
  { href: '/my-planet', label: 'My Planet', Icon: Orbit, badge: true },
]

interface Props {
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

function NavLink({ item, active, collapsed, level }: { item: NavItem; active: boolean; collapsed: boolean; level: number }) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
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
        <span className="truncate">{item.label}</span>
        {item.badge && <LevelBadge level={level} size="sm" />}
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

export default function SideNav({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
  const { lang, setLang } = useLanguage()
  const { data: session } = authClient.useSession()
  const hydrated = useHydrated()
  const isAuthenticated = hydrated && !!session?.user
  const sessionLevel = (session?.user as { userLevel?: unknown } | undefined)?.userLevel
  const [userLevel, setUserLevel] = useState(typeof sessionLevel === 'number' ? sessionLevel : 1)
  const [galaxiesExpanded, setGalaxiesExpanded] = useState(false)

  const currentUserLevel = clampLevel(isAuthenticated ? userLevel : 1)
  const levelDotColor = LEVEL_DOT_COLORS[currentUserLevel]
  const width = collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH
  const galaxiesActive = isRouteActive(pathname, '/galaxies')
  const myPlanetActive = isRouteActive(pathname, '/my-planet') || isRouteActive(pathname, '/universe/demo')
  const showGalaxiesSubItems = !collapsed && (galaxiesActive || galaxiesExpanded)
  const showMyPlanetSubItems = !collapsed && myPlanetActive

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
        aria-label="Side navigation"
        className="fixed bottom-0 left-0 top-(--nav-h) z-40 hidden overflow-hidden border-r border-white/6 bg-[#090d18]/95 backdrop-blur-xl transition-[width] duration-300 ease-out md:block"
        style={{ width }}
      >
        <nav className="flex h-full w-55 flex-col px-1.5 py-4">
          <SectionLabel collapsed={collapsed}>Main</SectionLabel>
          <div className="space-y-1">
            {MAIN_ITEMS.map((item) => (
              <NavLink key={item.href} item={item} active={isRouteActive(pathname, item.href)} collapsed={collapsed} level={currentUserLevel} />
            ))}

            <div>
              <div
                className="grid h-10 grid-cols-[1fr_32px] items-center rounded-lg transition-colors hover:bg-white/5"
                style={{
                  background: galaxiesActive ? 'rgba(124,58,237,0.20)' : 'transparent',
                  boxShadow: galaxiesActive ? 'inset 2px 0 0 rgba(167,139,250,0.95)' : 'none',
                }}
              >
                <Link
                  href={GALAXIES_ITEM.href}
                  title={collapsed ? GALAXIES_ITEM.label : undefined}
                  aria-current={galaxiesActive ? 'page' : undefined}
                  className="flex min-w-0 items-center gap-3 px-2.5 text-sm font-medium no-underline"
                  style={{ color: galaxiesActive ? '#fff' : 'rgba(255,255,255,0.62)' }}
                >
                  <Globe2 size={18} strokeWidth={galaxiesActive ? 2.1 : 1.7} className="shrink-0" />
                  <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}>
                    Galaxies
                  </span>
                </Link>
                {!collapsed && (
                  <button
                    type="button"
                    onClick={() => setGalaxiesExpanded((value) => !value)}
                    aria-label={showGalaxiesSubItems ? 'Collapse galaxy links' : 'Expand galaxy links'}
                    aria-expanded={showGalaxiesSubItems}
                    className="mr-1 flex h-7 w-7 items-center justify-center rounded-lg text-white/38 transition hover:bg-white/6 hover:text-white/72"
                  >
                    <ChevronDown size={15} className={showGalaxiesSubItems ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                )}
              </div>
              <SubMenu open={showGalaxiesSubItems}>
                <SubLink href="/galaxies/events" label="Events" active={isRouteActive(pathname, '/galaxies/events')} Icon={CalendarDays} />
              </SubMenu>
            </div>
          </div>

          <SectionLabel collapsed={collapsed}>My Space</SectionLabel>
          <div className="space-y-1">
            <NavLink item={MY_PLANET_ITEM} active={myPlanetActive} collapsed={collapsed} level={currentUserLevel} />
            <SubMenu open={showMyPlanetSubItems}>
              <SubLink href="/my-planet/customize" label="Customize Planet" active={isRouteActive(pathname, '/my-planet/customize')} Icon={Orbit} />
              <SubLink href="/my-planet/report" label="Match Report" active={isRouteActive(pathname, '/my-planet/report')} Icon={CircleDot} />
              <SubLink href="/universe/demo" label="Universe View" active={isRouteActive(pathname, '/universe/demo')} Icon={Telescope} />
            </SubMenu>
          </div>

          <SectionLabel collapsed={collapsed}>Account</SectionLabel>
          <div className="space-y-1">
            <NavLink item={{ href: '/settings/planet', label: 'Settings', Icon: Settings }} active={isRouteActive(pathname, '/settings')} collapsed={collapsed} level={currentUserLevel} />
            <div className="flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-white/62">
              <Languages size={18} className="shrink-0" />
              <div
                className="flex min-w-0 flex-1 items-center justify-between gap-2"
                style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease', pointerEvents: collapsed ? 'none' : 'auto' }}
              >
                <span>Language</span>
                <span className="flex overflow-hidden rounded-lg border border-white/8 bg-white/3" role="group" aria-label="Language">
                  {LANGS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLang(value)}
                      aria-pressed={lang === value}
                      className="px-2 py-1 text-[10px] font-semibold tracking-widest transition-colors"
                      style={{
                        color: lang === value ? '#c4b5fd' : 'rgba(255,255,255,0.36)',
                        background: lang === value ? 'rgba(124,58,237,0.18)' : 'transparent',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          <button
            type="button"
            onClick={onToggle}
            className="mb-1 flex h-10 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-white/42 transition hover:bg-white/5 hover:text-white/72"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span style={{ opacity: collapsed ? 0 : 1, transition: 'opacity 150ms ease', whiteSpace: 'nowrap' }}>
              Collapse
            </span>
          </button>
        </nav>
      </aside>

      <nav
        aria-label="Mobile navigation"
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
                {item.badge && (
                  <span
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-[#090d18]"
                    style={{ background: levelDotColor, boxShadow: `0 0 8px ${levelDotColor}88` }}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
