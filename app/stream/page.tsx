'use client'

import Link from 'next/link'
import LightCone from '@/components/fx/LightCone'
import PlanetVisual from '@/components/planet/PlanetVisual'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import { mockPlanets } from '@/lib/mock-planets'
import type { PlanetProfile } from '@/types/planet'

// --- Planet stream card -------------------------------------------------------

function StreamCard({ planet, index }: { planet: PlanetProfile; index: number }) {
  const { visual } = planet
  // Stagger float animation per card
  const floatDelay = `${(index * 0.4) % 2.4}s`

  return (
    <Link
      href={`/planet/${planet.id}`}
      className="group flex flex-col items-center gap-5 rounded-2xl p-6 transition-all duration-300"
      style={{
        background: `linear-gradient(135deg, rgba(28,24,72,0.45) 0%, rgba(12,10,42,0.38) 100%)`,
        border: `1px solid ${visual.coreColor}20`,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 0 0 0 ${visual.coreColor}00`,
        animation: `float 5.5s ease-in-out ${floatDelay} infinite`,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${visual.coreColor}22, 0 0 0 1px ${visual.coreColor}38`
        ;(e.currentTarget as HTMLElement).style.borderColor = `${visual.coreColor}48`
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${visual.coreColor}00`
        ;(e.currentTarget as HTMLElement).style.borderColor = `${visual.coreColor}20`
      }}
    >
      {/* Planet visual  -  medium size */}
      <div className="transition-transform duration-300 group-hover:scale-105">
        <PlanetVisual visual={{ ...visual, size: 'md' }} symbol={planet.avatarSymbol} />
      </div>

      {/* Name + tagline */}
      <div className="text-center flex flex-col gap-1">
        <h3
          className="text-base font-bold leading-tight"
          style={{ color: 'var(--foreground)' }}
        >
          {planet.name}
        </h3>
        {planet.tagline && (
          <p
            className="text-xs italic leading-snug line-clamp-2"
            style={{ color: 'var(--ink)', opacity: 0.65 }}
          >
            &ldquo;{planet.tagline}&rdquo;
          </p>
        )}
      </div>

      {/* Attribute chips */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {[planet.mood, planet.style, planet.lifestyle].map((attr) => (
          <span
            key={attr}
            className="px-2 py-0.5 rounded-full text-[10px] capitalize tracking-wide"
            style={{
              background: `${visual.coreColor}10`,
              border: `1px solid ${visual.coreColor}25`,
              color: visual.coreColor,
            }}
          >
            {attr}
          </span>
        ))}
      </div>

      {/* Core themes */}
      <div className="flex flex-wrap justify-center gap-1">
        {planet.coreThemes.slice(0, 2).map((theme) => (
          <span
            key={theme}
            className="text-[10px] uppercase tracking-widest"
            style={{ color: 'var(--ghost)', opacity: 0.55 }}
          >
            {theme}
          </span>
        ))}
      </div>
    </Link>
  )
}

// --- Page ---------------------------------------------------------------------

export default function StreamPage() {
  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-6xl mx-auto">
        <LightCone origin="top-center" color="rgba(167,139,250,1)" opacity={0.07} double={false} />

        <div className="relative z-10 flex flex-col gap-10 animate-fade-up">

          {/* -- Header ---------------------------------------------------- */}
          <SectionHeader
            eyebrow="The stream"
            level={1}
            title="Planets in drift"
            subtitle="Each planet is a mind in motion. Click to enter a universe and discover your resonance with it."
          />

          {/* -- Stream divider ------------------------------------------ */}
          <div className="divider-glow" />

          {/* -- Planet grid --------------------------------------------- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {mockPlanets.map((planet, i) => (
              <StreamCard key={planet.id} planet={planet} index={i} />
            ))}
          </div>

          {/* -- Footer note --------------------------------------------- */}
          <p className="text-center text-xs" style={{ color: 'var(--ghost)', opacity: 0.4 }}>
            {mockPlanets.length} planets mapped · resonance updated in real-time
          </p>
        </div>
      </div>
    </AppShell>
  )
}
