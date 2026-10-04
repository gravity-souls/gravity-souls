'use client'

import HorizontalCarousel from '@/components/ui/HorizontalCarousel'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { resolvePlanetTexture } from '@/lib/planet-textures'
import type { PlanetProfile } from '@/types/planet'

interface MatchEntry {
  planet: PlanetProfile
  score: number
  traits: string[]
}

interface Props {
  matches: MatchEntry[]
  className?: string
}

/**
 * ResonantMatchesCarousel — horizontal scrollable row of resonant planet cards.
 * Matches the "Resonant Matches" section from the mockup with avatar, name,
 * personality traits, and compatibility percentage.
 */
export default function ResonantMatchesCarousel({ matches, className = '' }: Props) {
  const tA11y = useTranslations('a11y')
  const t = useTranslations('myPlanet')
  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {t('resonantMatches')}
          </h3>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--ghost)' }}>
            {t('matchCount', { count: matches.length })}
          </p>
        </div>

      </div>

      <HorizontalCarousel label={t('resonantMatches')} previousLabel={tA11y('previousMatches')} nextLabel={tA11y('nextMatches')}>
        {matches.map(({ planet, score, traits }) => {
          const color = planet.planetConfig?.tintColor ?? planet.visual?.coreColor ?? '#a78bfa'
          return (
            <div
              key={planet.id}
              className="relative shrink-0 rounded-xl"
              style={{
                width: 150,
                scrollSnapAlign: 'start',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${color}44`
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)'
                ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'
              }}
            >
              <Link
                href={`/planet/${planet.id}`}
                className="flex h-full flex-col items-center gap-2 p-3"
                style={{ textDecoration: 'none' }}
              >
                {/* Avatar */}
                <PlanetAvatar
                  planetConfig={planet.planetConfig}
                  textureFile={resolvePlanetTexture(planet)}
                  size={56}
                  glowColor={color}
                  rotating
                  rotationDuration={17 + (planet.id.length % 5) * 3}
                />

                {/* Name + symbol */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)', maxWidth: 100 }}>
                    {planet.name}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>{planet.avatarSymbol}</span>
                </div>

                {/* Traits */}
                <div className="text-center">
                  {traits.slice(0, 2).map((trait) => (
                    <p key={trait} className="text-[10px] leading-tight" style={{ color: 'var(--ghost)' }}>
                      · {trait}
                    </p>
                  ))}
                </div>

                {/* Compatibility bar */}
                <div className="w-full mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(score, 100)}%`, background: color }}
                      />
                    </div>
                    <span className="text-[10px] font-semibold tabular-nums" style={{ color }}>
                      {score}%
                    </span>
                  </div>
                  <p className="text-[9px] mt-0.5" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
                    {t('compatible')}
                  </p>
                </div>
              </Link>
            </div>
          )
        })}
      </HorizontalCarousel>

    </div>
  )
}
