'use client'
import { useTranslations } from 'next-intl'
import { Mars, NonBinary, Venus } from 'lucide-react'
import { publicPlanetTagLabel, type PublicPlanetTag } from '@/lib/public-planet-tags'
export default function PublicPlanetTags({ tags = [] }: { tags?: PublicPlanetTag[] }) {
  const t = useTranslations('registrationBasics'), td = useTranslations('discoveryPreferences')
  if (!tags.length) return null
  const age = tags.find(tag => tag.key === 'age' && typeof tag.value === 'number')
  const gender = tags.find(tag => tag.key === 'gender' && ['woman', 'man', 'nonbinary', 'other'].includes(String(tag.value)))
  const GenderIcon = gender?.value === 'woman' ? Venus : gender?.value === 'man' ? Mars : NonBinary
  const genderLabel = gender ? publicPlanetTagLabel(t, gender) : ''
  const demographicLabel = age && gender ? `${genderLabel}, ${publicPlanetTagLabel(t, age)}` : genderLabel
  return <div className="my-3 flex flex-wrap gap-2" aria-label={td('publicTags')}>
    {gender && <span role="img" aria-label={demographicLabel} title={demographicLabel} className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/25 bg-violet-400/10 px-2.5 py-1 text-xs text-violet-100">
      <GenderIcon size={14} strokeWidth={1.8} aria-hidden="true" />
      {age && <span aria-hidden="true" className="tabular-nums">{age.value}</span>}
    </span>}
    {tags.filter(tag => tag !== gender && !(gender && tag === age)).map(tag => <span key={`${tag.key}:${tag.value}`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">{publicPlanetTagLabel(t, tag)}</span>)}
  </div>
}
