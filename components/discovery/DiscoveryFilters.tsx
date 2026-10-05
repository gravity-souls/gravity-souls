'use client'
import { useTranslations } from 'next-intl'
import { BASIC_OPTIONS } from '@/lib/registration-basics'
import type { DiscoveryFilters as Filters } from '@/lib/discovery-filters'
const options = { language: BASIC_OPTIONS.languages, interest: BASIC_OPTIONS.interests, goal: BASIC_OPTIONS.connectionGoals, gathering: BASIC_OPTIONS.gatheringPreferences }
export default function DiscoveryFilters({ value, onChange, recommended = true }: { value: Filters; onChange: (next: Filters) => void; recommended?: boolean }) {
  const t = useTranslations('discoveryPreferences'), labels = useTranslations('registrationBasics')
  return <div className="my-4 space-y-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <label className="grid gap-1 text-xs">{t('region')}<input value={value.region || ''} maxLength={120} onChange={e => onChange({ ...value, region: e.target.value })} className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3" /></label>
    {Object.entries(options).map(([field, choices]) => <label key={field} className="grid gap-1 text-xs">{t(field)}<select value={value[field as keyof Filters] || ''} onChange={e => onChange({ ...value, [field]: e.target.value || undefined })} className="min-h-11 rounded-xl border border-white/15 bg-slate-950 px-3"><option value="">{t('all')}</option>{choices.filter(v => v !== 'noPreference' && v !== 'other').map(option => <option key={option} value={option}>{labels(`options.${option}`)}</option>)}</select></label>)}
    {recommended && <label className="grid gap-1 text-xs">{t('sort')}<select value={value.sort || 'date'} onChange={e => onChange({ ...value, sort: e.target.value })} className="min-h-11 rounded-xl border border-white/15 bg-slate-950 px-3"><option value="date">{t('date')}</option><option value="recommended">{t('recommended')}</option></select></label>}
  </div><button type="button" onClick={() => onChange({ sort: 'date' })} className="min-h-11 text-xs underline">{t('reset')}</button>{value.sort === 'recommended' && <p className="text-xs opacity-60">{t('batchHint')}</p>}</div>
}
