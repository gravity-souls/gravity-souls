'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import LivePlanetPreview from '@/components/creation/LivePlanetPreview'
import Step1EmotionalTone from '@/components/creation/steps/Step1EmotionalTone'
import Step2InterestEcology from '@/components/creation/steps/Step2InterestEcology'
import Step3AtmosphereStyle from '@/components/creation/steps/Step3AtmosphereStyle'
import Step4CulturalPaths from '@/components/creation/steps/Step4CulturalPaths'
import Step5RelationalGravity from '@/components/creation/steps/Step5RelationalGravity'
import { buildPlanetFromDraft, planetProfileToDraft } from '@/lib/planet-builder'
import { getPlanetProfile, savePlanetProfile, getOrCreateUserId } from '@/lib/user'
import type { PlanetDraft } from '@/types/creation'
import { INITIAL_DRAFT } from '@/types/creation'

// ─── Section wrapper ──────────────────────────────────────────────────────────

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

// ─── Save confirmation toast ──────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlanetSettingsPage() {
  const router = useRouter()
  const [mounted,   setMounted]   = useState(false)
  const [userId,    setUserId]    = useState('')
  const [draft,     setDraft]     = useState<PlanetDraft>(INITIAL_DRAFT)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [accentColor, setAccentColor] = useState('#a78bfa')

  useEffect(() => {
    setMounted(true)
    const id = getOrCreateUserId()
    setUserId(id)
    const planet = getPlanetProfile()
    if (!planet) {
      router.replace('/create-planet')
      return
    }
    const converted = planetProfileToDraft(planet)
    setDraft(converted)
    setAccentColor(planet.visual.coreColor)
  }, [router])

  const previewPlanet = useMemo(
    () => (userId ? buildPlanetFromDraft(draft, userId) : null),
    [draft, userId],
  )

  // Keep accent color in sync with climate choice
  useEffect(() => {
    if (previewPlanet) setAccentColor(previewPlanet.visual.coreColor)
  }, [previewPlanet])

  function update<K extends keyof PlanetDraft>(key: K, value: PlanetDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function handleSave() {
    if (!userId || !previewPlanet) return
    setSaving(true)
    savePlanetProfile(previewPlanet)
    setTimeout(() => {
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2800)
    }, 400)
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
            className="text-3xl sm:text-4xl font-bold"
            style={{
              background: `linear-gradient(135deg, #e8e0ff 0%, ${accentColor} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Tune your planet
          </h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--ink)', opacity: 0.55 }}>
            Reshape any dimension of your world. Changes update the live preview instantly and are
            saved when you confirm.
          </p>
        </div>

        {/* Main grid: edit sections + sticky preview */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          {/* ── Left: edit sections ─────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

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

          {/* ── Right: sticky live preview ───────────────────────────────── */}
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
