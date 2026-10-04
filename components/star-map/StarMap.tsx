'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'
import { mapCenter, stableUnit } from '@/lib/star-map'
import type { StarMapData, StarMapMode, StarMapNode } from '@/types/star-map'
import styles from './star-map.module.css'

type Dot = { x: number; y: number; z: number; color: string; groupId: string }
type Hit = { x: number; y: number; groupId: string; node?: StarMapNode }
const EMPTY: StarMapData = {
  groups: [],
  nodes: [],
  total: 0,
  nextCursor: null,
  scope: 'batch',
}

export default function StarMap({
  mode = 'discover',
  compact = false,
}: {
  mode?: StarMapMode
  compact?: boolean
}) {
  const t = useTranslations('starMap')
  const storageKey = compact ? `star-map:home:${mode}` : `star-map:${mode}`
  const [data, setData] = useState(EMPTY)
  const [focus, setFocus] = useState<string | null>(null)
  const [selected, setSelected] = useState<StarMapNode | null>(null)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomTick, setZoomTick] = useState(0)
  const [canvasAvailable, setCanvasAvailable] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const spin = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hits = useRef<Hit[]>([])
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const moved = useRef(false)
  const view = useRef({ yaw: -0.12, pitch: -0.1, zoom: 1 })
  const restoredSelection = useRef<string | null>(null)
  const [restored, setRestored] = useState(false)
  const reduced = useReducedMotionPreference()

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
        if (
          saved &&
          typeof saved.query === 'string' &&
          saved.query.length <= 80
        ) {
          setQuery(saved.query)
          setSearch(saved.query)
          if (typeof saved.cursor === 'string' && saved.cursor.length <= 100)
            setCursor(saved.cursor)
          if (typeof saved.focus === 'string' && saved.focus.length <= 100)
            setFocus(saved.focus)
          if (typeof saved.selected === 'string')
            restoredSelection.current = saved.selected
          if (
            saved.view &&
            Number.isFinite(saved.view.yaw) &&
            Number.isFinite(saved.view.pitch) &&
            Number.isFinite(saved.view.zoom)
          )
            view.current = {
              yaw: saved.view.yaw,
              pitch: Math.max(-0.65, Math.min(0.65, saved.view.pitch)),
              zoom: Math.max(0.65, Math.min(4, saved.view.zoom)),
            }
        }
      } catch {
        /* Storage may be disabled; exploration still works. */
      }
      setRestored(true)
    })
  }, [storageKey])

  useEffect(() => {
    if (!restored) return
    const save = () => {
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            query,
            cursor,
            focus,
            selected: selected?.id,
            view: view.current,
          }),
        )
      } catch {
        /* Optional per-tab state only. */
      }
    }
    window.addEventListener('pagehide', save)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
    }
  }, [storageKey, query, cursor, focus, selected, restored])

  const queryGroup = mode === 'discover' ? focus : null

  useEffect(() => {
    if (!restored) return
    const abort = new AbortController()
    const params = new URLSearchParams({ mode, search: query })
    if (cursor) params.set('cursor', cursor)
    if (queryGroup) params.set('group', queryGroup)
    async function load() {
      await Promise.resolve()
      if (abort.signal.aborted) return
      setLoading(true)
      setError(null)
      setSelected(null)
      try {
        const response = await fetch(`/api/star-map?${params}`, {
          signal: abort.signal,
          cache: 'no-store',
        })
        if (!response.ok)
          throw new Error(response.status === 401 ? 'signIn' : 'loadError')
        const result = (await response.json()) as StarMapData
        if (!abort.signal.aborted) {
          setData(result)
          if (restoredSelection.current) {
            setSelected(
              result.nodes.find(
                (node) => node.id === restoredSelection.current,
              ) ?? null,
            )
            restoredSelection.current = null
          }
        }
      } catch (cause) {
        if (!abort.signal.aborted) {
          setData(EMPTY)
          setError(
            cause instanceof Error && cause.message === 'signIn'
              ? 'signIn'
              : 'loadError',
          )
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => abort.abort()
  }, [mode, query, cursor, queryGroup, restored])

  const clusters = useMemo(
    () =>
      data.groups
        .filter((group) => group.count > 0 || mode === 'galaxies')
        .map((group, index, all) => ({
          ...group,
          center: mapCenter(index, all.length),
        })),
    [data.groups, mode],
  )
  const dots = useMemo(() => {
    const result: Dot[] = []
    const perCluster = Math.min(
      360,
      Math.floor(2000 / Math.max(1, clusters.length)),
    )
    clusters.forEach((group) => {
      for (let i = 0; i < perCluster; i++) {
        const a = stableUnit(`${group.id}:${i}:a`) * Math.PI * 2
        const r = Math.sqrt(stableUnit(`${group.id}:${i}:r`)) * 58
        result.push({
          x: group.center[0] + Math.cos(a + r * 0.025) * r,
          y: group.center[1] + Math.sin(a + r * 0.025) * r * 0.7,
          z: group.center[2] + (stableUnit(`${group.id}:${i}:z`) - 0.5) * 65,
          color: group.color,
          groupId: group.id,
        })
      }
    })
    return result
  }, [clusters])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      queueMicrotask(() => setCanvasAvailable(false))
      return
    }
    let width = 0
    let height = 0
    let frame = 0
    let disposed = false
    let visible = true
    let last = 0
    const focused = clusters.find((group) => group.id === focus)
    const centers = new Map(clusters.map((group) => [group.id, group.center]))
    const project = (x: number, y: number, z: number) => {
      if (focused) {
        x -= focused.center[0]
        y -= focused.center[1]
        z -= focused.center[2]
      }
      const { yaw, pitch, zoom } = view.current
      const rx = x * Math.cos(yaw) + z * Math.sin(yaw)
      const rz = -x * Math.sin(yaw) + z * Math.cos(yaw)
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch)
      const depth = y * Math.sin(pitch) + rz * Math.cos(pitch)
      const p = 730 / Math.max(350, 730 + depth)
      const fit = Math.min(width / 700, height / 540) * zoom
      return { x: width / 2 + rx * fit * p, y: height * 0.44 + ry * fit * p, p }
    }
    function render(time: number) {
      frame = 0
      if (disposed || !ctx || !visible || document.hidden) {
        last = 0
        return
      }
      if (!reduced && pointers.current.size === 0 && !focused)
        view.current.yaw += Math.min(time - (last || time), 45) * 0.00007
      if (!reduced && pointers.current.size === 0)
        spin.current += Math.min(time - (last || time), 45) * 0.00032
      last = time
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      const hub = project(0, 0, 0)
      const cos = Math.cos(spin.current)
      const sin = Math.sin(spin.current)
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i]
        if (focused && dot.groupId !== focus) continue
        const center = centers.get(dot.groupId)!
        const dx = dot.x - center[0]
        const dy = (dot.y - center[1]) / 0.7
        const p = project(
          center[0] + dx * cos - dy * sin,
          center[1] + (dx * sin + dy * cos) * 0.7,
          dot.z,
        )
        ctx.fillStyle = dot.color + 'a0'
        ctx.fillRect(p.x, p.y, Math.max(0.6, p.p), Math.max(0.6, p.p))
        if (!focused && i % 40 === 0) {
          const gradient = ctx.createLinearGradient(hub.x, hub.y, p.x, p.y)
          gradient.addColorStop(0, '#ffffff30')
          gradient.addColorStop(1, dot.color + '08')
          ctx.strokeStyle = gradient
          ctx.lineWidth = 0.6
          ctx.beginPath()
          ctx.moveTo(hub.x, hub.y)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }
      }
      hits.current = []
      if (!focused) {
        clusters.forEach((group) => {
          const p = project(...group.center)
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 22)
          gradient.addColorStop(0, group.color + 'a0')
          gradient.addColorStop(1, group.color + '00')
          ctx.fillStyle = gradient
          ctx.fillRect(p.x - 22, p.y - 22, 44, 44)
          hits.current.push({ ...p, groupId: group.id })
        })
      } else {
        const nodes = data.nodes.filter((node) => node.groupId === focus)
        nodes.forEach((node, index) => {
          const angle = index * 2.3999632297
          const radius =
            nodes.length <= 1
              ? 0
              : 15 + 82 * Math.sqrt((index + 0.5) / nodes.length)
          const p = project(
            focused.center[0] + Math.cos(angle) * radius,
            focused.center[1] + Math.sin(angle) * radius * 0.7,
            focused.center[2],
          )
          ctx.strokeStyle = focused.color + '40'
          ctx.lineWidth = 0.65
          ctx.beginPath()
          ctx.moveTo(width / 2, height * 0.44)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
          ctx.fillStyle = focused.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, node.id === selected?.id ? 5 : 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalCompositeOperation = 'source-over'
          ctx.font = '11px system-ui'
          ctx.fillStyle = '#d6deed'
          if (node.id === selected?.id || nodes.length <= 6)
            ctx.fillText(node.name.slice(0, 18), p.x + 8, p.y + 3)
          ctx.globalCompositeOperation = 'lighter'
          hits.current.push({ ...p, groupId: focus!, node })
        })
      }
      ctx.globalCompositeOperation = 'source-over'
      if (!reduced) frame = requestAnimationFrame(render)
    }
    const redraw = () => {
      if (!frame && !disposed) frame = requestAnimationFrame(render)
    }
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const dpr = Math.min(devicePixelRatio || 1, width < 768 ? 1 : 1.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      redraw()
    }
    const wheel = (event: WheelEvent) => {
      event.preventDefault()
      view.current.zoom = Math.max(
        0.65,
        Math.min(4, view.current.zoom * Math.exp(-event.deltaY * 0.0015)),
      )
      if (!focus && view.current.zoom >= 1.8) {
        const rect = canvas.getBoundingClientRect()
        const x = event.clientX - rect.left
        const y = event.clientY - rect.top
        const nearest = [...hits.current].sort(
          (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
        )[0]
        if (nearest) {
          setFocus(nearest.groupId)
          setSelected(null)
          setCursor(null)
          view.current.zoom = 2.4
        }
      } else if (focus && view.current.zoom <= 1.2) {
        setFocus(null)
        setSelected(null)
        setCursor(null)
        view.current.zoom = 1
      }
      redraw()
    }
    const visibility = () => {
      if (!document.hidden) {
        last = 0
        redraw()
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) redraw()
    })
    intersection.observe(canvas)
    canvas.addEventListener('wheel', wheel, { passive: false })
    canvas.addEventListener('pointermove', redraw, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    resize()
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      intersection.disconnect()
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('pointermove', redraw)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [clusters, dots, data.nodes, focus, reduced, selected, zoomTick])

  function enter(id: string) {
    setFocus(id)
    setSelected(null)
    setCursor(null)
    view.current.zoom = 2.4
  }
  const groupLabel = (id: string, name?: string) => name ?? t(`group_${id}`)
  const focusedGroup = clusters.find((group) => group.id === focus)
  const visibleNodes = focus
    ? data.nodes.filter((node) => node.groupId === focus)
    : []
  return (
    <div className={`${styles.map} ${compact ? styles.compact : ''}`}>
      <div className={styles.mapToolbar}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setQuery(search.trim())
            setCursor(null)
            setFocus(null)
            setSelected(null)
            view.current.zoom = 1
          }}
        >
          <input
            value={search}
            maxLength={80}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t('search')}
            placeholder={t('search')}
          />
          <button type="submit">{t('searchAction')}</button>
        </form>
        <p>{t(`meaning_${mode}`)}</p>
        <button
          type="button"
          className={styles.sidebarToggle}
          aria-expanded={sidebarOpen}
          aria-controls="star-map-sidebar"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {t('browseObjects')}
        </button>
      </div>
      {focus && (
        <button
          className={styles.back}
          onClick={() => {
            setFocus(null)
            setSelected(null)
            setCursor(null)
            view.current.zoom = 1
          }}
        >
          {t('overview')} /{' '}
          {focusedGroup ? groupLabel(focusedGroup.id, focusedGroup.name) : ''}
        </button>
      )}
      <div className={styles.explorer}>
        <section
          className={styles.stage}
          aria-label={t('title')}
          aria-busy={loading}
        >
          <div className={styles.stageTop}>
            <span>
              {loading
                ? t('loading')
                : t('visibleTotal', { count: data.total })}
            </span>
            <span>{t('gestures')}</span>
          </div>
          <canvas
            ref={canvasRef}
            className={`${styles.canvas} ${styles.interactiveCanvas}`}
            tabIndex={0}
            aria-label={t('canvasLabel')}
            onKeyDown={(event) => {
              if (event.key === '+' || event.key === '=') {
                event.preventDefault()
                view.current.zoom = Math.min(4, view.current.zoom * 1.15)
                setZoomTick((value) => value + 1)
              } else if (event.key === '-') {
                event.preventDefault()
                view.current.zoom = Math.max(0.65, view.current.zoom / 1.15)
                setZoomTick((value) => value + 1)
              } else if (event.key === 'Escape') {
                setFocus(null)
                setSelected(null)
                setCursor(null)
                view.current.zoom = 1
              }
            }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId)
              pointers.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
              })
              moved.current = false
            }}
            onPointerMove={(event) => {
              const before = pointers.current.get(event.pointerId)
              if (!before) return
              const next = { x: event.clientX, y: event.clientY }
              if (pointers.current.size === 2) {
                const other = [...pointers.current.entries()].find(
                  ([id]) => id !== event.pointerId,
                )![1]
                const oldDistance = Math.hypot(
                  before.x - other.x,
                  before.y - other.y,
                )
                const newDistance = Math.hypot(
                  next.x - other.x,
                  next.y - other.y,
                )
                if (oldDistance > 8)
                  view.current.zoom = Math.max(
                    0.65,
                    Math.min(
                      4,
                      (view.current.zoom * newDistance) / oldDistance,
                    ),
                  )
                moved.current = true
              } else {
                const dx = next.x - before.x
                const dy = next.y - before.y
                if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true
                view.current.yaw += dx * 0.004
                view.current.pitch = Math.max(
                  -0.65,
                  Math.min(0.65, view.current.pitch + dy * 0.003),
                )
              }
              pointers.current.set(event.pointerId, next)
              if (pointers.current.size === 2) {
                if (!focus && view.current.zoom >= 1.8) {
                  const rect = event.currentTarget.getBoundingClientRect()
                  const pair = [...pointers.current.values()]
                  const x = (pair[0].x + pair[1].x) / 2 - rect.left
                  const y = (pair[0].y + pair[1].y) / 2 - rect.top
                  const nearest = [...hits.current].sort(
                    (a, b) =>
                      Math.hypot(a.x - x, a.y - y) -
                      Math.hypot(b.x - x, b.y - y),
                  )[0]
                  if (nearest) enter(nearest.groupId)
                } else if (focus && view.current.zoom <= 1.2) {
                  setFocus(null)
                  setSelected(null)
                  setCursor(null)
                  view.current.zoom = 1
                }
              }
            }}
            onPointerUp={(event) => {
              if (!moved.current && pointers.current.size === 1) {
                const rect = event.currentTarget.getBoundingClientRect()
                const x = event.clientX - rect.left
                const y = event.clientY - rect.top
                const hit = [...hits.current].sort(
                  (a, b) =>
                    Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
                )[0]
                if (hit && Math.hypot(hit.x - x, hit.y - y) < 36) {
                  if (hit.node) {
                    setSelected(hit.node)
                    setSidebarOpen(true)
                  } else enter(hit.groupId)
                }
              }
              pointers.current.delete(event.pointerId)
            }}
            onPointerCancel={(event) =>
              pointers.current.delete(event.pointerId)
            }
          />
          {!canvasAvailable && (
            <p className={styles.fallback}>{t('fallback')}</p>
          )}
          {!loading && error && (
            <div className={styles.fallback} role="alert">
              {t(error)}
              {error === 'signIn' && (
                <Link href="/sign-in?next=/star-map">{t('signInAction')}</Link>
              )}
            </div>
          )}
          {!loading && !error && data.requiresPlanet && (
            <div className={styles.fallback}>
              <p>{t('requiresPlanet')}</p>
              <Link href="/onboarding">{t('createPlanet')}</Link>
            </div>
          )}
          {!loading && !error && !data.requiresPlanet && !clusters.length && (
            <p className={styles.fallback}>{t('empty')}</p>
          )}
        </section>
        <aside
          id="star-map-sidebar"
          className={styles.sidebar}
          data-open={sidebarOpen}
          aria-label={t('browseObjects')}
        >
          <div className={styles.sidebarHeader}>
            <h2>{t('browseObjects')}</h2>
            <button
              type="button"
              className={styles.sidebarToggle}
              onClick={() => setSidebarOpen(false)}
            >
              {t('closeSidebar')}
            </button>
          </div>
          <nav className={styles.clusters} aria-label={t('chooseGroup')}>
            {clusters.map((group) => (
              <button
                key={group.id}
                aria-pressed={focus === group.id}
                onClick={() =>
                  mode === 'galaxies'
                    ? (enter(group.id),
                      setSelected(
                        data.nodes.find((node) => node.id === group.id) ?? null,
                      ))
                    : enter(group.id)
                }
                style={
                  { '--cluster-color': group.color } as React.CSSProperties
                }
              >
                <span className={styles.dot} />
                <span>{groupLabel(group.id, group.name)}</span>
                <span className={styles.clusterCaption}>
                  {t(mode === 'galaxies' ? 'members' : 'planets', {
                    count: group.count,
                  })}
                </span>
              </button>
            ))}
          </nav>
          {focus && (
            <div className={styles.nodeList} aria-label={t('choosePlanet')}>
              {visibleNodes.map((node) => (
                <button
                  key={node.id}
                  aria-pressed={selected?.id === node.id}
                  onClick={() => setSelected(node)}
                >
                  {node.planetConfig && (
                    <PlanetAvatar planetConfig={node.planetConfig} size={28} />
                  )}
                  <span>{node.name}</span>
                  {node.score !== undefined && <span>{node.score}%</span>}
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div
              className={`${styles.card} ${styles.liveCard}`}
              aria-live="polite"
            >
              <div className={styles.nodeHeading}>
                {selected.planetConfig && (
                  <PlanetAvatar
                    planetConfig={selected.planetConfig}
                    size={48}
                    rotating={
                      !reduced && !selected.planetConfig.customTextureUrl
                    }
                    rotationDuration={24}
                    level={selected.level}
                  />
                )}
                <h2>{selected.name}</h2>
              </div>
              <p>{selected.tagline}</p>
              {selected.score !== undefined && (
                <p>{t('score', { score: selected.score })}</p>
              )}
              {selected.memberCount !== undefined && (
                <p>{t('members', { count: selected.memberCount })}</p>
              )}
              <Link href={selected.href}>
                {t(mode === 'galaxies' ? 'openGalaxy' : 'openPlanet')}
              </Link>
            </div>
          )}
          {data.nextCursor && (
            <button
              className={styles.next}
              disabled={loading}
              onClick={() => {
                setCursor(data.nextCursor)
                setSelected(null)
                if (mode === 'galaxies') {
                  setFocus(null)
                  view.current.zoom = 1
                }
              }}
            >
              {t('nextBatch')}
            </button>
          )}
        </aside>
      </div>
      <p className={styles.mapNote}>
        {t('decoration')}{' '}
        {t(data.scope === 'batch' ? 'batchScope' : 'allScope')}
      </p>
    </div>
  )
}
