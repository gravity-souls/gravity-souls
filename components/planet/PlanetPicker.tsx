'use client'

import { useState } from 'react'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { PRESET_PLANETS, type PlanetConfig } from '@/types/planet'

interface Props {
  selectedPlanet?: PlanetConfig | null
  onSelect: (planet: PlanetConfig) => void
  className?: string
}

export default function PlanetPicker({ selectedPlanet, onSelect, className = '' }: Props) {
  const [internalTexture, setInternalTexture] = useState(PRESET_PLANETS[0]?.baseTexture ?? '')
  const selectedTexture = selectedPlanet?.baseTexture ?? internalTexture

  function selectPlanet(planet: PlanetConfig) {
    setInternalTexture(planet.baseTexture)
    onSelect(planet)
  }

  return (
    <div role="radiogroup" aria-label="Planet texture" className={`grid grid-cols-2 gap-3 md:grid-cols-4 ${className}`}>
      {PRESET_PLANETS.map((planet) => {
        const selected = planet.baseTexture === selectedTexture

        return (
          <button
            key={planet.baseTexture}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => selectPlanet(planet)}
            className="group flex min-h-40 flex-col items-center justify-start gap-3 rounded-lg px-3 py-4 text-center transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: selected ? `${planet.tintColor}18` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${selected ? planet.tintColor : 'rgba(167,139,250,0.12)'}`,
              boxShadow: selected ? `0 0 0 1px ${planet.tintColor}60, 0 0 32px ${planet.tintColor}24` : undefined,
              color: 'var(--foreground)',
              transform: selected ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <PlanetAvatar planetConfig={planet} size={80} />
            <span className="text-sm font-semibold leading-tight" style={{ color: 'var(--ink)' }}>
              {planet.name}
            </span>
            <span className="line-clamp-1 text-[11px] leading-relaxed" style={{ color: 'var(--ghost)', opacity: 0.72 }}>
              {planet.desc}
            </span>
          </button>
        )
      })}
    </div>
  )
}
