'use client'
import { useTranslations } from 'next-intl'
import { availablePublicTags } from '@/lib/public-planet-tags'
import type { BasicPreferences } from '@/lib/registration-basics'
export default function PublicTagPicker({ value, onChange }: { value: BasicPreferences; onChange: (tokens: string[]) => void }) {
  const t = useTranslations('discoveryPreferences'), labels = useTranslations('registrationBasics')
  return <fieldset className="mt-5 rounded-2xl border border-white/15 p-4"><legend className="px-2 font-medium">{t('publicTags')}</legend><p className="mb-3 text-xs leading-relaxed opacity-60">{t('publicTagsHint')}</p><div className="grid gap-3">{availablePublicTags(value).map(({ token, tag }) => <label key={token} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={value.publicTags.includes(token)} disabled={!value.publicTags.includes(token) && value.publicTags.length >= 12} onChange={e => onChange(e.target.checked ? [...value.publicTags, token] : value.publicTags.filter(v => v !== token))} /><span>{tag.key === 'region' ? tag.value : labels(`options.${tag.value}`)}</span></label>)}</div><button type="button" onClick={() => onChange([])} className="mt-3 min-h-11 text-xs underline">{t('hideAll')}</button></fieldset>
}
