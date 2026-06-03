'use client'

import { useTranslations } from 'next-intl'
import type { StreamPostCategory } from '@/types/stream'

export type StreamCategoryTab = StreamPostCategory | 'ALL'

const TABS: { value: StreamCategoryTab; key: 'all' | 'cosmic' | 'nature' | 'night' | 'thoughts' | 'travel' | 'music' | 'art' }[] = [
  { value: 'ALL', key: 'all' },
  { value: 'COSMIC', key: 'cosmic' },
  { value: 'NATURE', key: 'nature' },
  { value: 'NIGHT', key: 'night' },
  { value: 'THOUGHTS', key: 'thoughts' },
  { value: 'TRAVEL', key: 'travel' },
  { value: 'MUSIC', key: 'music' },
  { value: 'ART', key: 'art' },
]

export default function CategoryTabs({ value, onChange }: { value: StreamCategoryTab; onChange: (value: StreamCategoryTab) => void }) {
  const t = useTranslations('stream.categories')

  return (
    <div className="flex gap-5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
      {TABS.map((tab) => (
        <button key={tab.value} type="button" onClick={() => onChange(tab.value)} className="relative shrink-0 pb-2 text-sm font-semibold" style={{ color: value === tab.value ? 'var(--foreground)' : 'var(--ghost)' }}>
          {t(tab.key)}
          {value === tab.value && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full" style={{ background: 'var(--star)', boxShadow: '0 0 14px rgba(167,139,250,0.6)' }} />}
        </button>
      ))}
    </div>
  )
}