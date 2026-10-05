'use client'
import { useEffect, useState } from 'react'
import type { EventStatus } from '@/types/event'

export function useActivityStatus(status: EventStatus, date: string): EventStatus {
  const [now, setNow] = useState(() => Date.now())
  const start = new Date(date).getTime()
  useEffect(() => {
    if (status !== 'APPROVED' || start <= now) return
    const timer = setTimeout(() => setNow(Date.now()), Math.max(1, Math.min(start - Date.now() + 1, 24 * 60 * 60 * 1000)))
    return () => clearTimeout(timer)
  }, [status, start, now])
  return status === 'APPROVED' && start <= now ? 'PASSED' : status
}
