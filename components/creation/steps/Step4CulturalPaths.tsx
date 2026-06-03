'use client'

import { useState, type KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { LANGUAGE_OPTIONS } from '@/types/creation'

// --- Tag input ----------------------------------------------------------------

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
  accent = 'var(--star)',
}: {
  tags:        string[]
  onAdd:       (tag: string) => void
  onRemove:    (tag: string) => void
  placeholder: string
  accent?:     string
}) {
  const [input, setInput] = useState('')
  const t = useTranslations('creationSteps')

  function commit() {
    const val = input.trim()
    if (val && !tags.includes(val)) onAdd(val)
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    if (e.key === 'Backspace' && !input && tags.length > 0) onRemove(tags[tags.length - 1])
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-3 rounded-xl min-h-11"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(167,139,250,0.12)',
      }}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md"
          style={{ background: `${accent}14`, border: `1px solid ${accent}28`, color: accent }}
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="ml-0.5 leading-none opacity-60 hover:opacity-100"
            aria-label={t('removeTag', { tag })}
            style={{ color: accent }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-30 bg-transparent text-xs outline-none"
        style={{ color: 'var(--ink)', caretColor: accent }}
      />
    </div>
  )
}

// --- Step4CulturalPaths -------------------------------------------------------

interface Props {
  location?:          string
  languages:          string[]
  travelCities:       string[]
  culturalTags:       string[]
  onLocationChange:   (v: string) => void
  onLanguagesChange:  (langs: string[]) => void
  onCitiesChange:     (cities: string[]) => void
  onCulturalChange:   (tags: string[]) => void
}

export default function Step4CulturalPaths({
  location,
  languages,
  travelCities,
  culturalTags,
  onLocationChange,
  onLanguagesChange,
  onCitiesChange,
  onCulturalChange,
}: Props) {
  const t = useTranslations('creationSteps')

  function toggleLanguage(lang: string) {
    if (languages.includes(lang)) {
      onLanguagesChange(languages.filter((l) => l !== lang))
    } else {
      onLanguagesChange([...languages, lang])
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
          {t('pathsTitle')}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)', opacity: 0.6 }}>
          {t('pathsSubtitle')}
        </p>
      </div>

      {/* Location */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          {t('whereYouAre')}
        </label>
        <input
          type="text"
          value={location ?? ''}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder={t('locationPlaceholder')}
          maxLength={60}
          className="px-4 py-3 rounded-xl bg-transparent text-sm outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(167,139,250,0.12)',
            color: 'var(--ink)',
            caretColor: 'var(--star)',
          }}
        />
      </div>

      {/* Languages */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          {t('languages')}
        </label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = languages.includes(lang)
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className="text-xs px-3 py-1.5 rounded-full transition-all duration-150"
                style={{
                  background: active ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                  border: active
                    ? '1px solid rgba(167,139,250,0.42)'
                    : '1px solid rgba(167,139,250,0.10)',
                  color: active ? 'var(--star)' : 'var(--ghost)',
                  outline: 'none',
                }}
              >
                {lang}
              </button>
            )
          })}
        </div>
      </div>

      {/* Travel cities */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          {t('orbitCities')}
        </label>
        <TagInput
          tags={travelCities}
          onAdd={(c) => onCitiesChange([...travelCities, c])}
          onRemove={(c) => onCitiesChange(travelCities.filter((x) => x !== c))}
          placeholder={t('cityPlaceholder')}
          accent="#34d399"
        />
        <p className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.45 }}>
          {t('cityHint')}
        </p>
      </div>

      {/* Cultural touchstones */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ghost)', opacity: 0.55 }}>
          {t('touchstones')}
        </label>
        <TagInput
          tags={culturalTags}
          onAdd={(t) => onCulturalChange([...culturalTags, t])}
          onRemove={(t) => onCulturalChange(culturalTags.filter((x) => x !== t))}
          placeholder={t('touchstonesPlaceholder')}
          accent="#a78bfa"
        />
        <p className="text-[10px]" style={{ color: 'var(--ghost)', opacity: 0.45 }}>
          {t('touchstonesHint')}
        </p>
      </div>
    </div>
  )
}
