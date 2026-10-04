'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import GalaxyForm, { type GalaxySettings } from '@/components/galaxy/GalaxyForm'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { galaxyRequest } from '@/lib/galaxy-client'
import type { PlanetConfig } from '@/types/planet'
interface Roster {
  creatorId: string | null
  isAdmin: boolean
  isOwner: boolean
  canClaim: boolean
  members: {
    userId: string
    name: string
    role: string
    planetConfig: PlanetConfig | null
  }[]
  requests: { userId: string; name: string }[]
}
export default function GalaxyManagement({ slug }: { slug: string }) {
  const t = useTranslations('galaxyWorkflow')
  const [galaxy, setGalaxy] = useState<GalaxySettings | null>(null),
    [roster, setRoster] = useState<Roster | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(true)
  useEffect(() => {
    let alive = true
    Promise.resolve().then(() => {
      if (alive) setLoading(true)
    })
    galaxyRequest<GalaxySettings[]>('/api/communities')
      .then(async (rows) => {
        const found = rows.find((g) => g.slug === slug)
        if (!found) throw new Error('notFound')
        const members = await galaxyRequest<Roster>(
          `/api/communities/${found.id}/members`,
        )
        if (alive) {
          setGalaxy(found)
          setRoster(members)
        }
      })
      .catch((err) => {
        if (alive) setError(t.has(err.message) ? t(err.message) : t('failed'))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [slug, revision, t])
  async function action(action: string, userId?: string) {
    if (!galaxy || busy) return
    if (
      ['remove', 'transfer', 'demote'].includes(action) &&
      !window.confirm(t(`${action}Confirm`))
    )
      return
    setBusy(true)
    setError('')
    try {
      await galaxyRequest(`/api/communities/${galaxy.id}/members`, 'PATCH', {
        action,
        userId,
      })
      setRevision((v) => v + 1)
    } catch (err) {
      const key = err instanceof Error ? err.message : 'failed'
      setError(t.has(key) ? t(key) : t('failed'))
    } finally {
      setBusy(false)
    }
  }
  const button = (label: string, actionName: string, userId?: string) => (
    <button
      type="button"
      disabled={busy}
      onClick={() => action(actionName, userId)}
      className="rounded-lg border border-white/15 px-3 py-2 text-xs hover:bg-white/5 disabled:opacity-40"
    >
      {t(label)}
    </button>
  )
  return (
    <div className="mx-auto max-w-3xl px-5 py-8 pb-24">
      <Link href={`/galaxy/${slug}`} className="text-sm text-white/60">
        ← {t('backGalaxy')}
      </Link>
      <h1 className="my-6 text-2xl font-semibold">
        {t('manageGalaxy')}
        {galaxy && ` · ${galaxy.name}`}
      </h1>
      {error && (
        <p role="alert" className="mb-4 text-red-300">
          {error}
          <button
            className="ml-3 underline"
            onClick={() => setRevision((v) => v + 1)}
          >
            {t('retry')}
          </button>
        </p>
      )}
      {loading ? (
        <p>{t('loading')}</p>
      ) : roster?.canClaim ? (
        <section className="grid gap-4">
          <p>{t('unowned')}</p>
          {button('claim', 'claim')}
        </section>
      ) : !roster?.isAdmin ? (
        <p>{t('adminOnly')}</p>
      ) : (
        galaxy && (
          <>
            {!roster.creatorId && (
              <p className="mb-5 text-amber-200">{t('unowned')}</p>
            )}
            <section className="rounded-2xl border border-white/10 p-5">
              <h2 className="mb-5 text-lg font-semibold">{t('settings')}</h2>
              <GalaxyForm
                key={revision}
                galaxy={galaxy}
                onSaved={() => setRevision((v) => v + 1)}
              />
            </section>
            <section className="mt-7">
              <h2 className="mb-4 text-lg font-semibold">
                {t('joinRequests')} ({roster.requests.length})
              </h2>
              {!roster.requests.length && (
                <p className="text-sm text-white/50">{t('noRequests')}</p>
              )}
              {roster.requests.map((r) => (
                <div
                  key={r.userId}
                  className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"
                >
                  <span>{r.name}</span>
                  <div className="flex gap-2">
                    {button('approve', 'approveJoin', r.userId)}
                    {button('reject', 'rejectJoin', r.userId)}
                  </div>
                </div>
              ))}
            </section>
            <section className="mt-7">
              <h2 className="mb-4 text-lg font-semibold">
                {t('members')} ({roster.members.length})
              </h2>
              {roster.members.map((m) => (
                <div
                  key={m.userId}
                  className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"
                >
                  <div className="flex items-center gap-3">
                    {m.planetConfig && (
                      <PlanetAvatar planetConfig={m.planetConfig} size={34} />
                    )}
                    <div>
                      {m.name}
                      <p className="text-xs text-white/50">
                        {t(
                          m.userId === roster.creatorId
                            ? 'owner'
                            : m.role === 'ADMIN'
                              ? 'admin'
                              : 'member',
                        )}
                      </p>
                    </div>
                  </div>
                  {m.userId !== roster.creatorId && (
                    <div className="flex flex-wrap gap-2">
                      {roster.isOwner && (
                        <>
                          {button(
                            m.role === 'ADMIN' ? 'demote' : 'promote',
                            m.role === 'ADMIN' ? 'demote' : 'promote',
                            m.userId,
                          )}
                          {button('transfer', 'transfer', m.userId)}
                        </>
                      )}
                      {(roster.isOwner || m.role !== 'ADMIN') &&
                        button('remove', 'remove', m.userId)}
                    </div>
                  )}
                </div>
              ))}
            </section>
          </>
        )
      )}
    </div>
  )
}
