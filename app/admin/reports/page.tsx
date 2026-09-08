'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/layout/AppShell'
import SectionHeader from '@/components/ui/SectionHeader'
import EmptyState from '@/components/ui/EmptyState'
import OrbitCard from '@/components/ui/OrbitCard'
import GlowButton from '@/components/ui/GlowButton'
import Tag from '@/components/ui/Tag'

// --- Types ---------------------------------------------------------------

type ReportStatus = 'OPEN' | 'REVIEWED' | 'ACTIONED' | 'DISMISSED'

interface UserSummary {
  id: string
  name: string | null
  email: string
}

interface ReportRow {
  id: string
  targetType: string
  targetId: string
  targetUserId: string | null
  reason: string
  details: string | null
  status: ReportStatus
  createdAt: string
  reviewedAt: string | null
  reporter: UserSummary
  targetUser: UserSummary | null
}

type ViewState = 'loading' | 'unauthenticated' | 'unauthorized' | 'error' | 'ready'

const STATUSES: ReportStatus[] = ['OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED']

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

// --- Page ------------------------------------------------------------------

export default function AdminReportsPage() {
  const t = useTranslations('adminReports')
  const [view, setView] = useState<ViewState>('loading')
  const [reports, setReports] = useState<ReportRow[]>([])
  const [filter, setFilter] = useState<ReportStatus | 'ALL'>('ALL')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback((status: ReportStatus | 'ALL') => {
    setView('loading')
    const qs = status === 'ALL' ? '' : `?status=${status}`
    fetch(`/api/admin/reports${qs}`)
      .then(async (res) => {
        if (res.status === 401) { setView('unauthenticated'); return }
        if (res.status === 403) { setView('unauthorized'); return }
        if (!res.ok) { setView('error'); return }
        const data = (await res.json()) as { reports: ReportRow[] }
        setReports(data.reports)
        setView('ready')
      })
      .catch(() => setView('error'))
  }, [])

  useEffect(() => {
    load(filter)
  }, [filter, load])

  async function changeStatus(id: string, status: ReportStatus) {
    setBusyId(id)
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) return
      const data = (await res.json()) as { report: { id: string; status: ReportStatus; reviewedAt: string | null } }
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: data.report.status, reviewedAt: data.report.reviewedAt } : r)),
      )
    } finally {
      setBusyId(null)
    }
  }

  const statusLabel: Record<ReportStatus, string> = {
    OPEN: t('statusOpen'),
    REVIEWED: t('statusReviewed'),
    ACTIONED: t('statusActioned'),
    DISMISSED: t('statusDismissed'),
  }

  return (
    <AppShell>
      <div className="px-6 pt-8 pb-16 max-w-4xl mx-auto">
        <SectionHeader eyebrow={t('eyebrow')} level={1} title={t('title')} subtitle={t('subtitle')} />

        {/* Status filter */}
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t('title')}>
          <FilterTab active={filter === 'ALL'} onClick={() => setFilter('ALL')} label={t('filterAll')} />
          {STATUSES.map((s) => (
            <FilterTab key={s} active={filter === s} onClick={() => setFilter(s)} label={statusLabel[s]} />
          ))}
        </div>

        <div className="mt-8">
          {view === 'loading' && (
            <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('loading')}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl animate-pulse"
                  style={{ height: 96, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(167,139,250,0.08)' }}
                />
              ))}
            </div>
          )}

          {view === 'unauthenticated' && (
            <EmptyState
              symbol="◌"
              title={t('signInTitle')}
              subtitle={t('signInSubtitle')}
              action={<GlowButton href="/sign-in?next=/admin/reports" variant="primary">{t('signInAction')}</GlowButton>}
            />
          )}

          {view === 'unauthorized' && (
            <EmptyState symbol="◌" title={t('notAuthorizedTitle')} subtitle={t('notAuthorizedSubtitle')} />
          )}

          {view === 'error' && (
            <EmptyState symbol="◌" title={t('errorTitle')} subtitle={t('errorSubtitle')} />
          )}

          {view === 'ready' && reports.length === 0 && (
            <EmptyState symbol="◌" title={t('emptyTitle')} subtitle={t('emptySubtitle')} />
          )}

          {view === 'ready' && reports.length > 0 && (
            <ul className="flex flex-col gap-4" aria-label={t('title')}>
              {reports.map((r) => (
                <li key={r.id}>
                  <OrbitCard className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag label={r.targetType} variant="accent" />
                        <Tag label={statusLabel[r.status]} variant={r.status === 'OPEN' ? 'default' : 'dim'} />
                      </div>
                      <span className="text-[10px] tabular-nums" style={{ color: 'var(--ghost)', opacity: 0.5 }}>
                        {t('filed')} {formatDate(r.createdAt)}
                      </span>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                      <div>
                        <dt style={{ color: 'var(--ghost)', opacity: 0.55 }}>{t('reporter')}</dt>
                        <dd style={{ color: 'var(--foreground)' }} className="mt-0.5 break-all">
                          {r.reporter.name ?? t('unknownUser')} · {r.reporter.email}
                        </dd>
                      </div>
                      <div>
                        <dt style={{ color: 'var(--ghost)', opacity: 0.55 }}>{t('target')}</dt>
                        <dd style={{ color: 'var(--foreground)' }} className="mt-0.5 break-all">
                          {r.targetType} · {r.targetId}
                        </dd>
                      </div>
                      {r.targetUser && (
                        <div>
                          <dt style={{ color: 'var(--ghost)', opacity: 0.55 }}>{t('targetUser')}</dt>
                          <dd style={{ color: 'var(--foreground)' }} className="mt-0.5 break-all">
                            {r.targetUser.name ?? t('unknownUser')} · {r.targetUser.email}
                          </dd>
                        </div>
                      )}
                      <div>
                        <dt style={{ color: 'var(--ghost)', opacity: 0.55 }}>{t('reason')}</dt>
                        <dd style={{ color: 'var(--foreground)' }} className="mt-0.5 break-words">{r.reason}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt style={{ color: 'var(--ghost)', opacity: 0.55 }}>{t('details')}</dt>
                        <dd style={{ color: 'var(--ink)', opacity: 0.8 }} className="mt-0.5 break-words">
                          {r.details || t('noDetails')}
                        </dd>
                      </div>
                      <div>
                        <dt style={{ color: 'var(--ghost)', opacity: 0.55 }}>{t('reviewed')}</dt>
                        <dd style={{ color: 'var(--foreground)' }} className="mt-0.5 tabular-nums">{formatDate(r.reviewedAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--ghost)', opacity: 0.5 }}>
                        {t('markAs')}
                      </span>
                      {STATUSES.filter((s) => s !== r.status).map((s) => (
                        <GlowButton
                          key={s}
                          variant="ghost"
                          className="text-xs px-3 py-1.5"
                          disabled={busyId === r.id}
                          onClick={() => changeStatus(r.id, s)}
                        >
                          {statusLabel[s]}
                        </GlowButton>
                      ))}
                    </div>
                  </OrbitCard>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  )
}

// --- Filter tab --------------------------------------------------------------

function FilterTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="rounded-full px-4 py-1.5 text-xs font-medium tracking-wide transition-colors duration-200"
      style={{
        background: active ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.03)',
        border: active ? '1px solid rgba(167,139,250,0.4)' : '1px solid rgba(167,139,250,0.1)',
        color: active ? 'var(--star)' : 'var(--ghost)',
      }}
    >
      {label}
    </button>
  )
}
