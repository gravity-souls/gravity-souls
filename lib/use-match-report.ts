'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { planetProfileFromApi } from '@/lib/planet-profile-from-api'
import { subscribeSocialRefresh } from '@/lib/social-refresh'
import type { PlanetProfile } from '@/types/planet'

export type MatchReportData = { source: PlanetProfile; candidates: PlanetProfile[]; updatedAt: string }
export function useMatchReport() {
  const [data, setData] = useState<MatchReportData | null>(null)
  const [error, setError] = useState<'auth' | 'missing' | 'failed' | null>(null)
  const [loading, setLoading] = useState(true)
  const abort = useRef<AbortController | null>(null)
  const load = useCallback(async () => {
    abort.current?.abort()
    const controller = new AbortController(); abort.current = controller
    setLoading(true); setData(null); setError(null)
    try {
      const options = { cache: 'no-store' as const, signal: controller.signal }
      const self = await fetch('/api/my-planet', options)
      if (!self.ok) throw new Error(self.status === 401 ? 'auth' : self.status === 404 ? 'missing' : 'failed')
      const source = planetProfileFromApi(await self.json())
      const response = await fetch('/api/planets', options)
      if (!response.ok) throw new Error(response.status === 401 ? 'auth' : 'failed')
      const body = await response.json()
      if (!Array.isArray(body.planets)) throw new Error('failed')
      const candidates = body.planets.map(planetProfileFromApi)
      if (!controller.signal.aborted) setData({ source, candidates, updatedAt: new Date().toISOString() })
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message === 'auth' ? 'auth' : cause instanceof Error && cause.message === 'missing' ? 'missing' : 'failed')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }, [])
  useEffect(() => {
    void load()
    const unsubscribe = subscribeSocialRefresh(() => { void load() })
    return () => { abort.current?.abort(); unsubscribe() }
  }, [load])
  return { data, error, loading, reload: load }
}
