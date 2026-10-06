'use client'
import { useTranslations } from 'next-intl'
import { BASIC_OPTIONS } from '@/lib/registration-basics'
import type { DiscoveryFilters as Filters } from '@/lib/discovery-filters'
import RegionSearch from '@/components/registration/RegionSearch'
import { SlidersHorizontal } from 'lucide-react'
const options = { language: BASIC_OPTIONS.languages, interest: BASIC_OPTIONS.interests, goal: BASIC_OPTIONS.connectionGoals, gathering: BASIC_OPTIONS.gatheringPreferences }
export default function DiscoveryFilters({ value, onChange, recommended = true, activityPool = true }: { value: Filters; onChange: (next: Filters) => void; recommended?: boolean; activityPool?: boolean }) {
  const t = useTranslations('discoveryPreferences'), labels = useTranslations('registrationBasics')
  const refinements = useTranslations('onboardingRefinements')
  const count = ['region','language','interest','goal','gathering'].filter(key => value[key as keyof Filters]).length + (value.sort === 'recommended' ? 1 : 0)
  return <details className="relative shrink-0" onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus() } }}><summary aria-label={refinements('filters')} title={refinements('filters')} className="relative flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-xl border border-white/15 bg-white/5 text-violet-200 [&::-webkit-details-marker]:hidden"><SlidersHorizontal size={18} aria-hidden="true" />{count > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-violet-500 px-1.5 text-[10px] text-white" aria-label={refinements('activeFilters', { count })}>{count}</span>}</summary><div className="absolute right-0 top-full z-40 mt-2 max-h-[70dvh] w-[min(620px,calc(100vw-48px))] space-y-3 overflow-y-auto rounded-2xl border border-violet-300/25 bg-slate-950 p-4 shadow-2xl"><p className="mb-4 font-medium">{refinements('filters')}</p><div className="grid gap-3 sm:grid-cols-2">
    <RegionSearch label={t('region')} value={value.region || ''} onChange={region => onChange({ ...value, region })} />
    {Object.entries(options).map(([field, choices]) => <label key={field} className="grid gap-1 text-xs">{t(field)}<select aria-label={t(field)} value={value[field as keyof Filters] || ''} onChange={e => onChange({ ...value, [field]: e.target.value || undefined })} className="min-h-11 rounded-xl border border-white/15 bg-slate-950 px-3"><option value="">{t('all')}</option>{choices.filter(v => v !== 'noPreference' && v !== 'other').map(option => <option key={option} value={option}>{labels(`options.${option}`)}</option>)}</select></label>)}
    {recommended && <label className="grid gap-1 text-xs">{t('sort')}<select aria-label={t('sort')} value={value.sort || 'date'} onChange={e => onChange({ ...value, sort: e.target.value })} className="min-h-11 rounded-xl border border-white/15 bg-slate-950 px-3"><option value="date">{t('date')}</option><option value="recommended">{t('recommended')}</option></select></label>}
  </div><button type="button" onClick={() => onChange({ sort: 'date' })} className="min-h-11 text-xs underline">{t('reset')}</button>{value.sort === 'recommended' && <p className="text-xs opacity-60">{t(activityPool ? 'batchHint' : 'galaxyHint')}</p>}</div></details>
}
