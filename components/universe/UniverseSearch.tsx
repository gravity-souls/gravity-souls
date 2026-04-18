'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { mockPlanets } from '@/lib/mock-planets'
import { searchGalaxies } from '@/lib/mock-galaxies'
import type { PlanetProfile } from '@/types/planet'
import type { Galaxy } from '@/types/galaxy'

interface Props {
  onPlanetSelect?: (planet: PlanetProfile) => void
  placeholder?: string
}

// --- Quick keyword chips -----------------------------------------------------

const QUICK_CHIPS = [
  { label: '搭子',     q: 'community' },
  { label: '孤独',     q: 'introspection' },
  { label: '深夜',     q: 'slow living' },
  { label: '文艺表达', q: 'art' },
  { label: '旅行',     q: 'travel' },
  { label: '思考',     q: 'philosophy' },
]

// --- UniverseSearch ----------------------------------------------------------

export default function UniverseSearch({ onPlanetSelect, placeholder }: Props) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const trimmed = query.trim()
  const showDropdown = focused && trimmed.length >= 1

  // Search results
  const matchedGalaxies: Galaxy[] = showDropdown ? searchGalaxies(trimmed).slice(0, 3) : []
  const matchedPlanets: PlanetProfile[] = showDropdown
    ? mockPlanets.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          p.coreThemes.some((t) => t.toLowerCase().includes(trimmed.toLowerCase())) ||
          p.tagline?.toLowerCase().includes(trimmed.toLowerCase())
      ).slice(0, 4)
    : []

  const hasResults = matchedGalaxies.length > 0 || matchedPlanets.length > 0

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (trimmed) {
      router.push(`/galaxies?q=${encodeURIComponent(trimmed)}`)
      setQuery('')
      setFocused(false)
    }
  }

  function handlePlanetClick(planet: PlanetProfile) {
    setQuery('')
    setFocused(false)
    onPlanetSelect?.(planet)
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-4">
      {/* -- Search input -------------------------------------------------- */}
      <div className="relative">
        <form onSubmit={handleSubmit}>
          <div
            className="relative flex items-center rounded-2xl transition-all duration-300"
            style={{
              background:     'rgba(18,14,52,0.75)',
              backdropFilter: 'blur(20px)',
              border:         `1px solid ${focused ? 'var(--border-accent)' : 'var(--border-mid)'}`,
              boxShadow:      focused ? 'var(--glow-sm)' : 'var(--shadow-card)',
            }}
          >
            {/* Search icon */}
            <span
              className="pl-5 shrink-0 text-base leading-none"
              style={{ color: focused ? 'var(--star)' : 'var(--ghost)', transition: 'color 200ms ease' }}
              aria-hidden="true"
            >
              ◎
            </span>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              placeholder={placeholder ?? 'Search themes, galaxies, cities… 搜索关键词'}
              className="flex-1 bg-transparent outline-none px-4 py-4 text-sm"
              style={{
                color:       'var(--foreground)',
                caretColor:  'var(--star)',
              }}
              autoComplete="off"
              spellCheck={false}
            />

            {/* Clear button */}
            {trimmed && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus() }}
                className="pr-4 text-sm transition-colors duration-150"
                style={{ color: 'var(--ghost)', cursor: 'pointer', background: 'none', border: 'none' }}
                aria-label="Clear search"
              >
                ×
              </button>
            )}

            {/* Search submit */}
            {trimmed && (
              <button
                type="submit"
                className="mr-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200"
                style={{
                  color:      'var(--foreground)',
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.4), rgba(79,70,229,0.3))',
                  border:     '1px solid var(--border-accent)',
                  cursor:     'pointer',
                }}
              >
                Search
              </button>
            )}
          </div>
        </form>

        {/* -- Dropdown results ---------------------------------------------- */}
        {showDropdown && (
          <div
            className="absolute left-0 right-0 top-full mt-2 rounded-2xl overflow-hidden z-50"
            style={{
              background:     'rgba(12,8,36,0.96)',
              backdropFilter: 'blur(24px)',
              border:         '1px solid var(--border-mid)',
              boxShadow:      'var(--shadow-panel)',
            }}
          >
            {!hasResults && (
              <div className="px-5 py-4 text-sm" style={{ color: 'var(--ghost)' }}>
                No results for "{trimmed}"
              </div>
            )}

            {/* Galaxy results */}
            {matchedGalaxies.length > 0 && (
              <div className="px-2 pt-2">
                <p className="text-data-label px-3 mb-1.5">Galaxies</p>
                {matchedGalaxies.map((g) => (
                  <Link
                    key={g.id}
                    href={`/galaxy/${g.slug}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                    style={{ textDecoration: 'none' }}
                    onClick={() => setFocused(false)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                      style={{ background: `${g.accentColor}18`, color: g.accentColor, border: `1px solid ${g.accentColor}30` }}
                    >
                      {g.symbol}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{g.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>{g.tagline}</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: 'var(--dim)' }}>→</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Planet results */}
            {matchedPlanets.length > 0 && (
              <div className="px-2 py-2">
                <p className="text-data-label px-3 mb-1.5">Planets</p>
                {matchedPlanets.map((p) => (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                    onClick={() => handlePlanetClick(p)}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                      style={{
                        background: `${p.visual.coreColor}22`,
                        color:      p.visual.coreColor,
                        boxShadow:  `0 0 8px ${p.visual.coreColor}30`,
                      }}
                    >
                      {p.avatarSymbol}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{p.name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--ghost)' }}>{p.tagline}</p>
                    </div>
                    <span className="text-xs shrink-0" style={{ color: 'var(--dim)' }}>Preview</span>
                  </button>
                ))}
              </div>
            )}

            {/* View all in galaxies */}
            {trimmed && (
              <div className="px-2 pb-2">
                <Link
                  href={`/galaxies?q=${encodeURIComponent(trimmed)}`}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-medium transition-all duration-150"
                  style={{
                    color:      'var(--star)',
                    background: 'rgba(124,58,237,0.06)',
                    border:     '1px solid var(--border-soft)',
                    textDecoration: 'none',
                  }}
                  onClick={() => setFocused(false)}
                >
                  Search all galaxies for "{trimmed}" →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* -- Quick keyword chips -------------------------------------------- */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick search keywords">
        {QUICK_CHIPS.map(({ label, q }) => (
          <Link
            key={label}
            href={`/galaxies?q=${encodeURIComponent(q)}`}
            className="px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-200"
            style={{
              color:      'var(--ink)',
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid var(--border-soft)',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-accent)'
              el.style.color = 'var(--star)'
              el.style.background = 'rgba(124,58,237,0.08)'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-soft)'
              el.style.color = 'var(--ink)'
              el.style.background = 'rgba(255,255,255,0.04)'
            }}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
