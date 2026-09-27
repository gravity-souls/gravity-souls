'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import GlowButton from '@/components/ui/GlowButton'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import SectionCard from '@/components/ui/SectionCard'
import { authClient } from '@/lib/auth-client'

const ACCENT_COLOR = '#a78bfa'

// --- Save confirmation toast --------------------------------------------------

function SaveToast({ visible }: { visible: boolean }) {
  const t = useTranslations('planetSettings')

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
        {t('updated')}
      </span>
    </div>
  )
}

// --- Privacy: who can see this planet -----------------------------------------
// Self-contained: reads/writes Profile.visibility independently of the
// identity fields below.

type Visibility = 'MEMBERS' | 'PRIVATE'

function PrivacySection() {
  const t = useTranslations('safety')
  const [visibility, setVisibility] = useState<Visibility | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { profile?: { visibility?: Visibility } } | null) => {
        if (!cancelled) setVisibility(data?.profile?.visibility ?? 'MEMBERS')
      })
      .catch(() => { if (!cancelled) setVisibility('MEMBERS') })
    return () => { cancelled = true }
  }, [])

  async function choose(next: Visibility) {
    if (next === visibility || saving) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/my-planet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: next }),
      })
      if (res.ok) {
        setVisibility(next)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (visibility === null) return null

  return (
    <SectionCard title={t('privacyTitle')} description={t('privacyDescription')} color="#60a5fa">
      <div className="flex flex-col gap-2">
        {(['MEMBERS', 'PRIVATE'] as const).map((option) => (
          <button
            key={option}
            onClick={() => choose(option)}
            disabled={saving}
            className="text-left px-4 py-3 rounded-xl text-sm transition-all"
            style={{
              background: visibility === option ? 'rgba(96,165,250,0.14)' : 'rgba(255,255,255,0.02)',
              border: visibility === option ? '1px solid rgba(96,165,250,0.4)' : '1px solid var(--border-soft)',
              color: 'var(--foreground)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {option === 'MEMBERS' ? t('visibilityMembers') : t('visibilityPrivate')}
          </button>
        ))}
        {saved && <span className="text-[10px]" style={{ color: '#34d399' }}>{t('visibilitySaved')}</span>}
      </div>
    </SectionCard>
  )
}

// --- Account & data (export / delete) entry point ---------------------------
// The export/delete UI itself lives at /settings/account (a page of its own —
// deletion needs real friction, not a quick inline action here).

function AccountDataSection() {
  const t = useTranslations('accountSettings')

  return (
    <SectionCard title={t('title')} description={t('subtitle')} color="#f87171">
      <Link
        href="/settings/account"
        className="text-sm font-medium w-fit"
        style={{ color: '#f87171' }}
      >
        {t('linkFromPlanetSettings')} →
      </Link>
    </SectionCard>
  )
}

// --- Page ---------------------------------------------------------------------
// Account-level settings only — display name, planet name, language, privacy,
// and account/data. Personality traits (mood, interests, atmosphere, cultural
// paths, relational gravity) and the planet's visual appearance are edited on
// /my-planet itself, where the same live 3D preview already lives.

export default function PlanetSettingsPage() {
  const router = useRouter()
  const tSettings = useTranslations('planetSettings')
  const tLanguage = useTranslations('language')
  const { refetch: refetchSession } = authClient.useSession()
  const [mounted,   setMounted]   = useState(false)
  const [loaded,    setLoaded]    = useState(false)
  const [accountName, setAccountName] = useState('')
  const [planetName, setPlanetName] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (cancelled) return

      setMounted(true)

      // Load from API — DB is the sole source of truth
      Promise.all([
        fetch('/api/my-planet').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/me').then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([dbPlanet, meData]) => {
          if (cancelled) return
          if (!dbPlanet) {
            router.replace('/onboarding')
            return
          }
          setAccountName(meData?.user?.name ?? '')
          setPlanetName(dbPlanet.name ?? '')
          setLoaded(true)
        })
        .catch(() => {
          if (cancelled) return
          router.replace('/onboarding')
        })
    })

    return () => { cancelled = true }
  }, [router])

  async function handleSave() {
    const nextAccountName = accountName.trim()
    const nextPlanetName = planetName.trim()

    if (!nextAccountName) {
      setError(tSettings('displayNameRequired'))
      return
    }

    if (!nextPlanetName) {
      setError(tSettings('planetNameRequired'))
      return
    }

    setSaving(true)
    setError('')

    try {
      const accountResult = await authClient.updateUser({ name: nextAccountName })
      if (accountResult.error) {
        throw new Error(accountResult.error.message ?? tSettings('displayNameFailed'))
      }

      const res = await fetch('/api/my-planet', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextPlanetName }),
      })
      if (!res.ok) {
        throw new Error((await res.text()) || tSettings('savePlanetFailed'))
      }
      setAccountName(nextAccountName)
      setPlanetName(nextPlanetName)
      await refetchSession()
      router.refresh()
      setSaved(true)
      setTimeout(() => setSaved(false), 2800)
    } catch (e) {
      console.error('Failed to save settings:', e)
      setError(e instanceof Error ? e.message : tSettings('saveSettingsFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!mounted || !loaded) return null

  return (
    <AppShell>
      <LightCone origin="top-left" color={ACCENT_COLOR} opacity={0.06} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-24 max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <p
            className="text-xs uppercase tracking-[0.25em] font-medium"
            style={{ color: ACCENT_COLOR, opacity: 0.7 }}
          >
            {tSettings('settings')}
          </p>
          <h1
            className="text-3xl sm:text-4xl font-bold w-fit"
            style={{
              backgroundImage: `linear-gradient(135deg, #e8e0ff 0%, ${ACCENT_COLOR} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {accountName || planetName}
          </h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--ink)', opacity: 0.55 }}>
            {tSettings('description')}
          </p>
        </div>

        <div className="flex flex-col gap-6">

          <SectionCard
            title={tSettings('identity')}
            description={tSettings('identityDescription')}
            color={ACCENT_COLOR}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="account-name" className="text-xs font-medium" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
                  {tSettings('displayName')}
                </label>
                <input
                  id="account-name"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  maxLength={40}
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-medium outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'var(--foreground)',
                  }}
                  placeholder={tSettings('displayNamePlaceholder')}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="planet-name" className="text-xs font-medium" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
                  {tSettings('planetName')}
                </label>
                <input
                  id="planet-name"
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
                  placeholder={tSettings('planetNamePlaceholder')}
                />
              </div>

              {error && (
                <p className="text-xs font-medium" style={{ color: '#f87171' }}>
                  {error}
                </p>
              )}
            </div>
          </SectionCard>

          <div className="md:hidden">
            <SectionCard
              title={tLanguage('title')}
              description=""
              color={ACCENT_COLOR}
            >
              <LanguageSwitcher variant="mobile" />
            </SectionCard>
          </div>

          <PrivacySection />

          <AccountDataSection />

          <GlowButton
            onClick={handleSave}
            variant="primary"
            fullWidth
            disabled={saving}
            className="py-4 text-sm"
          >
            {saving ? tSettings('saving') : tSettings('saveChanges')}
          </GlowButton>

          <GlowButton href="/my-planet" variant="ghost" fullWidth className="text-xs py-2.5">
            {tSettings('viewMyPlanet')}
          </GlowButton>
        </div>
      </div>

      <SaveToast visible={saved} />
    </AppShell>
  )
}
