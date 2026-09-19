'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import type { PlanetProfile } from '@/types/planet'
import PlanetScene from '@/components/planet/PlanetScene'
import CosmicGlobe, { type GlobeStatus } from '@/components/fx/CosmicGlobe'
import GlowButton from '@/components/ui/GlowButton'
import { authClient } from '@/lib/auth-client'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'

// --- PlanetAwakeningState -----------------------------------------------------
// Full-page awakening ceremony shown after the 5-step ritual is complete.
// Sequence:
//   0–400ms  : planet scales in
//   400–800ms: orbit rings expand
//   800ms+   : text and CTAs fade in

interface Props {
  planet: PlanetProfile
}

// A one-time burst of light marking the exact moment the planet appears —
// distinct from CosmicBackground's ambient, continuous nebula/star motion
// behind it. Angles are deliberately uneven (not evenly spaced) so the burst
// reads as organic rather than a mechanical starburst.
const NOVA_PARTICLES = [
  { angle: 12, distance: 130, size: 3, delay: 0 },
  { angle: 48, distance: 90, size: 2, delay: 40 },
  { angle: 75, distance: 150, size: 4, delay: 10 },
  { angle: 108, distance: 105, size: 2, delay: 70 },
  { angle: 140, distance: 140, size: 3, delay: 20 },
  { angle: 172, distance: 95, size: 2, delay: 90 },
  { angle: 205, distance: 155, size: 3, delay: 30 },
  { angle: 235, distance: 100, size: 2, delay: 60 },
  { angle: 262, distance: 145, size: 4, delay: 5 },
  { angle: 296, distance: 110, size: 2, delay: 80 },
  { angle: 322, distance: 135, size: 3, delay: 50 },
  { angle: 350, distance: 95, size: 2, delay: 15 },
] as const

function NovaBurst({ coreColor }: { coreColor: string }) {
  return (
    <div className="absolute pointer-events-none" aria-hidden="true" style={{ top: '50%', left: '50%' }}>
      {NOVA_PARTICLES.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180
        const dx = Math.cos(rad) * p.distance
        const dy = Math.sin(rad) * p.distance
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              background: '#ffffff',
              boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${coreColor}`,
              transform: 'translate(-50%, -50%)',
              animation: 'awakening-nova-burst 900ms ease-out forwards',
              animationDelay: `${p.delay}ms`,
              '--nova-dx': `${dx}px`,
              '--nova-dy': `${dy}px`,
            } as CSSProperties}
          />
        )
      })}
    </div>
  )
}

export default function PlanetAwakeningState({ planet }: Props) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(0)
  const [globeStatus, setGlobeStatus] = useState<GlobeStatus>('loading')
  const reducedMotion = useReducedMotionPreference()
  const { data: session } = authClient.useSession()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled) setMounted(true)
    })
    return () => { cancelled = true }
  }, [])
  const isAuthenticated = mounted && !!session?.user

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
    >
      {/* The page's own CosmicBackground + StarfieldCanvas (mounted by
          StandardShell, always fixed behind everything) show through here —
          this container deliberately carries no opaque background of its
          own, so the reveal happens against the real starfield rather than
          a flat void. */}
      {/* Background light expansion */}
      <div
        className="absolute pointer-events-none transition-all duration-1800"
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

      {/* Planet  -  scales in. The cosmic globe, orbit rings, and nova burst
          are nested here (not page-level) so they center on the planet
          itself, not the viewport — the page's overall content (planet +
          text + CTAs below) is centered as one group, so its visual middle
          sits above true viewport-center. */}
      <div
        className="relative z-10 flex flex-col items-center gap-8 transition-all duration-700"
        style={{
          opacity:   phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(20px)',
        }}
      >
        {/* Cosmic globe  -  the same shimmering particle-sphere effect used
            on the homepage/demo, as a large ambient field the planet
            emerges from. Purely atmospheric (aria-hidden, pointer-events-
            none) — PlanetScene remains the actual "this is your planet"
            visual, painted on top since it comes later in DOM order. */}
        <div
          className="absolute pointer-events-none transition-opacity duration-1000"
          aria-hidden="true"
          style={{
            width: 560,
            height: 560,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: globeStatus === 'ready' ? 0.8 : 0,
          }}
        >
          <CosmicGlobe step={0} paused={reducedMotion} onStatusChange={setGlobeStatus} />
        </div>

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

        {/* Nova burst  -  fires once, exactly when the planet appears */}
        {phase >= 1 && <NovaBurst coreColor={visual.coreColor} />}

        <PlanetScene planet={planet} size={180} />
      </div>

      {/* Text  -  fades in after planet */}
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
            You are now a Resonator  -  the deeper layers are open
          </span>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
          {!isAuthenticated && (
            <GlowButton href="/sign-up" variant="primary" className="px-8 py-3.5 text-sm">
              Save my planet  -  create account
            </GlowButton>
          )}
          <GlowButton href="/my-planet" variant={isAuthenticated ? 'primary' : 'secondary'} className="px-8 py-3.5 text-sm">
            Open my planet
          </GlowButton>
          <GlowButton href="/resonance" variant="secondary" className="px-8 py-3.5 text-sm">
            See my resonances
          </GlowButton>
        </div>

        {/* Warning for unauthenticated users */}
        {!isAuthenticated && (
          <p
            className="text-xs text-center max-w-xs leading-relaxed mt-1"
            style={{ color: '#f59e0b', opacity: 0.85 }}
          >
            Your planet is stored locally. Create an account to keep it across devices and browsers.
          </p>
        )}

        {/* Stream link */}
        <Link
          href="/stream"
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: 'var(--ghost)', textDecoration: 'none', marginTop: 4 }}
        >
          Or explore the stream →
        </Link>
      </div>

      {/* Inline CSS for awakening ring + nova burst animations */}
      <style>{`
        @keyframes awakening-ring-expand {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          40%  { opacity: 1; }
          to   { opacity: 0; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes awakening-nova-burst {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to   { opacity: 0; transform: translate(calc(-50% + var(--nova-dx)), calc(-50% + var(--nova-dy))) scale(0.3); }
        }
      `}</style>
    </div>
  )
}
