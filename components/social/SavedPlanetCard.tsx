'use client'

import Link from 'next/link'
import SavePlanetButton from '@/components/social/SavePlanetButton'
import BeamButton from '@/components/social/BeamButton'
import { useLocale, useTranslations } from 'next-intl'
import { moodLabel, lifestyleLabel } from '@/lib/planet-labels'
import type { SavedPlanet } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import GlowButton from '@/components/ui/GlowButton'
import { hasDistinctPlanetName, planetDisplayName } from '@/lib/planet-display-name'

// --- SavedPlanetCard ----------------------------------------------------------

interface Props {
  saved:       SavedPlanet
  planet:      PlanetProfile
  isResonator: boolean
  onUnsave:    (planetId: string) => void
}

export default function SavedPlanetCard({ saved, planet, isResonator, onUnsave }: Props) {
  const t = useTranslations('creationSteps')
  const tMyPlanet = useTranslations('myPlanet')
  const ta = useTranslations('planetActions'), locale = useLocale()
  const coreColor = planet.planetConfig?.tintColor ?? planet.visual.coreColor

  return (
    <div
      className="relative flex flex-col gap-4 p-5 rounded-2xl transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${coreColor}18`,

      }}
    >
      {/* Planet orb + name */}
      <Link
        href={`/planet/${planet.id}`}
        className="flex items-center gap-3 group"
        style={{ textDecoration: 'none' }}
      >
        <PlanetAvatar planetConfig={planet.planetConfig} textureFile={planet.visual.textureFile} size={48} glowColor={coreColor} />

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {planetDisplayName(planet)}
          </span>
          {hasDistinctPlanetName(planet) && (
            <span className="text-[10px]" style={{ color: 'var(--ghost)' }}>
              {tMyPlanet('planetName')}: {planet.name.trim()}
            </span>
          )}
          {planet.tagline && (
            <span
              className="text-[11px] truncate italic"
              style={{ color: 'var(--ghost)', opacity: 0.65 }}
            >
              {planet.tagline}
            </span>
          )}
        </div>
      </Link>

      {/* Mood + lifestyle chips */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className="text-[10px] px-2 py-0.5 rounded-full capitalize"
          style={{
            background: `${coreColor}12`,
            border: `1px solid ${coreColor}25`,
            color: coreColor,
          }}
        >
          {moodLabel(t, planet.mood)}
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full capitalize"
          style={{
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.15)',
            color: 'var(--star)',
          }}
        >
          {lifestyleLabel(t, planet.lifestyle)}
        </span>
      </div>

      {/* Label if set */}
      {saved.label && (
        <p className="text-[11px] italic" style={{ color: 'var(--ghost)', opacity: 0.6 }}>
          &ldquo;{saved.label}&rdquo;
        </p>
      )}

      {/* Saved date */}
      <p className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
        {ta('savedAt', { date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(saved.savedAt)) })}
      </p>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <GlowButton href={`/planet/${planet.id}`} variant="secondary" className="flex-1 text-xs py-2 text-center">
          {ta('viewPlanet')}
        </GlowButton>
        {isResonator && <BeamButton key={planet.id} planetId={planet.id} userId={planet.userId || undefined} />}
        <SavePlanetButton key={planet.id} planetId={planet.id} initialSaved onChange={saved => { if (!saved) onUnsave(planet.id) }} />
      </div>


    </div>
  )
}
