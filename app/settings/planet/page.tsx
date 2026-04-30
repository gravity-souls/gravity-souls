'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import LivePlanetPreview from '@/components/creation/LivePlanetPreview'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import Step1EmotionalTone from '@/components/creation/steps/Step1EmotionalTone'
import Step2InterestEcology from '@/components/creation/steps/Step2InterestEcology'
import Step3AtmosphereStyle from '@/components/creation/steps/Step3AtmosphereStyle'
import Step4CulturalPaths from '@/components/creation/steps/Step4CulturalPaths'
import Step5RelationalGravity from '@/components/creation/steps/Step5RelationalGravity'
import { buildPlanetFromDraft, planetProfileToDraft } from '@/lib/planet-builder'
import { PLANET_TEXTURE_OPTIONS, resolvePlanetTexture } from '@/lib/planet-textures'
import { getPlanetProfile, savePlanetProfile, getOrCreateUserId } from '@/lib/user'
import type { PlanetDraft } from '@/types/creation'
import { INITIAL_DRAFT } from '@/types/creation'
import type { PlanetProfile } from '@/types/planet'

const DEFAULT_VISUAL: PlanetProfile['visual'] = {
  coreColor: '#a78bfa',
  accentColor: '#c4b5fd',
  ringStyle: 'single',
  surfaceStyle: 'smooth',
  satelliteCount: 1,
  size: 'lg',
}

// --- Section wrapper ----------------------------------------------------------

function SectionCard({
  title,
  description,
  color,
  children,
}: {
  title:       string
  description: string
  color?:      string
  children:    React.ReactNode
}) {
  return (
    <OrbitCard glowColor={color ?? 'var(--star)'} className="p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {title}
          </h2>
          <p className="text-xs leading-snug" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
            {description}
          </p>
        </div>
        {children}
      </div>
    </OrbitCard>
  )
}

// --- Save confirmation toast --------------------------------------------------

function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl flex items-center gap-2.5 transition-all duration-300"
      style={{
        background: 'rgba(52,211,153,0.12)',
        border: '1px solid rgba(52,211,153,0.28)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        opacity:   visible ? 1 : 0,
        transform: visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(12px)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: '#34d399', boxShadow: '0 0 6px #34d399' }}
      />
      <span className="text-xs font-medium" style={{ color: '#34d399' }}>
        Planet updated
      </span>
    </div>
  )
}

// --- Convert DB planet data to PlanetProfile for the draft system ----------

function buildPlanetFromApiData(data: Record<string, unknown>): PlanetProfile {
  const visual = { ...DEFAULT_VISUAL, ...((data.visual as Partial<PlanetProfile['visual']>) ?? {}) }

  return {
    id: data.id as string,
    name: data.name as string,
    avatarSymbol: (data.avatarSymbol as string) ?? '?',
    tagline: (data.tagline as string) ?? undefined,
    role: 'explorer',
    mood: (data.mood as PlanetProfile['mood']) ?? 'calm',
    style: (data.style as PlanetProfile['style']) ?? 'minimal',
    lifestyle: (data.lifestyle as PlanetProfile['lifestyle']) ?? 'solitary',
    coreThemes: (data.coreThemes as string[]) ?? [],
    contentFragments: (data.contentFragments as string[]) ?? [],
    visual,
    cognitiveAxes: {
      abstract: (data.abstractAxis as number) ?? 50,
      introspective: (data.introspectiveAxis as number) ?? 50,
    },
    emotionalBars: [],
    location: (data.location as string) ?? undefined,
    languages: (data.languages as string[]) ?? [],
    culturalTags: (data.culturalTags as string[]) ?? [],
    travelCities: (data.travelCities as string[]) ?? [],
    musicTaste: (data.musicTaste as string[]) ?? [],
    bookTaste: (data.bookTaste as string[]) ?? [],
    filmTaste: (data.filmTaste as string[]) ?? [],
    communicationStyle: (data.communicationStyle as PlanetProfile['communicationStyle']) ?? undefined,
    matchPreference: (data.matchPreference as PlanetProfile['matchPreference']) ?? 'mixed',
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
    userId: data.userId as string,
  }
}

// --- Page ---------------------------------------------------------------------

export default function PlanetSettingsPage() {
  const router = useRouter()
  const [mounted,   setMounted]   = useState(false)
  const [userId,    setUserId]    = useState('')
  const [draft,     setDraft]     = useState<PlanetDraft>(INITIAL_DRAFT)
  const [planetName, setPlanetName] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [accentColor, setAccentColor] = useState('#a78bfa')

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return

      setMounted(true)
      const id = getOrCreateUserId()
      setUserId(id)

      // Try loading from API first, fall back to localStorage
      Promise.all([
        fetch('/api/my-planet').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/me').then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([dbPlanet, meData]) => {
          if (cancelled) return
          let planet: PlanetProfile | null = null
          if (dbPlanet) {
            // Merge profile fields from /api/me into the planet data
            const merged = { ...dbPlanet }
            if (meData?.profile) {
              merged.location = meData.profile.location ?? undefined
              merged.languages = meData.profile.languages ?? []
              merged.culturalTags = meData.profile.culturalTags ?? []
              merged.travelCities = meData.profile.travelCities ?? []
              merged.musicTaste = meData.profile.musicTaste ?? []
              merged.bookTaste = meData.profile.bookTaste ?? []
              merged.filmTaste = meData.profile.filmTaste ?? []
              merged.communicationStyle = meData.profile.communicationStyle ?? undefined
              merged.matchPreference = meData.profile.matchPreference ?? 'mixed'
            }
            planet = buildPlanetFromApiData(merged)
          } else {
            planet = getPlanetProfile()
          }
          if (!planet) {
            router.replace('/create-planet')
            return
          }
          setPlanetName(planet.name)
          const converted = planetProfileToDraft(planet)
          setDraft(converted)
          setAccentColor(planet.visual.coreColor)
        })
        .catch(() => {
          if (cancelled) return
          const planet = getPlanetProfile()
          if (!planet) {
            router.replace('/create-planet')
            return
          }
          setPlanetName(planet.name)
          const converted = planetProfileToDraft(planet)
          setDraft(converted)
          setAccentColor(planet.visual.coreColor)
        })
    })

    return () => { cancelled = true }
  }, [router])

  const previewPlanet = useMemo(
    () => (userId ? buildPlanetFromDraft(draft, userId) : null),
    [draft, userId],
  )

  // Keep accent color in sync with climate choice
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (!cancelled && previewPlanet) setAccentColor(previewPlanet.visual.coreColor)
    })
    return () => { cancelled = true }
  }, [previewPlanet])

  function update<K extends keyof PlanetDraft>(key: K, value: PlanetDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  async function handleSave() {
    if (!userId || !previewPlanet) return
    setSaving(true)

    // Always keep localStorage in sync
    const savedPlanet = { ...previewPlanet, name: planetName || previewPlanet.name }
    savePlanetProfile(savedPlanet)

    try {
      const res = await fetch('/api/my-planet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planetName || previewPlanet.name,
          tagline: previewPlanet.tagline,
          mood: previewPlanet.mood,
          style: previewPlanet.style,
          lifestyle: previewPlanet.lifestyle,
          coreThemes: previewPlanet.coreThemes,
          contentFragments: previewPlanet.contentFragments,
          visual: previewPlanet.visual,
          abstractAxis: previewPlanet.cognitiveAxes.abstract,
          introspectiveAxis: previewPlanet.cognitiveAxes.introspective,
          location: previewPlanet.location,
          languages: previewPlanet.languages,
          culturalTags: previewPlanet.culturalTags,
          travelCities: previewPlanet.travelCities,
          musicTaste: previewPlanet.musicTaste,
          bookTaste: previewPlanet.bookTaste,
          filmTaste: previewPlanet.filmTaste,
          communicationStyle: previewPlanet.communicationStyle,
          matchPreference: previewPlanet.matchPreference,
        }),
      })
      if (!res.ok) {
        console.error('Failed to save planet to API:', await res.text())
      }
    } catch (e) {
      console.error('Failed to save planet to API:', e)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2800)
  }

  if (!mounted || !previewPlanet) return null

  return (
    <AppShell>
      <LightCone origin="top-left" color={accentColor} opacity={0.06} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-24 max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <p
            className="text-xs uppercase tracking-[0.25em] font-medium"
            style={{ color: accentColor, opacity: 0.7 }}
          >
            Settings
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold w-fit"
            style={{
              background: `linear-gradient(135deg, #e8e0ff 0%, ${accentColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {planetName || previewPlanet.name}
          </h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--ink)', opacity: 0.55 }}>
            Reshape any dimension of your world. Changes update the live preview instantly and are
            saved when you confirm.
          </p>
        </div>

        {/* Main grid: edit sections + sticky preview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          {/* -- Left: edit sections --------------------------------------- */}
          <div className="flex flex-col gap-6">

            <SectionCard
              title="Identity"
              description="Your planet's name - how others will find you in the cosmos."
              color={accentColor}
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
                  Planet name
                </label>
                <input
                  type="text"
                  value={planetName}
                  onChange={(e) => setPlanetName(e.target.value)}
                  maxLength={40}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--foreground)',
                  }}
                  placeholder="Name your planet..."
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Planet photo"
              description="Choose the texture other users see on your profile, cards, and messages."
              color={accentColor}
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PLANET_TEXTURE_OPTIONS.map((option) => {
                  const selected = resolvePlanetTexture(previewPlanet) === option.file
                  return (
                    <button
                      key={option.file}
                      type="button"
                      onClick={() => update('textureFile', option.file)}
                      className="rounded-2xl p-3 flex flex-col items-center gap-2 transition-all duration-200"
                      style={{
                        background: selected ? `${accentColor}18` : 'rgba(255,255,255,0.03)',
                        border: selected ? `1px solid ${accentColor}55` : '1px solid rgba(255,255,255,0.08)',
                        cursor: 'pointer',
                      }}
                      aria-pressed={selected}
                    >
                      <PlanetAvatar textureFile={option.file} size={52} glowColor={accentColor} />
                      <span className="text-xs font-medium" style={{ color: selected ? 'var(--foreground)' : 'var(--ink)' }}>
                        {option.label}
                      </span>
                      <span className="text-[10px] text-center leading-snug" style={{ color: 'var(--ghost)' }}>
                        {option.tone}
                      </span>
                    </button>
                  )
                })}
              </div>
            </SectionCard>

            <SectionCard
              title="Emotional climate"
              description="The current weather of your inner world. Drives color and surface."
              color={accentColor}
            >
              <Step1EmotionalTone
                value={draft.climateKey}
                onChange={(v) => update('climateKey', v)}
              />
            </SectionCard>

            <SectionCard
              title="Interest ecology"
              description="Your core themes and habitat pattern. Shapes the terrain of your planet."
              color={accentColor}
            >
              <Step2InterestEcology
                selectedThemes={draft.selectedThemes}
                lifestyle={draft.lifestyle}
                onThemesChange={(v) => update('selectedThemes', v)}
                onLifestyleChange={(v) => update('lifestyle', v)}
              />
            </SectionCard>

            <SectionCard
              title="Atmosphere"
              description="How you communicate and your cognitive signature. Shapes the halo."
              color="#a78bfa"
            >
              <Step3AtmosphereStyle
                communicationStyle={draft.communicationStyle}
                abstractAxis={draft.abstractAxis}
                introspectiveAxis={draft.introspectiveAxis}
                onStyleChange={(v) => update('communicationStyle', v)}
                onAbstractChange={(v) => update('abstractAxis', v)}
                onIntrospectiveChange={(v) => update('introspectiveAxis', v)}
              />
            </SectionCard>

            <SectionCard
              title="Cultural paths"
              description="Location, languages, cities, and cultural touchstones."
              color="#34d399"
            >
              <Step4CulturalPaths
                location={draft.location}
                languages={draft.languages}
                travelCities={draft.travelCities}
                culturalTags={draft.culturalTags}
                onLocationChange={(v) => update('location', v || undefined)}
                onLanguagesChange={(v) => update('languages', v)}
                onCitiesChange={(v) => update('travelCities', v)}
                onCulturalChange={(v) => update('culturalTags', v)}
              />
            </SectionCard>

            <SectionCard
              title="Relational gravity"
              description="What kinds of connections you seek. Influences your resonance field."
              color="#fbbf24"
            >
              <Step5RelationalGravity
                matchPreference={draft.matchPreference}
                connectionTypes={draft.connectionTypes}
                onMatchPrefChange={(v) => update('matchPreference', v)}
                onConnectionTypesChange={(v) => update('connectionTypes', v)}
              />
            </SectionCard>

            {/* Save button (bottom of form, mobile) */}
            <div className="lg:hidden">
              <GlowButton
                onClick={handleSave}
                variant="primary"
                fullWidth
                disabled={saving}
                className="py-4 text-sm"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </GlowButton>
            </div>
          </div>

          {/* -- Right: sticky live preview --------------------------------- */}
          <div className="hidden lg:flex flex-col gap-6 sticky top-20">

            {/* Preview card */}
            <div
              className="flex flex-col items-center gap-5 p-6 rounded-3xl"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${accentColor}15`,
              }}
            >
              <span
                className="text-[10px] uppercase tracking-widest self-start"
                style={{ color: 'var(--ghost)', opacity: 0.5 }}
              >
                Live preview
              </span>
              <LivePlanetPreview planet={previewPlanet} size={140} />
            </div>

            {/* Save button */}
            <GlowButton
              onClick={handleSave}
              variant="primary"
              fullWidth
              disabled={saving}
              className="py-4 text-sm"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </GlowButton>

            <GlowButton href="/my-planet" variant="ghost" fullWidth className="text-xs py-2.5">
              View my planet →
            </GlowButton>
          </div>
        </div>
      </div>

      <SaveToast visible={saved} />
    </AppShell>
  )
}
