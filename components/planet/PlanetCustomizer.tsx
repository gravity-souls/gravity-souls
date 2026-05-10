'use client'

/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Check, Lock, RotateCcw, Save, Upload, X } from 'lucide-react'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import PlanetGlobe from '@/components/planet/PlanetGlobe'
import { PRESET_PLANETS, type PlanetConfig } from '@/types/planet'

const COLOR_SWATCHES = [
  { name: 'Nebula', tone: 'Deep violet', color: '#7c4dbf' },
  { name: 'Lumen', tone: 'Soft lavender', color: '#a78bfa' },
  { name: 'Orbit', tone: 'Clear blue', color: '#60a5fa' },
  { name: 'Aurora', tone: 'Electric cyan', color: '#22d3ee' },
  { name: 'Verdant', tone: 'Living green', color: '#34d399' },
  { name: 'Solar', tone: 'Warm gold', color: '#fbbf24' },
  { name: 'Ember', tone: 'Bright orange', color: '#fb923c' },
  { name: 'Pulse', tone: 'Signal red', color: '#f87171' },
  { name: 'Bloom', tone: 'Rose light', color: '#f472b6' },
  { name: 'Mist', tone: 'Pale glow', color: '#e8e0ff' },
]

interface Props {
  initialConfig: PlanetConfig
  planetName: string
  userLevel: number
  onSaved?: (config: PlanetConfig) => void
  onClose?: () => void
}

function sameConfig(a: PlanetConfig, b: PlanetConfig) {
  return JSON.stringify(a) === JSON.stringify(b)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readNumber(value: string, min: number, max: number) {
  return clamp(Number(value), min, max)
}

function normalizeConfig(config: PlanetConfig): PlanetConfig {
  return {
    ...config,
    atmosphereDensity: clamp(config.atmosphereDensity, 0, 0.3),
    rotationSpeed: clamp(config.rotationSpeed, 0.005, 0.03),
    cloudOpacity: clamp(config.cloudOpacity, 0, 0.5),
  }
}

function findPreset(config: PlanetConfig) {
  return PRESET_PLANETS.find((planet) => planet.baseTexture === config.baseTexture) ?? PRESET_PLANETS[0]
}

async function readResponseError(response: Response, fallback: string) {
  if (response.status === 401) return 'Sign in before uploading a custom texture'
  if (response.status === 403) return 'Custom textures are locked for this planet'
  if (response.status === 413) return 'The texture file is too large'
  if (response.status >= 500) return 'The server could not store this texture'

  const data = await response.json().catch(() => null)
  if (typeof data?.error === 'string') return data.error

  return fallback
}

function findColorOption(value: string) {
  return COLOR_SWATCHES.find((option) => option.color.toLowerCase() === value.toLowerCase()) ?? {
    name: 'Custom',
    tone: 'Saved color',
    color: value,
  }
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (color: string) => void
}) {
  const selectedOption = findColorOption(value)

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative overflow-hidden rounded-lg border p-3"
        style={{
          borderColor: `${selectedOption.color}55`,
          background: `radial-gradient(circle at 12% 25%, ${selectedOption.color}32, transparent 34%), rgba(255,255,255,0.035)`,
        }}
      >
        <div className="relative flex items-center gap-3">
          <span
            className="h-11 w-11 shrink-0 rounded-full border border-white/20"
            style={{
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75), transparent 28%), ${selectedOption.color}`,
              boxShadow: `0 0 24px ${selectedOption.color}88`,
            }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--ghost)' }}>{label}</p>
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{selectedOption.name}</p>
            <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.62 }}>{selectedOption.tone}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {COLOR_SWATCHES.map((option) => {
          const selected = option.color.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={option.color}
              type="button"
              onClick={() => onChange(option.color)}
              className="flex items-center gap-2 rounded-lg border p-2 text-left transition duration-200"
              style={{
                background: selected ? `${option.color}18` : 'rgba(255,255,255,0.035)',
                borderColor: selected ? `${option.color}88` : 'rgba(255,255,255,0.10)',
                boxShadow: selected ? `0 0 18px ${option.color}44` : 'none',
                transform: selected ? 'scale(1.08)' : 'scale(1)',
              }}
              aria-label={`Choose ${option.name}`}
              aria-pressed={selected}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                style={{ background: option.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold" style={{ color: 'var(--foreground)' }}>{option.name}</span>
              </span>
              {selected && <Check size={13} style={{ color: option.color }} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CosmicToggle({
  label,
  checked,
  onChange,
  accentColor,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  accentColor: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5 text-sm transition"
      style={{
        color: checked ? 'var(--foreground)' : 'var(--ink)',
        background: checked ? `${accentColor}18` : 'rgba(255,255,255,0.04)',
        borderColor: checked ? `${accentColor}66` : 'rgba(255,255,255,0.10)',
      }}
    >
      <span>{label}</span>
      <span
        className="relative h-6 w-11 rounded-full border transition"
        style={{ background: checked ? `${accentColor}55` : 'rgba(255,255,255,0.08)', borderColor: checked ? `${accentColor}99` : 'rgba(255,255,255,0.12)' }}
        aria-hidden="true"
      >
        <span
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition"
          style={{
            left: checked ? 22 : 4,
            background: checked ? '#fff' : 'rgba(232,224,255,0.65)',
            boxShadow: checked ? `0 0 14px ${accentColor}` : 'none',
          }}
        />
      </span>
    </button>
  )
}

function ControlSection({
  title,
  level,
  userLevel,
  children,
}: {
  title: string
  level: number
  userLevel: number
  children: ReactNode
}) {
  const locked = userLevel < level

  return (
    <section className="rounded-lg border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h3>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px]" style={{ color: 'var(--ghost)' }}>
            <Lock size={12} /> Unlock at Lv.{level}
          </span>
        )}
      </div>
      <div className={locked ? 'pointer-events-none opacity-40' : ''}>{children}</div>
    </section>
  )
}

export default function PlanetCustomizer({ initialConfig, planetName, userLevel, onSaved, onClose }: Props) {
  const [savedConfig, setSavedConfig] = useState(() => normalizeConfig(initialConfig))
  const [localConfig, setLocalConfig] = useState(() => normalizeConfig(initialConfig))
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const nextConfig = normalizeConfig(initialConfig)
    setSavedConfig(nextConfig)
    setLocalConfig(nextConfig)
  }, [initialConfig])

  const isDirty = useMemo(() => !sameConfig(localConfig, savedConfig), [localConfig, savedConfig])
  const selectedPreset = findPreset(localConfig)

  function updateConfig(partial: Partial<PlanetConfig>) {
    setLocalConfig((current) => normalizeConfig({ ...current, ...partial }))
    setMessage(null)
  }

  function selectPreset(preset: PlanetConfig) {
    updateConfig({ ...preset, customTextureUrl: undefined })
  }

  async function savePlanet() {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/planet-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localConfig),
      })

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Could not save planet'))
      }

      setSavedConfig(localConfig)
      onSaved?.(localConfig)
      setMessage('Saved')
      onClose?.()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save planet')
    } finally {
      setSaving(false)
    }
  }

  async function uploadTexture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('Use JPG, PNG, or WEBP')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('Max file size is 5MB')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/planet-texture', { method: 'POST', body: formData })

      if (!response.ok) {
        throw new Error(await readResponseError(response, 'Upload failed'))
      }

      const data = await response.json().catch(() => null)
      if (typeof data?.url !== 'string') {
        throw new Error('The server did not return a texture URL')
      }

      updateConfig({ customTextureUrl: data.url })
      setMessage('Texture uploaded')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed. Check that the app server is running.')
    } finally {
      setUploading(false)
    }
  }

  function resetToPreset() {
    selectPreset(selectedPreset)
  }

  return (
    <div className="grid min-h-full gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-white/10 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--ghost)' }}>Live preview</p>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: 'var(--foreground)' }}>{planetName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs" style={{ color: 'var(--star)' }}>Lv.{userLevel}</span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:text-white md:hidden"
                aria-label="Close customizer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-center py-3">
          <PlanetGlobe planetConfig={localConfig} size={250} />
        </div>
      </aside>

      <div className="flex flex-col gap-4">
        <ControlSection title="Base" level={1} userLevel={userLevel}>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 md:grid-cols-4 xl:grid-cols-8">
            {PRESET_PLANETS.map((planet) => {
              const selected = planet.baseTexture === localConfig.baseTexture && !localConfig.customTextureUrl
              return (
                <button
                  key={planet.baseTexture}
                  type="button"
                  onClick={() => selectPreset(planet)}
                  className="flex flex-col items-center gap-2 rounded-lg p-2 transition duration-200"
                  style={{
                    border: `1px solid ${selected ? planet.tintColor : 'rgba(255,255,255,0.10)'}`,
                    background: selected ? `${planet.tintColor}18` : 'rgba(255,255,255,0.03)',
                    transform: selected ? 'scale(1.05)' : 'scale(1)',
                  }}
                  aria-pressed={selected}
                  title={planet.name}
                >
                  <PlanetAvatar planetConfig={planet} size={46} />
                  <span className="max-w-full truncate text-[10px]" style={{ color: 'var(--ghost)' }}>{planet.name}</span>
                </button>
              )
            })}
          </div>
        </ControlSection>

        <ControlSection title="Color" level={2} userLevel={userLevel}>
          <ColorControl label="Planet tint" value={localConfig.tintColor} onChange={(tintColor) => updateConfig({ tintColor })} />
        </ControlSection>

        <ControlSection title="Atmosphere & Ring" level={3} userLevel={userLevel}>
          <div className="grid gap-4 md:grid-cols-2">
            <ColorControl label="Atmosphere" value={localConfig.atmosphereColor} onChange={(atmosphereColor) => updateConfig({ atmosphereColor })} />
            <CosmicToggle label="Ring" checked={localConfig.hasRing} accentColor={localConfig.ringColor || localConfig.tintColor} onChange={(hasRing) => updateConfig({ hasRing })} />
            <label className="md:col-span-2 text-sm" style={{ color: 'var(--ink)' }}>
              <span className="mb-2 flex justify-between"><span>Atmosphere density</span><span>{localConfig.atmosphereDensity.toFixed(2)}</span></span>
              <input type="range" min={0} max={0.3} step={0.01} value={localConfig.atmosphereDensity} onChange={(event) => updateConfig({ atmosphereDensity: readNumber(event.target.value, 0, 0.3) })} className="w-full accent-violet-400" />
            </label>
            {localConfig.hasRing && (
              <div className="md:col-span-2">
                <ColorControl label="Ring color" value={localConfig.ringColor || localConfig.tintColor} onChange={(ringColor) => updateConfig({ ringColor })} />
              </div>
            )}
          </div>
        </ControlSection>

        <ControlSection title="Motion & Surface" level={4} userLevel={userLevel}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm" style={{ color: 'var(--ink)' }}>
              <span className="mb-2 flex justify-between"><span>Rotation speed</span><span>{localConfig.rotationSpeed.toFixed(3)}</span></span>
              <input type="range" min={0.005} max={0.03} step={0.001} value={localConfig.rotationSpeed} onChange={(event) => updateConfig({ rotationSpeed: readNumber(event.target.value, 0.005, 0.03) })} className="w-full accent-violet-400" />
              <span className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--ghost)' }}><span>Slow</span><span>Medium</span><span>Fast</span></span>
            </label>
            <label className="text-sm" style={{ color: 'var(--ink)' }}>
              <span className="mb-2 flex justify-between"><span>Cloud opacity</span><span>{localConfig.cloudOpacity.toFixed(2)}</span></span>
              <input type="range" min={0} max={0.5} step={0.05} value={localConfig.cloudOpacity} onChange={(event) => updateConfig({ cloudOpacity: readNumber(event.target.value, 0, 0.5) })} className="w-full accent-violet-400" />
              <span className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--ghost)' }}><span>None</span><span>Light</span><span>Dense</span></span>
            </label>
          </div>
        </ControlSection>

        <ControlSection title="Custom Texture" level={5} userLevel={userLevel}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {localConfig.customTextureUrl && (
                <img src={localConfig.customTextureUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition" style={{ color: 'var(--ink)', background: 'rgba(255,255,255,0.04)' }}>
                <Upload size={16} />
                {uploading ? 'Uploading' : 'Upload texture'}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadTexture} disabled={uploading} className="hidden" />
              </label>
            </div>
            {localConfig.customTextureUrl && (
              <button type="button" onClick={() => updateConfig({ customTextureUrl: undefined })} className="rounded-lg border border-white/10 px-3 py-2 text-sm" style={{ color: 'var(--ghost)' }}>
                Remove custom texture
              </button>
            )}
          </div>
        </ControlSection>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-white/10 bg-[rgba(5,4,18,0.92)] py-4 backdrop-blur md:static md:border-0 md:bg-transparent md:py-0">
          <button
            type="button"
            onClick={savePlanet}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: localConfig.tintColor, color: '#fff' }}
          >
            <Save size={16} />
            Save Planet
            {isDirty && <span className="h-2 w-2 rounded-full bg-white" aria-label="Unsaved changes" />}
          </button>
          <button type="button" onClick={resetToPreset} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm" style={{ color: 'var(--ink)' }}>
            <RotateCcw size={16} />
            Reset to preset
          </button>
          {message && <span className="text-xs" style={{ color: message === 'Saved' || message === 'Texture uploaded' ? 'var(--star)' : '#f87171' }}>{message}</span>}
        </div>
      </div>
    </div>
  )
}
