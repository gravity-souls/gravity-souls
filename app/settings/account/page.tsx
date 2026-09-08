'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import LightCone from '@/components/fx/LightCone'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import { authClient } from '@/lib/auth-client'

const DELETE_PHRASE = 'DELETE'

// --- Export section ------------------------------------------------------

function ExportSection() {
  const t = useTranslations('accountSettings')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleExport() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/me/export')
      if (!res.ok) throw new Error('export failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'gravitysouls-data-export.json'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError(t('exportFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <OrbitCard glowColor="#60a5fa" className="p-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold" style={{ color: 'var(--foreground)' }}>
            {t('exportTitle')}
          </h2>
          <p className="text-xs leading-snug" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
            {t('exportDescription')}
          </p>
        </div>
        <div>
          <GlowButton variant="secondary" onClick={handleExport} disabled={loading}>
            {loading ? t('exportButtonLoading') : t('exportButton')}
          </GlowButton>
        </div>
        {error && <span className="text-xs" style={{ color: '#f87171' }}>{error}</span>}
      </div>
    </OrbitCard>
  )
}

// --- Delete section --------------------------------------------------------

function DeleteSection() {
  const t = useTranslations('accountSettings')
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const canDelete = confirmText.trim() === DELETE_PHRASE && !deleting

  async function handleDelete() {
    if (!canDelete) return
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/api/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      })
      if (!res.ok) throw new Error('delete failed')
      setDone(true)
      // Mirror components/auth/sign-out-button.tsx's sign-out mechanism —
      // the account's Session/Account rows are already gone server-side;
      // this clears the client-side cookie and lands on a signed-out state.
      await authClient.signOut()
      window.location.href = '/sign-in'
    } catch {
      setError(t('deleteFailed'))
      setDeleting(false)
    }
  }

  return (
    <OrbitCard glowColor="#f87171" className="p-6" style={{ border: '1px solid rgba(248,113,113,0.28)' }}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold" style={{ color: '#f87171' }}>
            {t('deleteTitle')}
          </h2>
          <p className="text-xs leading-snug" style={{ color: 'var(--ghost)', opacity: 0.85 }}>
            {t('deleteDescription')}
          </p>
        </div>

        <p className="text-xs leading-snug" style={{ color: 'var(--ghost)', opacity: 0.85 }}>
          {t('deleteWarningContent')}
        </p>

        <p className="text-xs font-semibold" style={{ color: '#f87171' }}>
          {t('deleteWarningIrreversible')}
        </p>

        <p className="text-xs leading-snug" style={{ color: 'var(--ghost)', opacity: 0.7 }}>
          {t('deleteExportFirst')}
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: 'var(--foreground)' }}>
            {t('deleteConfirmLabel')}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t('deleteConfirmPlaceholder')}
            disabled={deleting || done}
            autoComplete="off"
            data-testid="delete-account-confirm-input"
            className="rounded-xl px-4 py-3 text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(248,113,113,0.3)',
              color: 'var(--foreground)',
            }}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canDelete || done}
            data-testid="delete-account-submit"
            className="rounded-xl px-6 py-3 text-sm font-medium tracking-wide transition-all duration-300"
            style={{
              background: canDelete ? '#f87171' : 'rgba(248,113,113,0.18)',
              color: canDelete ? '#1a0a0a' : 'rgba(248,113,113,0.6)',
              cursor: canDelete ? 'pointer' : 'not-allowed',
            }}
          >
            {deleting ? t('deleteButtonWorking') : t('deleteButton')}
          </button>
        </div>

        {done && <span className="text-xs" style={{ color: '#34d399' }}>{t('deleteSuccess')}</span>}
        {error && <span className="text-xs" style={{ color: '#f87171' }}>{error}</span>}
      </div>
    </OrbitCard>
  )
}

// --- Page --------------------------------------------------------------------

export default function AccountSettingsPage() {
  const t = useTranslations('accountSettings')

  return (
    <AppShell>
      <LightCone origin="top-left" color="#60a5fa" opacity={0.06} double={false} />

      <div className="relative z-10 px-4 sm:px-6 pt-8 pb-24 max-w-3xl mx-auto">
        <div className="flex flex-col gap-2 mb-8">
          <Link
            href="/settings/planet"
            className="text-xs w-fit"
            style={{ color: 'var(--ghost)', opacity: 0.7 }}
          >
            {t('backToPlanetSettings')}
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold" style={{ color: 'var(--foreground)' }}>
            {t('title')}
          </h1>
          <p className="text-sm max-w-lg" style={{ color: 'var(--ink)', opacity: 0.55 }}>
            {t('subtitle')}
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <ExportSection />
          <DeleteSection />
        </div>
      </div>
    </AppShell>
  )
}
