'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SavedPlanet } from '@/types/social'
import type { PlanetProfile } from '@/types/planet'
import { unsavePlanetId } from '@/lib/social-storage'
import GlowButton from '@/components/ui/GlowButton'
import { relativeTime } from '@/lib/time'

// --- SavedPlanetCard ----------------------------------------------------------

interface Props {
  saved:       SavedPlanet
  planet:      PlanetProfile
  isResonator: boolean
  onUnsave:    (planetId: string) => void
}

export default function SavedPlanetCard({ saved, planet, isResonator, onUnsave }: Props) {
  const [removing, setRemoving] = useState(false)
  const { coreColor, accentColor } = planet.visual

  function handleUnsave() {
    setRemoving(true)
    unsavePlanetId(planet.id)
    setTimeout(() => onUnsave(planet.id), 300)
  }

  return (
    <div
      className="relative flex flex-col gap-4 p-5 rounded-2xl transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: `1px solid ${coreColor}18`,
        opacity: removing ? 0 : 1,
        transform: removing ? 'scale(0.97)' : 'scale(1)',
      }}
    >
      {/* Planet orb + name */}
      <Link
        href={`/planet/${planet.id}`}
        className="flex items-center gap-3 group"
        style={{ textDecoration: 'none' }}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded-full transition-transform group-hover:scale-105"
          style={{
            width: 48, height: 48,
            background: `radial-gradient(circle at 35% 30%, ${accentColor}cc 0%, ${coreColor}88 50%, ${coreColor}20 100%)`,
            boxShadow: `0 0 0 1px ${coreColor}30, 0 0 14px ${coreColor}30`,
            fontSize: 20, color: coreColor,
          }}
        >
          {planet.avatarSymbol}
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
            {planet.name}
          </span>
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
          {planet.mood}
        </span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full capitalize"
          style={{
            background: 'rgba(167,139,250,0.08)',
            border: '1px solid rgba(167,139,250,0.15)',
            color: 'var(--star)',
          }}
        >
          {planet.lifestyle}
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
        Saved {relativeTime(saved.savedAt)}
      </p>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <GlowButton href={`/planet/${planet.id}`} variant="secondary" className="flex-1 text-xs py-2 text-center">
          View planet
        </GlowButton>
        {isResonator && (
          <GlowButton href={`/messages/${planet.id}`} variant="ghost" className="flex-1 text-xs py-2 text-center">
            Send beam
          </GlowButton>
        )}
      </div>

      {/* Unsave button */}
      <button
        type="button"
        onClick={handleUnsave}
        className="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center text-xs transition-all opacity-0 hover:opacity-100 focus:opacity-100"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--ghost)',
        }}
        aria-label={`Remove ${planet.name} from star chart`}
      >
        ×
      </button>
    </div>
  )
}
