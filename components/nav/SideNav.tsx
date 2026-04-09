'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ─── Navigation structure ─────────────────────────────────────────────────────
//
// Three groups mapping to the Gravity-Souls information architecture:
//   Universe  — macro discovery layer
//   My Space  — personal planet + social features
//   Connect   — messaging and relationship layer

interface NavItem {
  href:    string
  label:   string
  symbol:  string
  locked?: boolean  // shown but requires Resonator role
}

interface NavGroup {
  label:  string
  items:  NavItem[]
}

const GROUPS: NavGroup[] = [
  {
    label: 'Universe',
    items: [
      { href: '/',         label: 'Home',     symbol: '⊛' },
      { href: '/galaxies', label: 'Galaxies', symbol: '◈' },
      { href: '/stream',   label: 'Stream',   symbol: '◎' },
    ],
  },
  {
    label: 'My Space',
    items: [
      { href: '/my-planet',   label: 'My Planet',  symbol: '⊙' },
      { href: '/my-universe', label: 'My Universe', symbol: '⊛' },
      { href: '/resonance',   label: 'Resonance',  symbol: '◍' },
      { href: '/saved',       label: 'Saved',      symbol: '◉' },
      { href: '/sbti',        label: 'Soul Scan',  symbol: '◇' },
    ],
  },
  {
    label: 'Connect',
    items: [
      { href: '/messages',      label: 'Messages',      symbol: '◌', locked: false },
      { href: '/relationships', label: 'Relationships', symbol: '◐', locked: false },
    ],
  },
]

// ─── SideNav ──────────────────────────────────────────────────────────────────

interface Props {
  collapsed: boolean
  onToggle:  () => void
}

export default function SideNav({ collapsed, onToggle }: Props) {
  const pathname = usePathname()
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
          background:    'linear-gradient(180deg, rgba(12,8,36,0.92) 0%, rgba(6,4,20,0.96) 100%)',
          backdropFilter: 'blur(20px)',
          borderRight:   '1px solid var(--border-soft)',
        }}
      />

      {/* Vertical accent line */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none"
        style={{
          right:      0,
          width:      1,
          background: 'linear-gradient(180deg, transparent 0%, var(--border-accent) 40%, var(--border-accent) 60%, transparent 100%)',
          opacity:    collapsed ? 0.4 : 0.7,
          transition: `opacity var(--duration-normal) var(--ease-snap)`,
        }}
        aria-hidden="true"
      />

      {/* Nav content — fixed width prevents wrapping during collapse */}
      <nav
        className="relative flex flex-col h-full py-4"
        style={{ width: 'var(--sidebar-w-expanded)' }}
      >
        <div className="flex flex-col flex-1 gap-1 overflow-hidden pt-2">
          {GROUPS.map((group, gi) => (
            <div key={group.label} className="mb-1">

              {/* Group label — only visible when expanded */}
              <div
                className="px-4 mb-1"
                style={{
                  opacity:        collapsed ? 0 : 1,
                  transition:     `opacity var(--duration-fast) var(--ease-snap)`,
                  pointerEvents:  collapsed ? 'none' : 'auto',
                  whiteSpace:     'nowrap',
                }}
              >
                <span className="text-data-label">{group.label}</span>
              </div>

              {/* Items */}
              {group.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl transition-all"
                    style={{
                      color:          isActive ? 'var(--star)' : 'var(--ink)',
                      background:     isActive ? 'rgba(124,58,237,0.12)' : 'transparent',
                      border:         isActive ? '1px solid var(--border-accent)' : '1px solid transparent',
                      textDecoration: 'none',
                      opacity:        item.locked ? 0.45 : 1,
                    }}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={item.locked}
                    tabIndex={item.locked ? -1 : undefined}
                  >
                    {/* Symbol orb */}
                    <div
                      className="shrink-0 flex items-center justify-center w-6 h-6 text-sm leading-none"
                      style={{
                        color:      isActive ? 'var(--star)' : item.locked ? 'var(--dim)' : 'var(--ghost)',
                        textShadow: isActive ? '0 0 8px var(--star)' : 'none',
                        transition: 'color var(--duration-normal), text-shadow var(--duration-normal)',
                      }}
                    >
                      {item.symbol}
                    </div>

                    {/* Label */}
                    <span
                      className="text-xs font-medium tracking-wide leading-none flex-1"
                      style={{
                        opacity:    collapsed ? 0 : 1,
                        transition: `opacity var(--duration-fast) var(--ease-snap)`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.label}
                    </span>

                    {/* Active dot */}
                    {isActive && !collapsed && (
                      <div
                        className="shrink-0 w-1.5 h-1.5 rounded-full"
                        style={{
                          background: 'var(--star)',
                          boxShadow:  '0 0 6px var(--star)',
                        }}
                      />
                    )}
                  </Link>
                )
              })}

              {/* Group divider */}
              {gi < GROUPS.length - 1 && (
                <div className="nav-divider my-1" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>

        {/* Create Planet — bottom action */}
        <div
          className="mx-2 mb-2"
          style={{
            opacity:    collapsed ? 0 : 1,
            transition: `opacity var(--duration-fast) var(--ease-snap)`,
            pointerEvents: collapsed ? 'none' : 'auto',
          }}
        >
          <Link
            href="/create-planet"
            className="flex items-center justify-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-medium tracking-wide transition-all"
            style={{
              color:          'var(--foreground)',
              background:     'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(79,70,229,0.20) 100%)',
              border:         '1px solid var(--border-accent)',
              textDecoration: 'none',
              whiteSpace:     'nowrap',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-bright)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'var(--glow-sm)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
          >
            <span>◍</span>
            Create Planet
          </Link>
        </div>

        {/* Toggle button */}
        <div className="pt-3 border-t" style={{ borderColor: 'var(--border-soft)', margin: '0 8px' }}>
          <button
            onClick={onToggle}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
            style={{
              color:      'var(--ghost)',
              background: 'transparent',
              border:     '1px solid transparent',
              cursor:     'pointer',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--ghost)'
            }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <div className="shrink-0 w-6 h-6 flex items-center justify-center text-xs">
              {collapsed ? '›' : '‹'}
            </div>
            <span
              className="text-xs tracking-wide"
              style={{
                opacity:    collapsed ? 0 : 1,
                transition: `opacity var(--duration-fast) var(--ease-snap)`,
                whiteSpace: 'nowrap',
              }}
            >
              Collapse
            </span>
          </button>
        </div>
      </nav>
    </aside>
  )
}
