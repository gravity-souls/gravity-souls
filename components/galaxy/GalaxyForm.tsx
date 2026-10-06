'use client'
import AudienceFields, { type AudienceValues } from '@/components/discovery/AudienceFields'
import RegionSearch from '@/components/registration/RegionSearch'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { galaxyRequest } from '@/lib/galaxy-client'
export interface GalaxySettings {
  region?: string
  languages?: string[]
  interestTags?: string[]
  connectionGoals?: string[]
  gatheringPreferences?: string[]
  id?: string
  slug?: string
  name: string
  symbol: string
  tagline: string | null
  description: string | null
  keywords: string[]
  mood: string
  accentColor: string
  joinPolicy: 'OPEN' | 'APPROVAL'
}
const inputClass =
  'w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white'
export default function GalaxyForm({
  galaxy,
  onSaved,
}: {
  galaxy?: GalaxySettings
  onSaved?: () => void
}) {
  const td = useTranslations('discoveryPreferences')
  const [region, setRegion] = useState(galaxy?.region ?? '')
  const [audience, setAudience] = useState<AudienceValues>({ languages: galaxy?.languages ?? [], interests: galaxy?.interestTags ?? [], connectionGoals: galaxy?.connectionGoals ?? [], gatheringPreferences: galaxy?.gatheringPreferences ?? [] })
  const t = useTranslations('galaxyWorkflow'),
    router = useRouter()
  const [draft, setDraft] = useState(
    galaxy ?? {
      name: '',
      symbol: '🌌',
      tagline: '',
      description: '',
      keywords: [],
      mood: 'vibrant',
      accentColor: '#6366f1',
      joinPolicy: 'OPEN' as const,
    },
  )
  const [keywords, setKeywords] = useState(draft.keywords.join(', ')),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false)
  const field = (
    key: 'name' | 'symbol' | 'tagline' | 'description',
    max: number,
    multiline = false,
  ) => (
    <label className="grid gap-2">
      {t(key)}
      {multiline ? (
        <textarea
          required={key === 'name'}
          className={inputClass}
          rows={4}
          maxLength={max}
          value={draft[key] ?? ''}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      ) : (
        <input
          required={key === 'name' || key === 'symbol'}
          className={inputClass}
          maxLength={max}
          minLength={key === 'name' ? 2 : 1}
          value={draft[key] ?? ''}
          onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
        />
      )}
    </label>
  )
  return (
    <form
      className="grid gap-5 text-sm"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError('')
        setSaved(false)
        try {
          const data = {
            region, languages: audience.languages, interestTags: audience.interests, connectionGoals: audience.connectionGoals, gatheringPreferences: audience.gatheringPreferences,
            name: draft.name,
            symbol: draft.symbol,
            tagline: draft.tagline ?? '',
            description: draft.description ?? '',
            keywords: [
              ...new Set(
                keywords
                  .split(/[,，]/)
                  .map((k) => k.trim())
                  .filter(Boolean),
              ),
            ],
            mood: draft.mood,
            accentColor: draft.accentColor,
            joinPolicy: draft.joinPolicy,
          }
          const result = await galaxyRequest<{ galaxy: GalaxySettings }>(
            galaxy ? `/api/communities/${galaxy.id}` : '/api/communities',
            galaxy ? 'PATCH' : 'POST',
            data,
          )
          if (galaxy) {
            setSaved(true)
            onSaved?.()
          } else router.push(`/galaxy/${result.galaxy.slug}/manage`)
        } catch (err) {
          const key = err instanceof Error ? err.message : 'failed'
          setError(t.has(key) ? t(key) : t('failed'))
        } finally {
          setBusy(false)
        }
      }}
    >
      {field('name', 80)}
      {field('symbol', 12)}
      {field('tagline', 160)}
      {field('description', 2000, true)}
      <RegionSearch label={td('region')} value={region} onChange={setRegion} />
      <AudienceFields value={audience} onChange={setAudience} />
      <label className="grid gap-2">
        {t('keywords')}
        <input
          className={inputClass}
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <span className="text-xs text-white/50">{t('keywordsHint')}</span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          {t('mood')}
          <select
            className={inputClass}
            value={draft.mood}
            onChange={(e) => setDraft({ ...draft, mood: e.target.value })}
          >
            {[
              'contemplative',
              'creative',
              'intimate',
              'technical',
              'vibrant',
            ].map((m) => (
              <option className="bg-slate-950" key={m} value={m}>
                {t(`moods.${m}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2">
          {t('color')}
          <input
            type="color"
            value={draft.accentColor}
            onChange={(e) =>
              setDraft({ ...draft, accentColor: e.target.value })
            }
          />
        </label>
      </div>
      <label className="grid gap-2">
        {t('joinPolicy')}
        <select
          className={inputClass}
          value={draft.joinPolicy}
          onChange={(e) =>
            setDraft({
              ...draft,
              joinPolicy: e.target.value as 'OPEN' | 'APPROVAL',
            })
          }
        >
          <option className="bg-slate-950" value="OPEN">
            {t('openJoin')}
          </option>
          <option className="bg-slate-950" value="APPROVAL">
            {t('approvalJoin')}
          </option>
        </select>
        <span className="text-xs text-white/50">{t('joinPolicyHint')}</span>
      </label>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-green-300">
          {t('saved')}
        </p>
      )}
      <button
        disabled={busy}
        className="rounded-xl bg-violet-600 px-4 py-3 font-medium disabled:opacity-50"
      >
        {busy ? t('saving') : galaxy ? t('save') : t('createGalaxy')}
      </button>
    </form>
  )
}
