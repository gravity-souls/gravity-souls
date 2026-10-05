'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'

export const MOBILE_EXPLORE_LINKS = [
  { href: '/', key: 'home' },
  { href: '/stream', key: 'stream' },
  { href: '/discover', key: 'discover' },
  { href: '/star-map', key: 'starMap' },
  { href: '/resonance', key: 'resonance' },
  { href: '/galaxies', key: 'galaxies' },
  { href: '/activities', key: 'events' },
  { href: '/relationships', key: 'relationships' },
  { href: '/star-map?mode=personal', key: 'personalStarMap' },
  { href: '/saved', key: 'savedOrbit' },
  { href: '/search', key: 'search' },
  { href: '/my-planet/customize', key: 'customizePlanet' },
  { href: '/my-planet/report', key: 'matchReport' },
] as const

export default function MobileExploreMenu({
  onNavigate,
}: {
  onNavigate: () => void
}) {
  const t = useTranslations('nav')
  const tTopbar = useTranslations('topbar')
  const router = useRouter()
  const [query, setQuery] = useState('')
  return (
    <nav
      className="border-b border-white/10 pb-1 md:hidden"
      aria-label={t('allSections')}
    >
      <form
        className="flex gap-2 px-3 py-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!query.trim()) return
          router.push(`/search?q=${encodeURIComponent(query.trim())}`)
          onNavigate()
        }}
      >
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={tTopbar('searchPlaceholder')}
          placeholder={tTopbar('searchPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-xs text-white"
        />
        <button className="text-xs text-violet-200" type="submit">
          {t('search')}
        </button>
      </form>
      <p className="px-3 py-2 text-xs text-slate-400">{t('allSections')}</p>
      {MOBILE_EXPLORE_LINKS.map(({ href, key }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className="block px-3 py-2.5 text-sm text-white/80 hover:bg-white/6"
        >
          {t(key)}
        </Link>
      ))}
    </nav>
  )
}
