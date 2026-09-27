'use client'

import { useEffect, useState } from 'react'
import PlanetCard from '@/components/planet/PlanetCard'
import { NEBULA_ZONES, ORBIT_PATHS, buildRealPositionedPlanets, type UniversePlanet } from '@/lib/universe-field'

// --- UniverseGlimpse -----------------------------------------------------------
// A one-time, purely decorative peek at the wider universe, shown as the final
// beat of the planet-awakening reveal: real other planets (never mock/invented
// ones — see CLAUDE.md's rule against mock fallbacks on real content) scattered
// across the same nebula-zone layout used on the signed-in dashboard, so the
// "universe" a new planet just joined looks exactly like the one they'll see
// there — not a one-off effect invented for this moment.
//
// aria-hidden + pointer-events-none throughout: this is ambient scenery behind
// the reveal's real text/CTAs, never a second interactive surface. A fixed
// nav bar trapping a drawer's clicks underneath it was a real bug fixed
// elsewhere this session — this component is built to never risk that class
// of issue by simply never being interactive at all.

export default function UniverseGlimpse({ visible, onHasPlanets }: { visible: boolean; onHasPlanets?: (hasAny: boolean) => void }) {
  const [planets, setPlanets] = useState<UniversePlanet[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/universe')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: UniversePlanet[]) => {
        if (cancelled) return
        setPlanets(data)
        onHasPlanets?.(data.length > 0)
      })
      .catch(() => { if (!cancelled) setPlanets([]) })
    return () => { cancelled = true }
  }, [])

  const positioned = planets ? buildRealPositionedPlanets(planets) : []

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none transition-opacity duration-[2000ms] ease-out"
      style={{ opacity: visible && positioned.length > 0 ? 1 : 0 }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 48% 44%, rgba(167,139,250,0.08) 0%, rgba(52,211,153,0.04) 34%, transparent 68%)',
          maskImage: 'radial-gradient(ellipse at center, black 0%, black 60%, transparent 100%)',
        }}
      />

      {NEBULA_ZONES.map((zone) => (
        <span
          key={zone.id}
          className="absolute flex items-center gap-2"
          style={{
            left: `${zone.x}%`,
            top: `${zone.y - 8}%`,
            transform: 'translate(-50%, -50%)',
            opacity: 0.4,
          }}
        >
          <span style={{ width: 22, height: 1, background: `linear-gradient(90deg, transparent, ${zone.color})`, display: 'inline-block' }} />
          <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: zone.color, whiteSpace: 'nowrap', fontWeight: 600 }}>
            {zone.id}
          </span>
        </span>
      ))}

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {ORBIT_PATHS.map((path) => (
          <path key={path.d} d={path.d} fill="none" stroke={path.color} strokeWidth="0.16" strokeDasharray="1.8 2.8" opacity={path.opacity * 0.6} />
        ))}
      </svg>

      {positioned.map(({ position, planet }) => (
        <div
          key={planet.id}
          className="absolute"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: 'translate(-50%, -50%)',
            opacity: 0.5 + position.depth * 0.3,
          }}
        >
          <PlanetCard planet={planet} size={position.size * 0.6} showLabel={false} rotating />
        </div>
      ))}
    </div>
  )
}
