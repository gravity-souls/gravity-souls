'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import ScrollRegion from '@/components/exploration/ScrollRegion'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'
import { resonancePosition as position } from '@/lib/resonance-motion'
import { createMotionLoop } from '@/lib/motion-loop'
import { stableUnit } from '@/lib/star-map'
import { orbitColorHex } from '@/lib/match'
import type { PlanetProfile } from '@/types/planet'
import type { ResonanceSession, OrbitMatch } from '@/types/match'
import { ResonanceDetails } from './ResonanceDrawer'
import styles from './resonance-experience.module.css'
import { planetDisplayName } from '@/lib/planet-display-name'

function Field({
  source,
  session,
  planets,
  activeId,
  onSelect,
}: {
  source: PlanetProfile
  session: ResonanceSession
  planets: Record<string, PlanetProfile>
  activeId: string | null
  onSelect: (id: string) => void
}) {
  const t = useTranslations('resonance')
  const reduced = useReducedMotionPreference()
  const canvas = useRef<HTMLCanvasElement>(null)
  const phase = useRef(0)
  const nodes = useRef(new Map<string, HTMLButtonElement>())
  const motion = useRef<ReturnType<typeof createMotionLoop> | null>(null)
  const keyboardHold = useRef(false)
  const particles = useMemo(
    () =>
      Array.from({ length: 900 }, (_, i) => ({
        angle: stableUnit(`resonance:${i}:a`) * Math.PI * 2,
        radius: Math.sqrt(stableUnit(`resonance:${i}:r`)),
        color: i % 3 === 0 ? '#b99ffb77' : '#7cacf555',
      })),
    [],
  )
  useEffect(() => {
    const el = canvas.current!
    const ctx = el.getContext('2d')
    if (!ctx) return
    let width = 0, height = 0
    const loop = createMotionLoop(el, ({ delta, animate }) => {
      if (animate) phase.current += delta * 0.14
      ctx.clearRect(0, 0, width, height)
      for (const particle of particles) {
        const a = particle.angle + phase.current
        const r = particle.radius * Math.min(width, height) * 0.43
        ctx.fillStyle = particle.color
        ctx.fillRect(
          width / 2 + Math.cos(a + r * 0.01) * r,
          height * 0.48 + Math.sin(a + r * 0.01) * r * 0.8,
          1,
          1,
        )
      }
      session.matches.forEach((match, i) => {
        const p = position(i, session.matches.length, phase.current)
        const node = nodes.current.get(match.planetId)
        if (node) { node.style.left = `${p.x}%`; node.style.top = `${p.y}%` }
        const x = (p.x * width) / 100,
          y = (p.y * height) / 100
        const gradient = ctx.createLinearGradient(
          width / 2,
          height * 0.48,
          x,
          y,
        )
        gradient.addColorStop(0, '#ffffff08')
        gradient.addColorStop(1, orbitColorHex(match.orbitColor) + '35')
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(width / 2, height * 0.48)
        ctx.lineTo(x, y)
        ctx.stroke()
      })
    })
    motion.current = loop
    loop.setPaused(keyboardHold.current)
    const resize = () => {
      const rect = el.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(devicePixelRatio || 1, width < 768 ? 1 : 1.5)
      el.width = width * dpr
      el.height = height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      loop.invalidate()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)
    resize()
    return () => {
      loop.dispose()
      motion.current = null
      observer.disconnect()
    }
  }, [session, reduced, particles])
  return (
    <div className={styles.field} aria-label={t('mapView')}>
      <canvas ref={canvas} aria-hidden="true" />
      <div className={styles.source}>
        <PlanetAvatar
          planetConfig={source.planetConfig}
          size={64}
          rotating={!reduced && !source.planetConfig?.customTextureUrl}
          rotationDuration={24}
        />
        <span>
          {planetDisplayName(source)} · {t('yourPlanet')}
        </span>
      </div>
      {session.matches.map((match, i) => {
        const p = planets[match.planetId]
        if (!p) return null
        const xy = position(i, session.matches.length)
        return (
          <button
            key={p.id}
            ref={element => { if (element) nodes.current.set(p.id, element); else nodes.current.delete(p.id) }}
            onFocus={() => { keyboardHold.current = true; motion.current?.setPaused(true) }}
            onBlur={() => { keyboardHold.current = false; motion.current?.setPaused(false) }}
            className={styles.node}
            style={{ left: `${xy.x}%`, top: `${xy.y}%` }}
            aria-pressed={activeId === p.id}
            onClick={() => onSelect(p.id)}
            aria-label={`${planetDisplayName(p)} · ${t('signalScore')} ${match.score}`}
          >
            <PlanetAvatar planetConfig={p.planetConfig} size={42} rotating={!reduced && !p.planetConfig?.customTextureUrl} rotationDuration={16} />
            <span>{planetDisplayName(p)}</span>
            <strong>{match.score}</strong>
          </button>
        )
      })}
    </div>
  )
}
export default function ResonanceExperience({
  source,
  session,
  planets,
  activeId,
  onSelect,
  onClose,
}: {
  source: PlanetProfile
  session: ResonanceSession
  planets: Record<string, PlanetProfile>
  activeId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const t = useTranslations('resonance')
  const [view, setView] = useState<'map' | 'list'>('map')
  const match: OrbitMatch | undefined = session.matches.find(
    (m) => m.planetId === activeId,
  )
  const rows = (
    <div>
      {session.matches.map((m) => {
        const p = planets[m.planetId]
        return p ? (
          <button
            key={p.id}
            className={styles.row}
            aria-pressed={p.id === activeId}
            onClick={() => onSelect(p.id)}
          >
            <PlanetAvatar planetConfig={p.planetConfig} size={36} />
            <span>{planetDisplayName(p)}</span>
            <strong>{m.score}</strong>
          </button>
        ) : null
      })}
    </div>
  )
  return (
    <>
      <div className={styles.switch} role="group" aria-label={t('viewFormat')}>
        <button aria-pressed={view === 'map'} onClick={() => setView('map')}>
          {t('mapView')}
        </button>
        <button aria-pressed={view === 'list'} onClick={() => setView('list')}>
          {t('listView')}
        </button>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-slate-400">
        {t('oneRecommendationSet')}
      </p>
      <div className={styles.layout}>
        <div>
          {view === 'map' ? (
            <Field
              source={source}
              session={session}
              planets={planets}
              activeId={activeId}
              onSelect={onSelect}
            />
          ) : (
            rows
          )}
        </div>
        <aside className={styles.panel} aria-label={t('compatibility')}>
          {match && planets[match.planetId] ? (
            <ResonanceDetails
              planet={planets[match.planetId]}
              match={match}
              color={orbitColorHex(match.orbitColor)}
              onClose={onClose}
            />
          ) : (
            <>
              <h2 className={styles.panelHeader}>{t('selectPlanetDetail')}</h2>
              {view === 'map' ? (
                <ScrollRegion label={t('recommendations')}>{rows}</ScrollRegion>
              ) : (
                <p className="p-4 text-xs text-slate-400">
                  {t('selectPlanetHint')}
                </p>
              )}
            </>
          )}
        </aside>
      </div>
    </>
  )
}
