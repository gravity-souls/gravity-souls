'use client'

import type { StreamPostCategory } from '@/types/stream'
import { useLanguage } from '@/contexts/language-context'

export type StreamCategoryTab = StreamPostCategory | 'ALL'

const TABS: { value: StreamCategoryTab; labels: Record<'en' | 'zh-CN', string> }[] = [
  { value: 'ALL', labels: { en: 'For You', 'zh-CN': '推荐' } },
  { value: 'COSMIC', labels: { en: 'Cosmic', 'zh-CN': '宇宙' } },
  { value: 'NATURE', labels: { en: 'Nature', 'zh-CN': '自然' } },
  { value: 'NIGHT', labels: { en: 'Night', 'zh-CN': '夜晚' } },
  { value: 'THOUGHTS', labels: { en: 'Thoughts', 'zh-CN': '想法' } },
  { value: 'TRAVEL', labels: { en: 'Travel', 'zh-CN': '旅行' } },
  { value: 'MUSIC', labels: { en: 'Music', 'zh-CN': '音乐' } },
  { value: 'ART', labels: { en: 'Art', 'zh-CN': '艺术' } },
]

export default function CategoryTabs({ value, onChange }: { value: StreamCategoryTab; onChange: (value: StreamCategoryTab) => void }) {
  const { lang } = useLanguage()

  return (
    <div className="flex gap-5 overflow-x-auto px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
      {TABS.map((tab) => (
        <button key={tab.value} type="button" onClick={() => onChange(tab.value)} className="relative shrink-0 pb-2 text-sm font-semibold" style={{ color: value === tab.value ? 'var(--foreground)' : 'var(--ghost)' }}>
          {tab.labels[lang]}
          {value === tab.value && <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full" style={{ background: 'var(--star)', boxShadow: '0 0 14px rgba(167,139,250,0.6)' }} />}
        </button>
      ))}
    </div>
  )
}