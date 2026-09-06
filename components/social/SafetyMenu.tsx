'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'

// --- SafetyMenu ---------------------------------------------------------------
// Follow/unfollow toggle plus a "..." menu with Block and Report. Every action
// is enforced server-side; this is presentation only.

interface Props {
  targetUserId: string
  className?: string
}

export default function SafetyMenu({ targetUserId, className }: Props) {
  const t = useTranslations('safety')
  const router = useRouter()
  const [following, setFollowing] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/follows/${encodeURIComponent(targetUserId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { following: boolean } | null) => {
        if (!cancelled) setFollowing(data?.following ?? false)
      })
      .catch(() => { if (!cancelled) setFollowing(false) })
    return () => { cancelled = true }
  }, [targetUserId])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  async function toggleFollow() {
    setBusy(true)
    try {
      if (following) {
        await fetch(`/api/follows/${encodeURIComponent(targetUserId)}`, { method: 'DELETE' })
        setFollowing(false)
      } else {
        const res = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: targetUserId }),
        })
        if (res.ok) setFollowing(true)
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleBlock() {
    if (!window.confirm(t('blockConfirm'))) return
    setBusy(true)
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId }),
      })
      if (res.ok) {
        setMenuOpen(false)
        router.push('/discover')
      }
    } finally {
      setBusy(false)
    }
  }

  async function submitReport() {
    if (!reportReason.trim()) return
    setBusy(true)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'USER',
          targetId: targetUserId,
          targetUserId,
          reason: reportReason.trim(),
        }),
      })
      if (res.ok) {
        setReportSent(true)
        setReportOpen(false)
        setReportReason('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative flex items-center gap-2 ${className ?? ''}`}>
      <button
        onClick={toggleFollow}
        disabled={busy || following === null}
        className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
        style={{
          background: following ? 'rgba(255,255,255,0.04)' : 'rgba(124,58,237,0.18)',
          border: following ? '1px solid var(--border-soft)' : '1px solid var(--border-accent)',
          color: following ? 'var(--ink)' : 'var(--star)',
          opacity: busy || following === null ? 0.6 : 1,
        }}
      >
        {following ? t('unfollow') : t('follow')}
      </button>

      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={t('moreActions')}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-soft)', color: 'var(--ghost)' }}
      >
        ⋯
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-20"
          style={{ background: 'rgba(12,8,36,0.97)', border: '1px solid var(--border-soft)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}
        >
          <button
            onClick={() => { setReportOpen(true); setMenuOpen(false) }}
            className="w-full text-left px-4 py-3 text-sm transition-colors"
            style={{ color: 'var(--ink)' }}
          >
            {t('report')}
          </button>
          <button
            onClick={handleBlock}
            disabled={busy}
            className="w-full text-left px-4 py-3 text-sm transition-colors"
            style={{ color: '#f87171' }}
          >
            {t('block')}
          </button>
        </div>
      )}

      {reportOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl p-4 z-20 flex flex-col gap-3" style={{ background: 'rgba(12,8,36,0.97)', border: '1px solid var(--border-soft)', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }}>
          <p className="text-xs" style={{ color: 'var(--ghost)' }}>{t('reportPrompt')}</p>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder={t('reportPlaceholder')}
            className="w-full rounded-lg px-3 py-2 text-sm bg-transparent outline-none resize-none"
            style={{ border: '1px solid var(--border-soft)', color: 'var(--foreground)' }}
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setReportOpen(false)} className="px-3 py-1.5 text-xs" style={{ color: 'var(--ghost)' }}>
              {t('cancel')}
            </button>
            <button
              onClick={submitReport}
              disabled={busy || !reportReason.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
            >
              {t('submitReport')}
            </button>
          </div>
        </div>
      )}

      {reportSent && (
        <span className="absolute right-0 -bottom-6 text-[10px] whitespace-nowrap" style={{ color: 'var(--ghost)' }}>
          {t('reportSent')}
        </span>
      )}
    </div>
  )
}
