'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PlanetProfile } from '@/types/planet'
import PlanetScene from '@/components/planet/PlanetScene'
import GlowButton from '@/components/ui/GlowButton'

// ─── PlanetAwakeningState ─────────────────────────────────────────────────────
// Full-page awakening ceremony shown after the 5-step ritual is complete.
// Sequence:
//   0–400ms  : planet scales in
//   400–800ms: orbit rings expand
//   800ms+   : text and CTAs fade in

interface Props {
  planet: PlanetProfile
}

export default function PlanetAwakeningState({ planet }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0)

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200)
    const t2 = setTimeout(() => setPhase(2), 700)
    const t3 = setTimeout(() => setPhase(3), 1400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  const { visual } = planet

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden"
      style={{ background: 'var(--background)' }}
    >
      {/* Background light expansion */}
      <div
        className="absolute pointer-events-none transition-all duration-[1800ms]"
        aria-hidden="true"
        style={{
          width:  phase >= 1 ? '140vw' : '0px',
          height: phase >= 1 ? '140vw' : '0px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${visual.coreColor}14 0%, ${visual.coreColor}06 40%, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          transition: 'width 2s ease-out, height 2s ease-out, opacity 1.5s ease-out',
          opacity: phase >= 1 ? 1 : 0,
        }}
      />

      {/* Orbit rings expanding out */}
      {phase >= 2 && (
        <div className="absolute pointer-events-none" aria-hidden="true" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width:  240 + i * 120,
                height: 240 + i * 120,
                border: `1px solid ${visual.coreColor}`,
                opacity: (0.22 - i * 0.06),
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                animation: `awakening-ring-expand 1.4s var(--ease-cosmic) forwards`,
                animationDelay: `${i * 120}ms`,
              }}
            />
          ))}
        </div>
      )}

      {/* Planet — scales in */}
      <div
        className="relative z-10 flex flex-col items-center gap-8 transition-all duration-700"
        style={{
          opacity:   phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(20px)',
        }}
      >
        <PlanetScene planet={planet} size={180} />
      </div>

      {/* Text — fades in after planet */}
      <div
        className="relative z-10 flex flex-col items-center gap-4 text-center mt-8 transition-all duration-700"
        style={{
          opacity:   phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(16px)',
        }}
      >
        {/* Eyebrow */}
        <p
          className="text-[10px] uppercase tracking-[0.35em] font-medium"
          style={{ color: visual.coreColor, opacity: 0.75 }}
        >
          Planet live
        </p>

        {/* Name */}
        <h1
          className="text-4xl sm:text-5xl font-bold"
          style={{
            background: `linear-gradient(135deg, #e8e0ff 0%, ${visual.coreColor} 60%, ${visual.accentColor} 100%)`,
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
            className="text-sm italic leading-relaxed max-w-xs"
            style={{ color: 'var(--ink)', opacity: 0.65 }}
          >
            &ldquo;{planet.tagline}&rdquo;
          </p>
        )}

        {/* Resonator confirmation */}
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.22)',
          }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }}
          />
          <span className="text-xs" style={{ color: '#34d399' }}>
            You are now a Resonator — the deeper layers are open
          </span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          <GlowButton href="/my-planet" variant="primary" className="px-8 py-3.5 text-sm">
            Open my planet
          </GlowButton>
          <GlowButton href="/resonance" variant="secondary" className="px-8 py-3.5 text-sm">
            See my resonances
          </GlowButton>
        </div>

        {/* Stream link */}
        <Link
          href="/stream"
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: 'var(--ghost)', textDecoration: 'none', marginTop: 4 }}
        >
          Or explore the stream →
        </Link>
      </div>

      {/* Inline CSS for awakening ring animation */}
      <style>{`
        @keyframes awakening-ring-expand {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          40%  { opacity: 1; }
          to   { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  )
}
