import Link from 'next/link'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import GlowButton from '@/components/ui/GlowButton'
import type { PlanetProfile } from '@/types/planet'
import { resolvePlanetTexture } from '@/lib/planet-textures'

// --- Language display ---------------------------------------------------------

const LANG_LABEL: Record<string, string> = {
  zh: '中文', en: 'English', fr: 'Français', de: 'Deutsch',
  ja: '日本語', ko: '한국어', es: 'Español', th: 'ไทย',
}

// --- Viewer-aware action rows -------------------------------------------------

function ExplorerActions() {
  return (
    <div
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
      style={{
        background: 'rgba(18,14,52,0.60)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(167,139,250,0.12)',
      }}
    >
      <span style={{ color: 'var(--ghost)' }}>Create your planet to send a signal.</span>
      <Link
        href="/create-planet"
        className="font-medium whitespace-nowrap transition-colors duration-150"
        style={{ color: 'var(--star)', textDecoration: 'none' }}
      >
        Begin →
      </Link>
    </div>
  )
}

function ResonatorActions({ planet }: { planet: PlanetProfile }) {
  return (
    <div className="flex flex-wrap gap-2">
      <GlowButton
        href={`/messages?to=${encodeURIComponent(planet.id)}`}
        variant="primary"
        className="px-5 py-2.5 text-sm"
      >
        Send a beam
      </GlowButton>
      <GlowButton
        href={`/saved?add=${planet.id}`}
        variant="secondary"
        className="px-5 py-2.5 text-sm"
      >
        Save to orbit
      </GlowButton>
    </div>
  )
}

function SelfActions() {
  return (
    <div className="flex flex-wrap gap-2">
      <GlowButton href="/settings/planet" variant="secondary" className="px-5 py-2.5 text-sm">
        Tune atmosphere
      </GlowButton>
      <GlowButton href="/sbti?next=/my-planet" variant="ghost" className="px-5 py-2.5 text-sm">
        Soul scan
      </GlowButton>
    </div>
  )
}

// --- PlanetHero ---------------------------------------------------------------

interface Props {
  planet: PlanetProfile
  /** Viewer perspective  -  determines which actions render */
  viewerRole: 'self' | 'explorer' | 'resonator'
}

export default function PlanetHero({ planet, viewerRole }: Props) {
  const { visual } = planet
  const textureFile = resolvePlanetTexture(planet)

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

        {/* Planet photo  -  left column on desktop, top on mobile */}
        <div className="shrink-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 224,
                height: 224,
                background: `radial-gradient(circle, ${visual.coreColor}22 0%, transparent 70%)`,
                filter: 'blur(6px)',
              }}
              aria-hidden="true"
            />
            {visual.ringStyle !== 'none' && (
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 224,
                  height: 224,
                  border: `1px solid ${visual.coreColor}26`,
                  transform: 'rotate(-14deg) scaleX(1.22)',
                }}
                aria-hidden="true"
              />
            )}
            <PlanetAvatar textureFile={textureFile} size={172} glowColor={visual.coreColor} />
          </div>
        </div>

        {/* Identity column  -  right on desktop, below on mobile */}
        <div className="flex-1 flex flex-col gap-5 min-w-0 text-center md:text-left pt-2 md:pt-6">

          {/* Eyebrow */}
          <p
            className="text-xs tracking-[0.25em] uppercase font-medium"
            style={{ color: visual.coreColor, opacity: 0.75 }}
          >
            {viewerRole === 'self' ? 'Your planet' : 'Planet profile'}
          </p>

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
