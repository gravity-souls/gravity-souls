'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import GlowButton from '@/components/ui/GlowButton'
import LevelBadge from '@/components/planet/LevelBadge'
import type { PlanetConfig, PlanetProfile } from '@/types/planet'
import { resolvePlanetHasRing, resolvePlanetTexture } from '@/lib/planet-textures'

const PlanetGlobe = dynamic(() => import('@/components/planet/PlanetGlobe'), { ssr: false })

// --- Language display ---------------------------------------------------------

const LANG_LABEL: Record<string, string> = {
  zh: '中文', en: 'English', fr: 'Français', de: 'Deutsch',
  ja: '日本語', ko: '한국어', es: 'Español', th: 'ไทย',
}

// --- Viewer-aware action rows -------------------------------------------------

function ExplorerActions() {
  const t = useTranslations('planetPage')

  return (
    <div
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
      style={{
        background: 'rgba(18,14,52,0.60)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(167,139,250,0.12)',
      }}
    >
      <span style={{ color: 'var(--ghost)' }}>{t('explorerSignalRequired')}</span>
      <Link
        href="/onboarding"
        className="font-medium whitespace-nowrap transition-colors duration-150"
        style={{ color: 'var(--star)', textDecoration: 'none' }}
      >
        {t('begin')}
      </Link>
    </div>
  )
}

function ResonatorActions({ planet }: { planet: PlanetProfile }) {
  const t = useTranslations('planetPage')

  return (
    <div className="flex flex-wrap gap-2">
      <GlowButton
        href={`/messages?to=${encodeURIComponent(planet.id)}`}
        variant="primary"
        className="px-5 py-2.5 text-sm"
      >
        {t('sendBeam')}
      </GlowButton>
      <GlowButton
        href={`/saved?add=${planet.id}`}
        variant="secondary"
        className="px-5 py-2.5 text-sm"
      >
        {t('saveOrbit')}
      </GlowButton>
    </div>
  )
}

function SelfActions() {
  const t = useTranslations('planetPage')

  return (
    <div className="flex flex-wrap gap-2">
      <GlowButton href="/settings/planet" variant="secondary" className="px-5 py-2.5 text-sm">
        {t('tuneAtmosphere')}
      </GlowButton>
      <GlowButton href="/sbti?next=/my-planet" variant="ghost" className="px-5 py-2.5 text-sm">
        {t('soulScan')}
      </GlowButton>
    </div>
  )
}

// --- PlanetHero ---------------------------------------------------------------

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(media.matches)

    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return isDesktop
}

function planetConfigFromPlanet(planet: PlanetProfile): PlanetConfig {
  const textureFile = resolvePlanetTexture(planet)

  return {
    baseTexture: textureFile,
    tintColor: planet.visual.coreColor,
    atmosphereColor: planet.visual.accentColor,
    atmosphereDensity: 0.12,
    hasRing: resolvePlanetHasRing(),
    ringColor: planet.visual.accentColor,
    rotationSpeed: 0.018,
    cloudOpacity: 0,
  }
}

interface Props {
  planet: PlanetProfile
  /** Viewer perspective  -  determines which actions render */
  viewerRole: 'self' | 'explorer' | 'resonator'
}

export default function PlanetHero({ planet, viewerRole }: Props) {
  const t = useTranslations('planetPage')
  const { visual } = planet
  const isDesktop = useIsDesktop()
  const globeSize = isDesktop ? 260 : 200
  const planetConfig = planet.planetConfig ?? planetConfigFromPlanet(planet)

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: `linear-gradient(160deg, rgba(12,8,36,0.90) 0%, rgba(4,3,18,0.95) 100%)`,
        border: `1px solid ${visual.coreColor}22`,
        boxShadow: `0 0 80px ${visual.coreColor}12, 0 32px 80px rgba(0,0,0,0.6)`,
      }}
    >
      {/* -- Atmospheric background layers ------------------------------- */}

      {/* Primary radial wash from coreColor */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse at 15% 50%, ${visual.coreColor}18 0%, transparent 55%)`,
        }}
      />
      {/* Secondary accent wash top-right */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: `radial-gradient(ellipse at 85% 20%, ${visual.accentColor}0e 0%, transparent 50%)`,
        }}
      />
      {/* Top shimmer line */}
      <div
        className="absolute top-0 left-8 right-8 h-px pointer-events-none"
        aria-hidden="true"
        style={{
          background: `linear-gradient(90deg, transparent, ${visual.coreColor}55, rgba(255,255,255,0.12), ${visual.coreColor}55, transparent)`,
        }}
      />

      {/* -- Content grid ------------------------------------------------ */}
      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8 p-8 md:p-12">

        {/* Planet globe  -  left column on desktop, top on mobile */}
        <div className="shrink-0 flex w-full items-center justify-center md:w-auto">
          <PlanetGlobe planetConfig={planetConfig} size={globeSize} />
        </div>

        {/* Identity column  -  right on desktop, below on mobile */}
        <div className="flex-1 flex flex-col gap-5 min-w-0 text-center md:text-left pt-2 md:pt-6">

          <div className="flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <p
              className="text-xs tracking-[0.25em] uppercase font-medium"
              style={{ color: visual.coreColor, opacity: 0.75 }}
            >
              {viewerRole === 'self' ? t('yourPlanet') : t('planetProfile')}
            </p>
            <LevelBadge level={planet.userLevel ?? 1} size="md" />
          </div>

          {/* Name */}
          <h1
            className="text-4xl sm:text-5xl font-bold leading-tight"
            style={{
              background: `linear-gradient(135deg, #e8e0ff 0%, ${visual.coreColor} 55%, ${visual.accentColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {planet.name}
          </h1>

          {/* Tagline */}
          {planet.tagline && (
            <p
              className="text-base italic leading-relaxed max-w-md mx-auto md:mx-0"
              style={{ color: 'var(--ink)', opacity: 0.70 }}
            >
              &ldquo;{planet.tagline}&rdquo;
            </p>
          )}

          {/* Meta row: location, languages, mood */}
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            {planet.location && (
              <span
                className="flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--ghost)' }}
              >
                <span aria-hidden="true" style={{ opacity: 0.5 }}>◎</span>
                {planet.location}
              </span>
            )}
            {planet.languages && planet.languages.length > 0 && (
              <span
                className="flex items-center gap-1.5 text-xs"
                style={{ color: 'var(--ghost)' }}
              >
                <span aria-hidden="true" style={{ opacity: 0.5 }}>◌</span>
                {planet.languages.map((l) => LANG_LABEL[l] ?? l).join(' · ')}
              </span>
            )}
            <span
              className="text-xs px-2.5 py-0.5 rounded-full capitalize"
              style={{
                background: `${visual.coreColor}14`,
                border: `1px solid ${visual.coreColor}28`,
                color: visual.coreColor,
              }}
            >
              {planet.mood}
            </span>
            <span
              className="text-xs px-2.5 py-0.5 rounded-full capitalize"
              style={{
                background: 'rgba(167,139,250,0.08)',
                border: '1px solid rgba(167,139,250,0.18)',
                color: 'var(--star)',
              }}
            >
              {planet.lifestyle}
            </span>
            {planet.sbtiType && (
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-mono"
                style={{
                  background: `${visual.accentColor}12`,
                  border: `1px solid ${visual.accentColor}28`,
                  color: visual.accentColor,
                }}
              >
                {planet.sbtiType}{planet.sbtiCn ? ` · ${planet.sbtiCn}` : ''}
              </span>
            )}
          </div>

          {/* Core themes */}
          {planet.coreThemes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 justify-center md:justify-start">
              {planet.coreThemes.map((theme) => (
                <span
                  key={theme}
                  className="text-[10px] px-2 py-0.5 rounded-md tracking-wide"
                  style={{
                    background: `${visual.coreColor}10`,
                    border: `1px solid ${visual.coreColor}22`,
                    color: visual.coreColor,
                    opacity: 0.85,
                  }}
                >
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* Action row */}
          <div className="flex justify-center md:justify-start">
            {viewerRole === 'self'      && <SelfActions />}
            {viewerRole === 'resonator' && <ResonatorActions planet={planet} />}
            {viewerRole === 'explorer'  && <ExplorerActions />}
          </div>

        </div>
      </div>
    </section>
  )
}
