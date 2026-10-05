'use client'
import { useTranslations } from 'next-intl'
import { BASIC_OPTIONS } from '@/lib/registration-basics'
export type AudienceValues = { languages: string[]; interests: string[]; connectionGoals: string[]; gatheringPreferences: string[] }
export const EMPTY_AUDIENCE: AudienceValues = { languages: [], interests: [], connectionGoals: [], gatheringPreferences: [] }
export default function AudienceFields({ value, onChange }: { value: AudienceValues; onChange: (next: AudienceValues) => void }) {
  const t = useTranslations('discoveryPreferences'), labels = useTranslations('registrationBasics')
  return <details className="rounded-xl border border-white/15 p-4"><summary className="cursor-pointer py-2 font-medium">{t('audienceTitle')}</summary><p className="my-3 text-xs opacity-60">{t('audienceHint')}</p>{(Object.keys(EMPTY_AUDIENCE) as (keyof AudienceValues)[]).map(field => <fieldset key={field} className="mt-5"><legend className="mb-2 text-sm">{t(field)}</legend><div className="flex flex-wrap gap-2">{BASIC_OPTIONS[field].filter(option => option !== 'noPreference' && option !== 'other').map(option => <button type="button" key={option} aria-pressed={value[field].includes(option)} onClick={() => onChange({ ...value, [field]: value[field].includes(option) ? value[field].filter(v => v !== option) : [...value[field], option] })} className={`min-h-11 rounded-xl border px-3 text-xs ${value[field].includes(option) ? 'border-violet-300 bg-violet-400/20' : 'border-white/15'}`}>{labels(`options.${option}`)}</button>)}</div></fieldset>)}</details>
}
