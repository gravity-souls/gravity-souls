'use client'

import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { PlanetConfig } from '@/types/planet'

/** Shared flat preview for profile, customization and navigation surfaces. */
export default function PlanetGlobe({ planetConfig, size = 300, framing = 'hero' }: {
  planetConfig: PlanetConfig
  size?: number
  framing?: 'hero' | 'avatar'
}) {
  // Keep the former hero footprint while sharing the resonance image treatment.
  const diameter = framing === 'avatar' ? size : Math.round(size * 0.72)
  return <div data-planet-display="flat" className="flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
    <PlanetAvatar planetConfig={planetConfig} size={diameter} rotating={false} />
  </div>
}
