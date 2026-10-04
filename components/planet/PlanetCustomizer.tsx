'use client'

/* eslint-disable @next/next/no-img-element */

import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Check, Lock, RotateCcw, Save, Upload, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import PlanetGlobe from '@/components/planet/PlanetGlobe'
import XPProgressBar from '@/components/planet/XPProgressBar'
import { EARLY_ACCESS } from '@/lib/featureFlags'
import { clampLevel } from '@/lib/xp'
import { PRESET_PLANETS, type PlanetConfig } from '@/types/planet'

const COLOR_SWATCHES = [
  { name: 'Nebula', color: '#7c4dbf' },
  { name: 'Lumen', color: '#a78bfa' },
  { name: 'Orbit', color: '#60a5fa' },
  { name: 'Aurora', color: '#22d3ee' },
  { name: 'Verdant', color: '#34d399' },
  { name: 'Solar', color: '#fbbf24' },
  { name: 'Ember', color: '#fb923c' },
  { name: 'Pulse', color: '#f87171' },
  { name: 'Bloom', color: '#f472b6' },
  { name: 'Mist', color: '#e8e0ff' },
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
    hasRing: false,
    ringColor: '',
    atmosphereDensity: clamp(config.atmosphereDensity, 0, 0.3),
    rotationSpeed: clamp(config.rotationSpeed, 0.005, 0.03),
    cloudOpacity: clamp(config.cloudOpacity, 0, 0.5),
  }
}

function findPreset(config: PlanetConfig) {
  return PRESET_PLANETS.find((planet) => planet.baseTexture === config.baseTexture) ?? PRESET_PLANETS[0]
}

async function readResponseError(response: Response, fallback: string, t: ReturnType<typeof useTranslations>) {
  if (response.status === 401) return t('uploadSignIn')
  if (response.status === 403) return t('uploadLocked')
  if (response.status === 413) return t('fileSizeError')
  if (response.status >= 500) return t('uploadServerError')

  return fallback
}

function findColorOption(value: string) {
  return COLOR_SWATCHES.find((option) => option.color.toLowerCase() === value.toLowerCase()) ?? {
    name: 'Custom',
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
  const t = useTranslations('planetCustomizer')
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
            <p className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{t(`swatches.${selectedOption.name}.name`)}</p>
            <p className="text-xs" style={{ color: 'var(--ink)', opacity: 0.62 }}>{t(`swatches.${selectedOption.name}.tone`)}</p>
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
              aria-label={t('chooseColor', { name: t(`swatches.${option.name}.name`) })}
              aria-pressed={selected}
            >
              <span
                className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                style={{ background: option.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold" style={{ color: 'var(--foreground)' }}>{t(`swatches.${option.name}.name`)}</span>
              </span>
              {selected && <Check size={13} style={{ color: option.color }} aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ControlSection({
  title,
  level,
  userLevel,
  earlyAccess,
  children,
}: {
  title: string
  level: number
  userLevel: number
  earlyAccess: boolean
  children: ReactNode
}) {
  const t = useTranslations('planetCustomizer')
  const locked = !earlyAccess && userLevel < level
  const unlockLevel = clampLevel(level)
  const tCommon = useTranslations('common')

  return (
    <section className="rounded-lg border border-white/10 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h3>
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px]" style={{ color: 'var(--ghost)' }}>
            <Lock size={12} /> {t('unlockAt', { level, name: tCommon(`levelNames.${unlockLevel}`) })}
          </span>
        )}
      </div>
      <div className={locked ? 'pointer-events-none opacity-40' : ''}>{children}</div>
    </section>
  )
}

interface XPSummary {
  xp: number
  userLevel: number
}

export default function PlanetCustomizer({ initialConfig, planetName, userLevel, onSaved, onClose }: Props) {
  const t = useTranslations('planetCustomizer')
  const [savedConfig, setSavedConfig] = useState(() => normalizeConfig(initialConfig))
  const [localConfig, setLocalConfig] = useState(() => normalizeConfig(initialConfig))
  const [xpSummary, setXpSummary] = useState<XPSummary | null>(null)
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
  const effectiveUserLevel = EARLY_ACCESS ? 5 : xpSummary?.userLevel ?? userLevel

  useEffect(() => {
    let cancelled = false

    fetch('/api/user/xp')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.xp === 'number' && typeof data?.userLevel === 'number') {
          setXpSummary({ xp: data.xp, userLevel: data.userLevel })
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function handleXPUpdated(event: Event) {
      const data = (event as CustomEvent).detail
      if (typeof data?.xp === 'number' && typeof data?.userLevel === 'number') {
        setXpSummary({ xp: data.xp, userLevel: data.userLevel })
      }
    }

    window.addEventListener('xp:updated', handleXPUpdated)
    return () => window.removeEventListener('xp:updated', handleXPUpdated)
  }, [])

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
        throw new Error(await readResponseError(response, t('saveError'), t))
      }

      setSavedConfig(localConfig)
      window.dispatchEvent(new CustomEvent('planet-config:updated', { detail: localConfig }))
      onSaved?.(localConfig)
      setMessage(t('saved'))
      onClose?.()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('saveError'))
    } finally {
      setSaving(false)
    }
  }

  async function uploadTexture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage(t('fileTypeError'))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(t('fileSizeError'))
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    setUploading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/user/planet-texture', { method: 'POST', body: formData })

      if (!response.ok) {
        throw new Error(await readResponseError(response, t('uploadFailed'), t))
      }

      const data = await response.json().catch(() => null)
      if (typeof data?.url !== 'string') {
        throw new Error(t('missingTextureUrl'))
      }

      updateConfig({ customTextureUrl: data.url })
      setMessage(t('textureUploaded'))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('uploadServerError'))
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
            <p className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--ghost)' }}>{t('livePreview')}</p>
            <h2 className="mt-1 text-xl font-semibold" style={{ color: 'var(--foreground)' }}>{planetName}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* The real level, not effectiveUserLevel — that one is forced to 5
                while EARLY_ACCESS is on so every control unlocks, and showing
                it here read as a fake level that contradicted the real one
                shown elsewhere (e.g. My Planet's own header). */}
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs" style={{ color: 'var(--star)' }}>Lv.{xpSummary?.userLevel ?? userLevel}</span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/70 transition hover:text-white md:hidden"
                aria-label={t('close')}
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
        {EARLY_ACCESS && (
          <div className="rounded-lg border border-amber-300/20 px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.08)', color: '#fbbf24' }}>
            {t('earlyAccess')}
          </div>
        )}

        <ControlSection title={t('base')} level={1} userLevel={effectiveUserLevel} earlyAccess={EARLY_ACCESS}>
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

        <ControlSection title={t('color')} level={2} userLevel={effectiveUserLevel} earlyAccess={EARLY_ACCESS}>
          <ColorControl label={t('planetTint')} value={localConfig.tintColor} onChange={(tintColor) => updateConfig({ tintColor })} />
        </ControlSection>

        <ControlSection title={t('atmosphere')} level={3} userLevel={effectiveUserLevel} earlyAccess={EARLY_ACCESS}>
          <div className="grid gap-4 md:grid-cols-2">
            <ColorControl label={t('atmosphere')} value={localConfig.atmosphereColor} onChange={(atmosphereColor) => updateConfig({ atmosphereColor })} />
            <label className="md:col-span-2 text-sm" style={{ color: 'var(--ink)' }}>
              <span className="mb-2 flex justify-between"><span>{t('atmosphereDensity')}</span><span>{localConfig.atmosphereDensity.toFixed(2)}</span></span>
              <input type="range" min={0} max={0.3} step={0.01} value={localConfig.atmosphereDensity} onChange={(event) => updateConfig({ atmosphereDensity: readNumber(event.target.value, 0, 0.3) })} className="w-full accent-violet-400" />
            </label>
          </div>
        </ControlSection>

        <ControlSection title={t('motionSurface')} level={4} userLevel={effectiveUserLevel} earlyAccess={EARLY_ACCESS}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm" style={{ color: 'var(--ink)' }}>
              <span className="mb-2 flex justify-between"><span>{t('rotationSpeed')}</span><span>{localConfig.rotationSpeed.toFixed(3)}</span></span>
              <input type="range" min={0.005} max={0.03} step={0.001} value={localConfig.rotationSpeed} onChange={(event) => updateConfig({ rotationSpeed: readNumber(event.target.value, 0.005, 0.03) })} className="w-full accent-violet-400" />
              <span className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--ghost)' }}><span>{t('slow')}</span><span>{t('medium')}</span><span>{t('fast')}</span></span>
            </label>
            <label className="text-sm" style={{ color: 'var(--ink)' }}>
              <span className="mb-2 flex justify-between"><span>{t('cloudOpacity')}</span><span>{localConfig.cloudOpacity.toFixed(2)}</span></span>
              <input type="range" min={0} max={0.5} step={0.05} value={localConfig.cloudOpacity} onChange={(event) => updateConfig({ cloudOpacity: readNumber(event.target.value, 0, 0.5) })} className="w-full accent-violet-400" />
              <span className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--ghost)' }}><span>{t('none')}</span><span>{t('light')}</span><span>{t('dense')}</span></span>
            </label>
          </div>
        </ControlSection>

        <ControlSection title={t('customTexture')} level={5} userLevel={effectiveUserLevel} earlyAccess={EARLY_ACCESS}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {localConfig.customTextureUrl && (
                <img src={localConfig.customTextureUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm transition" style={{ color: 'var(--ink)', background: 'rgba(255,255,255,0.04)' }}>
                <Upload size={16} />
                {uploading ? t('uploading') : t('uploadTexture')}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadTexture} disabled={uploading} className="hidden" />
              </label>
            </div>
            {localConfig.customTextureUrl && (
              <button type="button" onClick={() => updateConfig({ customTextureUrl: undefined })} className="rounded-lg border border-white/10 px-3 py-2 text-sm" style={{ color: 'var(--ghost)' }}>
                {t('removeTexture')}
              </button>
            )}
          </div>
        </ControlSection>

        {!EARLY_ACCESS && xpSummary && <XPProgressBar xp={xpSummary.xp} userLevel={xpSummary.userLevel} />}

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-white/10 bg-[rgba(5,4,18,0.92)] pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur md:static md:border-0 md:bg-transparent md:py-0">
          <button
            type="button"
            onClick={savePlanet}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: localConfig.tintColor, color: '#fff' }}
          >
            <Save size={16} />
            {t('savePlanet')}
            {isDirty && <span className="h-2 w-2 rounded-full bg-white" aria-label={t('unsavedChanges')} />}
          </button>
          <button type="button" onClick={resetToPreset} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm" style={{ color: 'var(--ink)' }}>
            <RotateCcw size={16} />
            {t('resetPreset')}
          </button>
          {message && <span className="text-xs" style={{ color: message === t('saved') || message === t('textureUploaded') ? 'var(--star)' : '#f87171' }}>{message}</span>}
        </div>
      </div>
    </div>
  )
}
