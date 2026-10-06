'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function HorizontalCarousel({ children, label, previousLabel, nextLabel, onReachEnd }: { children: ReactNode; label: string; previousLabel?: string; nextLabel?: string; onReachEnd?: () => void }) {
  const t = useTranslations('a11y')
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: true })

  useEffect(() => {
    const row = ref.current
    if (!row) return
    const update = () => setEdges({ start: row.scrollLeft <= 1, end: row.scrollLeft + row.clientWidth >= row.scrollWidth - 1 })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(row)
    for (const child of row.children) observer.observe(child)
    row.addEventListener('scroll', update, { passive: true })
    return () => { observer.disconnect(); row.removeEventListener('scroll', update) }
  }, [children])

  function move(direction: number) {
    const row = ref.current
    if (row) row.scrollBy({ left: direction * Math.max(240, row.clientWidth * 0.8), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  return (
    <div className="min-w-0" data-testid="community-carousel">
      <div className="mb-3 flex justify-end gap-2">
        <button type="button" aria-label={previousLabel ?? t('previousCommunities')} aria-controls={id} disabled={edges.start} onClick={() => move(-1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 disabled:opacity-30"><ChevronLeft size={18} /></button>
        <button type="button" aria-label={nextLabel ?? t('nextCommunities')} aria-controls={id} disabled={edges.end} onClick={() => move(1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/80 transition hover:bg-white/10 disabled:opacity-30"><ChevronRight size={18} /></button>
      </div>
      <div id={id} ref={ref} role="region" aria-label={label} tabIndex={0} className="flex min-w-0 gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden p-1 pb-4 snap-x snap-proximity focus-visible:outline-2 focus-visible:outline-violet-300" style={{ scrollbarWidth: 'none' }} onScroll={event => {
        const row = event.currentTarget
        if (row.scrollLeft > 0 && row.scrollWidth - row.clientWidth - row.scrollLeft <= 100) onReachEnd?.()
      }} onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1) }
      }}>
        {children}
      </div>
    </div>
  )
}
