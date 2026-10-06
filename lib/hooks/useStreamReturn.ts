'use client'
import { useEffect, useRef } from 'react'
import { z } from 'zod'

const snapshotSchema = z.object({
  scroll: z.number().nonnegative(), category: z.enum(['ALL', 'GENERAL', 'COSMIC', 'NATURE', 'NIGHT', 'THOUGHTS', 'TRAVEL', 'MUSIC', 'ART']),
  search: z.string().max(80), tag: z.string().max(32).optional(),
})
export type StreamReturnState = z.infer<typeof snapshotSchema>

export function useStreamReturn(origin: '/stream' | '/my-planet' | '/', filters?: Omit<StreamReturnState, 'scroll'>, restore?: (state: StreamReturnState) => void) {
  const current = useRef({ filters, restore })
  useEffect(() => { current.current = { filters, restore } }, [filters, restore])
  useEffect(() => {
    const key = `gravity:stream-return:${origin}`
    let observer: ResizeObserver | undefined
    let timeout: ReturnType<typeof setTimeout> | undefined
    let restoreScroll: (() => void) | undefined
    let frame = 0, nextFrame = 0
    try {
      const raw = sessionStorage.getItem(key)
      if (raw) {
        sessionStorage.removeItem(key)
        const state = snapshotSchema.parse(JSON.parse(raw))
        current.current.restore?.(state)
        let ready = false
        const scroll = () => {
          if (!ready) return
          window.scrollTo(0, state.scroll)
          if (document.documentElement.scrollHeight >= state.scroll + window.innerHeight) { observer?.disconnect(); restoreScroll = undefined }
        }
        restoreScroll = () => { ready = true; frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(scroll) }) }
        observer = new ResizeObserver(scroll)
        observer.observe(document.body)
        timeout = setTimeout(() => { observer?.disconnect(); restoreScroll = undefined }, 10000)
      }
    } catch { console.warn('Stream return state could not be restored') }
    const capture = () => {
      try { sessionStorage.setItem(key, JSON.stringify({ scroll: window.scrollY, category: 'ALL', search: '', ...current.current.filters })) }
      catch { console.warn('Stream return state could not be saved') }
    }
    window.addEventListener('stream-leave', capture)
    const ready = () => restoreScroll?.()
    window.addEventListener('stream-ready', ready)
    return () => { window.removeEventListener('stream-leave', capture); window.removeEventListener('stream-ready', ready); observer?.disconnect(); clearTimeout(timeout); cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame) }
  }, [origin])
}
