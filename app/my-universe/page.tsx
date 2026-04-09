'use client'

import { useEffect, useState } from 'react'
import GlowButton from '@/components/ui/GlowButton'
import UniverseProfileCard from '@/components/universe/UniverseProfileCard'
import { getUserUniverse, type StoredUniverse } from '@/lib/user'
import { useLanguage } from '@/contexts/language-context'
import { t } from '@/lib/translations'

export default function MyUniversePage() {
  const { lang } = useLanguage()
  const [universe, setUniverse] = useState<StoredUniverse | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setUniverse(getUserUniverse())
    setLoaded(true)
  }, [])

  // Avoid flash of empty-state on first render (SSR → client hydration)
  if (!loaded) return null

  return (
    <div className="min-h-screen px-6 pt-8 pb-16 max-w-3xl mx-auto">
      {/* Ambient glow */}
      <div
        className="fixed top-1/3 left-0 pointer-events-none"
        style={{
          width: '360px',
          height: '360px',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.1) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-8 animate-fade-up">
        {/* Page label */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-[0.3em] text-star uppercase opacity-60">
            {t(lang, 'myuniverse.label')}
          </span>
        </div>

        {universe ? (
          <>
            <UniverseProfileCard universe={universe} />

            {/* Metadata strip */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-[rgba(167,139,250,0.08)]">
              <span className="text-xs text-muted opacity-40">
                Created {new Date(universe.createdAt).toLocaleDateString()}
                {universe.mood && (
                  <> · <span className="text-star opacity-60">{universe.mood}</span></>
                )}
              </span>
              <GlowButton href="/discover" variant="ghost" className="text-xs">
                Discover resonances &rarr;
              </GlowButton>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <GlowButton href="/create-universe" variant="secondary" className="py-3 text-sm">
                Reshape this universe
              </GlowButton>
            </div>
          </>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center gap-6 py-24 text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(124,58,237,0.2), rgba(99,102,241,0.06))',
                boxShadow: '0 0 0 1px rgba(167,139,250,0.15), 0 0 40px rgba(124,58,237,0.12)',
              }}
            >
              <span className="text-3xl text-star opacity-60">⊛</span>
            </div>

            <div className="flex flex-col gap-2 max-w-sm">
              <h1 className="text-2xl font-bold text-foreground">
                {t(lang, 'myuniverse.empty.title')}
              </h1>
              <p className="text-sm text-muted leading-relaxed">
                {t(lang, 'myuniverse.empty.subtitle')}
              </p>
            </div>

            <GlowButton href="/create-universe" variant="primary" className="px-8 py-4 text-sm">
              {t(lang, 'myuniverse.empty.cta')}
            </GlowButton>
          </div>
        )}
      </div>
    </div>
  )
}
