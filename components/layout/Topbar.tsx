'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, LogOut, MessageCircle, Search, Settings, UserCircle } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { PRESET_PLANETS, type PlanetConfig } from '@/types/planet'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import NotificationBell from '@/components/ui/NotificationBell'

const PlanetGlobe = dynamic(() => import('@/components/planet/PlanetGlobe'), { ssr: false })
const FALLBACK_PLANET_CONFIG: PlanetConfig = PRESET_PLANETS[0] ?? {
  baseTexture: 'jupiter.jpg',
  tintColor: '#7c4dbf',
  atmosphereColor: '#b39ddb',
  atmosphereDensity: 0.12,
  hasRing: true,
  ringColor: '#9b7de0',
  rotationSpeed: 0.018,
  cloudOpacity: 0,
}

interface MeResponse {
  user?: {
    name?: string | null
    planetConfig?: PlanetConfig | null
  }
}

export default function Topbar() {
  const router = useRouter()
  const tNav = useTranslations('nav')
  const tTopbar = useTranslations('topbar')
  const tAuth = useTranslations('auth')
  const tA11y = useTranslations('a11y')
  const { data: session } = authClient.useSession()
  const [query, setQuery] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [planetConfig, setPlanetConfig] = useState<PlanetConfig | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const currentPlanetConfig = session?.user?.id ? planetConfig : null
  const topbarPlanetConfig = currentPlanetConfig ?? FALLBACK_PLANET_CONFIG

  useEffect(() => {
    if (!session?.user?.id) return

    let cancelled = false

    async function loadProfile() {
      const response = await fetch('/api/me', { cache: 'no-store' })
      if (!response.ok) return

      const data = (await response.json()) as MeResponse
      if (!cancelled) setPlanetConfig(data.user?.planetConfig ?? null)
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (!isMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMenuOpen])

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    setIsMenuOpen(false)
    router.push('/sign-in')
    router.refresh()
  }

  const userName = session?.user?.name ?? 'Explorer'

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-[#060914]/88 backdrop-blur-xl"
      style={{ height: 'var(--nav-h)' }}
    >
      <div className="grid h-full w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 sm:px-4 md:grid-cols-[220px_minmax(280px,1fr)_auto] lg:px-5">
        <Link href="/" aria-label={tA11y('homeNav')} className="flex min-w-0 items-center gap-2 justify-self-start text-white no-underline">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-300/20 bg-violet-400/12 text-sm font-semibold text-violet-100 shadow-[0_0_24px_rgba(124,58,237,0.18)]">
            GS
          </span>
          <span className="hidden text-sm font-semibold tracking-wide text-white/90 sm:block">Gravity Souls</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden w-full max-w-2xl items-center justify-self-center md:flex">
          <label className="relative w-full">
            <span className="sr-only">{tTopbar('searchPlaceholder')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/34" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tTopbar('searchPlaceholder')}
              className="h-10 w-full rounded-full border border-white/10 bg-white/4.5 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-300/45 focus:bg-white/[0.07]"
            />
          </label>
        </form>

        <div className="flex shrink-0 items-center justify-end gap-2 justify-self-end">
          <NotificationBell />
          <LanguageSwitcher variant="desktop" />

          {/* TODO: replace this placeholder with the dedicated chat system entry point. */}
          <Link
            href="/stream"
            aria-label={tA11y('messages')}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/4 text-white/72 transition hover:bg-white/8 hover:text-white md:hidden"
          >
            <MessageCircle className="h-4.5 w-4.5" />
          </Link>

          {session?.user ? (
            <div className="relative hidden md:block" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-label={tA11y('openUserMenu')}
                aria-expanded={isMenuOpen}
                className="flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/4.5 py-1 pl-1 pr-3 text-white/80 transition hover:bg-white/8 hover:text-white"
              >
                <PlanetGlobe planetConfig={topbarPlanetConfig} size={32} framing="avatar" />
                <span className="max-w-32 truncate text-sm font-semibold">{userName}</span>
                <ChevronDown className="h-4 w-4 text-white/38" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#090d18]/95 py-1 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <Link
                    href="/my-planet"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/76 no-underline transition hover:bg-white/6 hover:text-white"
                  >
                    <UserCircle className="h-4 w-4" />
                    {tNav('myPlanet')}
                  </Link>
                  <Link
                    href="/settings/planet"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-white/76 no-underline transition hover:bg-white/6 hover:text-white"
                  >
                    <Settings className="h-4 w-4" />
                    {tNav('settings')}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-white/76 transition hover:bg-white/6 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    {tNav('signOut')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/sign-in"
              className="hidden rounded-full border border-violet-300/20 bg-violet-400/12 px-4 py-2 text-sm font-semibold text-violet-100 no-underline transition hover:bg-violet-400/18 md:inline-flex"
            >
              {tAuth('signIn')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
