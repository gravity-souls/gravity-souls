'use client'

import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/contexts/language-context'
import type { Language } from '@/contexts/language-context'
import { authClient } from '@/lib/auth-client'

const emptySubscribe = () => () => {}
function useHydrated() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false)
}

// --- Top nav links ------------------------------------------------------------
// Keep this lean  -  sidebar carries full navigation for inner pages.
// Top nav is primarily for the homepage + macro discovery.

const EXPLORE_LINKS = [
  { href: '/galaxies', label: 'Galaxies', labelZh: '星系' },
  { href: '/stream',   label: 'Stream',   labelZh: '星流' },
]

const LANGS: { value: Language; label: string }[] = [
  { value: 'en',    label: 'EN' },
  { value: 'zh-CN', label: '中' },
]

// --- Nav ----------------------------------------------------------------------

export default function Nav() {
  const { lang, setLang } = useLanguage()
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const hydrated = useHydrated()
  const isAuthenticated = hydrated && !!session?.user

  // Show expanded nav links only on the homepage / top-level pages.
  // Inner pages rely on the SideNav.
  const isHomepage = pathname === '/'

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
      style={{
        height: 'var(--nav-h)',
        paddingInline: 'clamp(16px, 4vw, 40px)',
      }}
    >
      {/* Frosted glass background */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(3,3,15,0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--border-soft)',
        }}
        aria-hidden="true"
      />

      {/* -- Logo ------------------------------------------------------------ */}
      <Link
        href="/"
        className="relative z-10 flex items-center gap-2.5 group"
        style={{ textDecoration: 'none' }}
      >
        {/* Animated orbit dot */}
        <div className="relative w-5 h-5 shrink-0" aria-hidden="true">
          <div
            className="absolute inset-0 rounded-full animate-pulse-glow"
            style={{ background: 'rgba(124,58,237,0.3)', boxShadow: '0 0 0 1px rgba(167,139,250,0.3)' }}
          />
          <div
            className="absolute inset-[4px] rounded-full"
            style={{ background: 'var(--star)' }}
          />
        </div>

        <span
          className="text-xs font-semibold tracking-[0.22em] uppercase transition-colors duration-200"
          style={{ color: pathname === '/' ? 'var(--foreground)' : 'var(--ink)' }}
        >
          Gravity-Souls
        </span>
      </Link>

      {/* -- Right side ------------------------------------------------------ */}
      <nav className="relative z-10 flex items-center gap-0.5" role="navigation" aria-label="Primary">

        {/* Explore links  -  hidden on mobile to prevent overflow */}
        {EXPLORE_LINKS.map(({ href, label, labelZh }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          const displayLabel = lang === 'zh-CN' ? labelZh : label

          return (
            <Link
              key={href}
              href={href}
              className="relative hidden sm:block px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors duration-200 nav-item"
              style={{
                color: isActive ? 'var(--foreground)' : 'var(--ghost)',
                background: isActive ? 'rgba(255,255,255,0.04)' : 'transparent',
                textDecoration: 'none',
              }}
            >
              {isActive && (
                <span
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: 'var(--star)', boxShadow: '0 0 6px var(--star)' }}
                  aria-hidden="true"
                />
              )}
              {displayLabel}
            </Link>
          )
        })}

        {/* Separator  -  desktop only */}
        <div
          className="hidden sm:block mx-2 w-px self-stretch"
          style={{ background: 'var(--border-soft)', marginBlock: 8 }}
          aria-hidden="true"
        />

        {/* My Planet shortcut  -  desktop only */}
        <Link
          href="/my-planet"
          className="hidden sm:block px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors duration-200"
          style={{
            color: pathname === '/my-planet' ? 'var(--star)' : 'var(--ghost)',
            background: pathname === '/my-planet' ? 'rgba(124,58,237,0.10)' : 'transparent',
            textDecoration: 'none',
          }}
          aria-label={lang === 'zh-CN' ? '我的星球' : 'My Planet'}
        >
          <span
            className="inline-block w-2 h-2 rounded-full align-middle mr-1.5"
            style={{
              background: 'var(--star)',
              boxShadow: pathname === '/my-planet' ? '0 0 6px var(--star)' : 'none',
              opacity: pathname === '/my-planet' ? 1 : 0.5,
            }}
            aria-hidden="true"
          />
          {lang === 'zh-CN' ? '我的星球' : 'My Planet'}
        </Link>

        {/* Create Planet  -  visible on all screen sizes, abbreviated on mobile */}
        <Link
          href="/create-planet"
          className="ml-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-all duration-200"
          style={{
            color: 'var(--foreground)',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(79,70,229,0.30) 100%)',
            border: '1px solid var(--border-accent)',
            textDecoration: 'none',
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
          <span className="hidden sm:inline">{lang === 'zh-CN' ? '创建星球' : 'Create Planet'}</span>
          <span className="sm:hidden" aria-label="Create Planet">◍</span>
        </Link>

        {/* Separator */}
        <div
          className="mx-2 w-px self-stretch"
          style={{ background: 'var(--border-soft)', marginBlock: 8 }}
          aria-hidden="true"
        />

        {/* Sign In  -  visible only when not authenticated */}
        {!isAuthenticated && (
          <Link
            href="/sign-in"
            className="px-3.5 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors duration-200"
            style={{
              color: pathname === '/sign-in' ? 'var(--star)' : 'var(--ghost)',
              background: pathname === '/sign-in' ? 'rgba(124,58,237,0.10)' : 'transparent',
              textDecoration: 'none',
            }}
          >
            {lang === 'zh-CN' ? '登录' : 'Sign in'}
          </Link>
        )}

        {/* Language toggle */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{
            border: '1px solid var(--border-soft)',
            background: 'rgba(255,255,255,0.02)',
          }}
          role="group"
          aria-label="Language"
        >
          {LANGS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setLang(value)}
              className="px-3 py-1.5 text-[10px] font-semibold tracking-widest transition-all duration-150"
              style={{
                color: lang === value ? 'var(--star)' : 'var(--ghost)',
                background: lang === value ? 'rgba(124,58,237,0.18)' : 'transparent',
                cursor: 'pointer',
                border: 'none',
                textShadow: lang === value ? '0 0 8px rgba(167,139,250,0.6)' : 'none',
              }}
              aria-pressed={lang === value}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
    </header>
  )
}
