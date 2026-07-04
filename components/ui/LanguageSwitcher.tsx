'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Globe2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { isLocale, type Locale } from '@/lib/i18n-locales'

type Variant = 'desktop' | 'mobile'

const LANGUAGES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
]

function writeLocaleCookie(language: Locale) {
  document.cookie = `locale=${language}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

export default function LanguageSwitcher({ variant = 'desktop' }: { variant?: Variant }) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('language')
  const activeLocale = isLocale(locale) ? locale : 'en'
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState<Locale | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  async function selectLanguage(language: Locale) {
    writeLocaleCookie(language)
    setSaving(language)

    let saved = false
    try {
      const res = await fetch('/api/user/language', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      })
      saved = res.ok
    } catch {
      // Network error — cookie fallback still applied above.
    } finally {
      setSaving(null)
      setOpen(false)
      router.refresh()
    }

    if (saved) {
      setToastVisible(true)
      window.setTimeout(() => setToastVisible(false), 1800)
    }
  }

  const options = (
    <div className={variant === 'mobile' ? 'flex flex-col gap-2' : 'py-1'}>
      {LANGUAGES.map((language) => {
        const active = activeLocale === language.code
        return (
          <button
            key={language.code}
            type="button"
            onClick={() => selectLanguage(language.code)}
            disabled={saving === language.code}
            className={[
              'flex w-full items-center justify-between gap-3 text-left transition',
              variant === 'mobile'
                ? 'rounded-xl border border-white/8 bg-white/4 px-4 py-3 text-sm hover:bg-white/7'
                : 'px-3 py-2.5 text-sm hover:bg-white/6',
            ].join(' ')}
            style={{ color: active ? '#fff' : 'rgba(255,255,255,0.72)' }}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="text-base" aria-hidden="true">{language.flag}</span>
              <span className="truncate">{language.label}</span>
            </span>
            {active && <Check className="h-4 w-4 shrink-0 text-violet-200" />}
          </button>
        )
      })}
    </div>
  )

  if (variant === 'mobile') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
          <Globe2 className="h-4 w-4" />
          {t('title')}
        </div>
        {options}
        {toastVisible && <p className="text-xs font-medium text-emerald-300">{t('saved')}</p>}
      </div>
    )
  }

  return (
    <div className="relative hidden md:block" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t('title')}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/4 text-white/72 transition hover:bg-white/8 hover:text-white"
      >
        <Globe2 className="h-4.5 w-4.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#090d18]/95 shadow-[0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="border-b border-white/8 px-3 py-2.5">
            <p className="text-sm font-semibold text-white">{t('title')}</p>
          </div>
          {options}
        </div>
      )}

      {toastVisible && (
        <div className="absolute right-0 top-12 z-60 mt-56 whitespace-nowrap rounded-full border border-emerald-300/20 bg-emerald-400/12 px-3 py-1.5 text-xs font-medium text-emerald-200 shadow-[0_12px_36px_rgba(0,0,0,0.35)]">
          {t('saved')}
        </div>
      )}
    </div>
  )
}
