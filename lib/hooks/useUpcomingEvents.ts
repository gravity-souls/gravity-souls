'use client'
import { useEffect, useState } from 'react'
import { subscribeSocialRefresh } from '@/lib/social-refresh'
import type { GalaxyEventSummary } from '@/types/event'

export function useUpcomingEvents(limit: number, enabled: boolean) {
  const [events, setEvents] = useState<GalaxyEventSummary[]>([])
  useEffect(() => {
    let disposed = false, sequence = 0
    async function refresh() {
      const current = ++sequence
      try {
        if (!enabled) { if (!disposed) setEvents([]); return }
        const response = await fetch(`/api/user/upcoming-events?limit=${limit}`, { cache: 'no-store' })
        if (!response.ok) throw new Error()
        const data = await response.json()
        if (!disposed && current === sequence) setEvents(data.events ?? (data.event ? [data.event] : []))
      } catch { if (!disposed && current === sequence) setEvents([]) }
    }
    void refresh()
    const unsubscribe = subscribeSocialRefresh(() => { void refresh() })
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 60_000)
    return () => { disposed = true; sequence++; unsubscribe(); clearInterval(timer) }
  }, [limit, enabled])
  return [events, setEvents] as const
}
