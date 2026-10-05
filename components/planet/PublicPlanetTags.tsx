'use client'
import { useTranslations } from 'next-intl'
import type { PublicPlanetTag } from '@/lib/public-planet-tags'
export default function PublicPlanetTags({ tags = [] }: { tags?: PublicPlanetTag[] }) {
  const t = useTranslations('registrationBasics'), td = useTranslations('discoveryPreferences')
  if (!tags.length) return null
  return <div className="my-3 flex flex-wrap gap-2" aria-label={td('publicTags')}>
    {tags.map(tag => <span key={`${tag.key}:${tag.value}`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">{tag.key === 'region' ? tag.value : t.has(`options.${tag.value}`) ? t(`options.${tag.value}`) : tag.value}</span>)}
  </div>
}
