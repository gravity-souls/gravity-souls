'use client'
import { useTranslations } from 'next-intl'
import { Check, Globe, Heart, Languages, MapPin, Pencil, Plus, Sparkles, Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { availablePublicTags, publicPlanetTags } from '@/lib/public-planet-tags'
import PublicPlanetTags from '@/components/planet/PublicPlanetTags'
import type { BasicPreferences } from '@/lib/registration-basics'
const groups = { region: MapPin, gender: Users, languages: Languages, interests: Sparkles, connectionGoals: Heart, peoplePreferences: Users, gatheringPreferences: Globe }
export type EditableBasicField = keyof typeof groups
export default function PublicTagPicker({ value, onChange, onEdit, activeField, editor }: { value: BasicPreferences; onChange: (tokens: string[]) => void; onEdit?: (field: EditableBasicField) => void; activeField?: EditableBasicField | null; editor?: ReactNode }) {
  const t = useTranslations('discoveryPreferences'), labels = useTranslations('registrationBasics'), copy = useTranslations('onboardingRefinements')
  const tags = availablePublicTags(value)
  return <fieldset className="mt-5 rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-400/10 to-cyan-400/5 p-5"><legend className="px-2 font-medium">{t('publicTags')}</legend><p className="mb-4 text-sm leading-relaxed opacity-70">{t('publicTagsHint')}</p>
    <div className="space-y-5">{Object.entries(groups).map(([key, Icon]) => {
      const options = tags.filter(item => item.tag.key === key)
      if (!options.length && !onEdit) return null
      return <section key={key} className={onEdit ? 'rounded-2xl border border-white/10 bg-slate-950/30 p-4' : ''} aria-label={labels(`titles.${key}`)}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-sm text-violet-200"><Icon size={16} aria-hidden="true" />{labels(`titles.${key}`)}</h2>{onEdit && <button type="button" aria-expanded={activeField === key} aria-label={`${labels('editTitle')}: ${labels(`titles.${key}`)}`} onClick={() => onEdit(key as EditableBasicField)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-400/10 px-3 text-xs text-violet-200"><Pencil size={14} aria-hidden="true" />{copy('editField')}</button>}</div>{activeField === key && editor}<div className="flex flex-wrap gap-2">{options.map(({token,tag}) => {
        const checked = value.publicTags.includes(token)
        return <label key={token} className={`relative flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition focus-within:outline-2 focus-within:outline-violet-300 ${checked ? 'border-violet-300 bg-violet-400/25 shadow-[0_0_12px_#a78bfa25]' : 'border-white/15 bg-white/5'} ${!checked && value.publicTags.length >= 12 ? 'opacity-40' : ''}`}><input className="absolute inset-0 h-full w-full cursor-pointer opacity-0" type="checkbox" checked={checked} disabled={!checked && value.publicTags.length >= 12} onChange={e => onChange(e.target.checked ? [...value.publicTags,token] : value.publicTags.filter(v => v !== token))} />{checked ? <Check size={14} aria-hidden="true" /> : <Plus size={14} className="opacity-40" aria-hidden="true" />}<span>{tag.key === 'region' ? tag.value : labels(`options.${tag.value}`)}</span></label>
      })}{!options.length && onEdit && <p className="text-xs text-slate-400">{copy('noFieldValues')}</p>}</div></section>
    })}</div>
    <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-4"><p className="text-xs opacity-60">{copy('tagPreview')} · {value.publicTags.length}/12</p>{publicPlanetTags(value).length ? <PublicPlanetTags tags={publicPlanetTags(value)} /> : <p className="mt-3 text-xs opacity-50">{copy('noPublicTags')}</p>}</div>
    <button type="button" onClick={() => onChange([])} className="mt-3 min-h-11 text-xs underline">{t('hideAll')}</button>
  </fieldset>
}
