'use client'
import { useTranslations } from 'next-intl'
import { Check, Globe, Heart, Languages, MapPin, Sparkles, Users } from 'lucide-react'
import { availablePublicTags, publicPlanetTags } from '@/lib/public-planet-tags'
import PublicPlanetTags from '@/components/planet/PublicPlanetTags'
import type { BasicPreferences } from '@/lib/registration-basics'
const groups = { region: MapPin, gender: Users, languages: Languages, interests: Sparkles, connectionGoals: Heart, gatheringPreferences: Globe }
export default function PublicTagPicker({ value, onChange }: { value: BasicPreferences; onChange: (tokens: string[]) => void }) {
  const t = useTranslations('discoveryPreferences'), labels = useTranslations('registrationBasics'), copy = useTranslations('onboardingRefinements')
  const tags = availablePublicTags(value)
  return <fieldset className="mt-5 rounded-2xl border border-violet-300/25 bg-gradient-to-br from-violet-400/10 to-cyan-400/5 p-5"><legend className="px-2 font-medium">{t('publicTags')}</legend><p className="mb-4 text-sm leading-relaxed opacity-70">{t('publicTagsHint')}</p>
    <div className="space-y-5">{Object.entries(groups).map(([key, Icon]) => {
      const options = tags.filter(item => item.tag.key === key)
      if (!options.length) return null
      return <div key={key}><p className="mb-2 flex items-center gap-2 text-xs text-violet-200"><Icon size={14} aria-hidden="true" />{labels(`titles.${key}`)}</p><div className="flex flex-wrap gap-2">{options.map(({token,tag}) => {
        const checked = value.publicTags.includes(token)
        return <label key={token} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${checked ? 'border-violet-300 bg-violet-400/25 shadow-[0_0_12px_#a78bfa25]' : 'border-white/15 bg-white/5'}`}><input className="h-4 w-4 accent-violet-400" type="checkbox" checked={checked} disabled={!checked && value.publicTags.length >= 12} onChange={e => onChange(e.target.checked ? [...value.publicTags,token] : value.publicTags.filter(v => v !== token))} /><span>{tag.key === 'region' ? tag.value : labels(`options.${tag.value}`)}</span>{checked && <Check size={12} aria-hidden="true" />}</label>
      })}</div></div>
    })}</div>
    <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-4"><p className="text-xs opacity-60">{copy('tagPreview')} · {value.publicTags.length}/12</p>{publicPlanetTags(value).length ? <PublicPlanetTags tags={publicPlanetTags(value)} /> : <p className="mt-3 text-xs opacity-50">{copy('noPublicTags')}</p>}</div>
    <button type="button" onClick={() => onChange([])} className="mt-3 min-h-11 text-xs underline">{t('hideAll')}</button>
  </fieldset>
}
