'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import ScrollRegion from '@/components/exploration/ScrollRegion'
import PersonalMapAnchor from '@/components/star-map/PersonalMapAnchor'
import { PersonalRelationLegend, PersonalNodeRelations } from '@/components/star-map/PersonalMapRelations'
import { atlasPosition, galaxyMagnitude, planetGravity } from '@/lib/atlas-layout'
import { personalNodeOffset, personalNodeRelations, RELATION_STYLES } from '@/lib/personal-map-relations'
import PersonAvatar from '@/components/planet/PersonAvatar'
import PublicPlanetTags from '@/components/planet/PublicPlanetTags'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import PlanetRelationshipStatus from '@/components/social/PlanetRelationshipStatus'
import SavePlanetButton from '@/components/social/SavePlanetButton'
import FollowButton from '@/components/social/FollowButton'
import BeamButton from '@/components/social/BeamButton'
import { subscribeSocialRefresh } from '@/lib/social-refresh'
import { withExplorationOrigin, personalMapOrigin } from '@/lib/exploration-return'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'
import { MAP_COLORS, mapCenter, stableUnit } from '@/lib/star-map'
import type { StarMapData, StarMapMode, StarMapNode, PersonalMapCollection, PersonalMapLayer } from '@/types/star-map'
import styles from './star-map.module.css'
import MapObjectDialog from './MapObjectDialog'

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
  collection = 'all',
  listOnly = false,
  layer = 'planets',
}: {
  mode?: StarMapMode
  compact?: boolean
  collection?: PersonalMapCollection
  listOnly?: boolean
  layer?: PersonalMapLayer
}) {
  const t = useTranslations('starMap'), locale = useLocale()
  const contextLayer = mode === 'personal' && layer !== 'planets'
  const totalLabel = contextLayer ? layer === 'galaxies' ? 'myGalaxyTotal' : 'myActivityTotal' : mode === 'galaxies' ? 'galaxyTotal' : mode === 'personal' ? 'personalTotal' : 'visibleTotal'
  const browseLabel = contextLayer ? layer === 'galaxies' ? 'browseGalaxies' : 'browseActivities' : mode === 'galaxies' ? 'browseGalaxies' : 'browseObjects'
  const ta = useTranslations('planetActions')
  const storageKey = compact ? `star-map:home:${mode}` : `star-map:${mode}${mode === 'personal' ? `:${layer === 'planets' ? collection : layer}` : ''}`
  const origin = mode === 'personal' ? personalMapOrigin(collection, listOnly, layer) : compact ? 'home-star-map' : 'star-map'
  const [data, setData] = useState(EMPTY)
  const [focus, setFocus] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = data.nodes.find(node => node.id === selectedId) ?? null
  const [revision, setRevision] = useState(0)
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
            if (mode !== 'discover') setCursor(saved.cursor)
          if (typeof saved.focus === 'string' && saved.focus.length <= 100)
            setFocus(saved.focus)
          if (typeof saved.selected === 'string' && saved.selected.length <= 100)
            setSelectedId(saved.selected)
          if (typeof saved.sidebarOpen === 'boolean') setSidebarOpen(saved.sidebarOpen)
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
  }, [storageKey, mode])

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
            selected: selectedId,
            sidebarOpen,
            view: view.current,
          }),
        )
      } catch {
        /* Optional per-tab state only. */
      }
    }
    save()
    window.addEventListener('pagehide', save)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
    }
  }, [storageKey, query, cursor, focus, selectedId, sidebarOpen, restored])

  useEffect(() => {
    const refresh = () => { if (mode === 'discover') setCursor(null); setRevision(value => value + 1) }
    return subscribeSocialRefresh(refresh)
  }, [mode])

  const queryGroup = mode !== 'galaxies' ? focus : null

  useEffect(() => {
    if (!restored) return
    const abort = new AbortController()
    const params = new URLSearchParams({ mode, search: query })
    if (mode === 'personal') { params.set('layer', layer); if (layer === 'planets') params.set('collection', collection) }
    if (cursor) params.set('cursor', cursor)
    if (queryGroup) params.set('group', queryGroup)
    async function load() {
      await Promise.resolve()
      if (abort.signal.aborted) return
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/star-map?${params}`, {
          signal: abort.signal,
          cache: 'no-store',
        })
        if (response.status === 400 && cursor) { if (!abort.signal.aborted) { setData(EMPTY); setCursor(null); setSelectedId(null) }; return }
        if (!response.ok)
          throw new Error(response.status === 401 ? 'signIn' : 'loadError')
        const result = (await response.json()) as StarMapData
        if (!abort.signal.aborted) {
          setData(previous => mode === 'discover' && cursor ? { ...result, nodes: [...new Map([...previous.nodes, ...result.nodes].map(node => [node.id,node])).values()] } : result)
          setSelectedId(current => result.nodes.some(node => node.id === current) ? current : null)
          setFocus(current => result.groups.some(group => group.id === current && (group.count > 0 || mode === 'galaxies')) ? current : null)
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
  }, [mode, query, cursor, queryGroup, restored, revision, collection, layer])

  const clusters = useMemo(
    () =>
      data.groups
        .filter((group) => group.count > 0 || mode === 'galaxies')
        .map((group, index, all) => ({
          ...group,
          center: mapCenter(index, mode === 'galaxies' ? Math.max(2,all.length) : all.length, mode === 'personal'),
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
      for (let i = 0; i < (mode === 'galaxies' ? Math.min(perCluster,galaxyMagnitude(group.count).particles) : perCluster); i++) {
        const a = stableUnit(`${group.id}:${i}:a`) * Math.PI * 2
        const r = Math.sqrt(stableUnit(`${group.id}:${i}:r`)) * (mode === 'galaxies' ? galaxyMagnitude(group.count).radius : 58)
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
  }, [clusters, mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      queueMicrotask(() => setCanvasAvailable(false))
      return
    }
    const portraits = new Map<string, HTMLImageElement>()
    if (mode !== 'galaxies') for (const node of data.nodes) if (node.avatarUrl || node.planetConfig) {
      const image = new Image(); portraits.set(node.id, image)
      image.onload = () => { if (!disposed) redraw() }
      image.src = mode === 'personal' ? node.avatarUrl || '' : node.planetConfig?.customTextureUrl || (node.planetConfig?.baseTexture ? `/textures/${node.planetConfig.baseTexture}` : node.avatarUrl || '')
    }
    let width = 0
    let height = 0
    let frame = 0
    let disposed = false
    let visible = true
    let last = 0
    // Personal filters keep the owner and actual relationship edges visible.
    const focused = mode !== 'galaxies' ? undefined : clusters.find((group) => group.id === focus)
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
      // Compress the edge of the view rather than clipping real identities
      // and relationship endpoints when the user zooms or rotates.
      const halfX = Math.max(1,width/2-32), halfY = Math.max(1,height*.44-45)
      return { x: width / 2 + Math.tanh(rx*fit*p/halfX)*halfX, y: height * 0.44 + Math.tanh(ry*fit*p/halfY)*halfY, p }
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
      // Global atlas atmosphere is centered on the viewer, independent of
      // climate groups. Decorative stars never enter counts or hit targets.
      for (let i = 0; i < 520; i++) {
        const depth = .2+stableUnit(`atlas-star:${i}:z`)*.8
        const wrap = (v: number) => ((v%1)+1)%1
        const x = wrap(stableUnit(`horizontal-space:${i}:star`)+view.current.yaw*depth*.08)*width
        const y = wrap(stableUnit(`vertical-field:${i*17}:spark`)+view.current.pitch*depth*.08)*height
        const alpha = reduced ? .6 : .45+.2*Math.sin(time/2400+i)
        ctx.globalAlpha = alpha
        ctx.fillStyle = i%7 === 0 ? '#c4b5fd' : '#cddaff'
        const size = (i%13 === 0 ? 1.8 : .8)*depth+.4
        ctx.fillRect(x,y,size,size)
      }
      ctx.globalAlpha = 1
      // Every visible galaxy has its own layout beam. These are navigation
      // guides, distinct from the viewer's real personal relationship edges.
      if (mode === 'galaxies' && !focused) for (const group of clusters) {
        const p = project(...group.center)
        ctx.strokeStyle = group.color+'85'; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(hub.x,hub.y); ctx.lineTo(p.x,p.y); ctx.stroke()
        if (!reduced) { const travel=(time/6500+stableUnit(group.id))%1; ctx.fillStyle=group.color; ctx.beginPath(); ctx.arc(hub.x+(p.x-hub.x)*travel,hub.y+(p.y-hub.y)*travel,1.6,0,Math.PI*2); ctx.fill() }
      }
      for (let i = 0; mode !== 'discover' && i < dots.length; i++) {
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
      }
      hits.current = []
      if (mode === 'discover') {
        ctx.globalCompositeOperation = 'source-over'
        for (const node of data.nodes) {
          const point = atlasPosition(node.id,node.score,node.level)
          const p = project(point.x,point.y,point.z), radius = planetGravity(node.level).radius * Math.min(1.25,p.p)
          const color = MAP_COLORS[node.groupId] || '#b89afa'
          let dx = p.x-hub.x, dy = p.y-hub.y
          const clearance = Math.min(80,Math.max(55,width/2-34))
          if (Math.hypot(dx,dy) < clearance) { const angle = Math.atan2(dy,dx); p.x=hub.x+Math.cos(angle)*clearance; p.y=hub.y+Math.sin(angle)*clearance; dx=p.x-hub.x; dy=p.y-hub.y }
          const distance = Math.hypot(dx,dy)
          if (data.selfPlanet && !loading && !error && distance > 50) {
            const relations = personalNodeRelations(node)
            relations.forEach((relation,index) => {
              const style = RELATION_STYLES[relation], offset = (index-(relations.length-1)/2)*4
              const nx = -dy/distance*offset, ny = dx/distance*offset
              ctx.strokeStyle = style.color+'75'; ctx.lineWidth = node.id === selected?.id ? 2 : 1
              ctx.setLineDash([...style.dash]); ctx.beginPath()
              ctx.moveTo(hub.x+dx/distance*25+nx,hub.y+dy/distance*25+ny)
              ctx.lineTo(p.x-dx/distance*radius+nx,p.y-dy/distance*radius+ny); ctx.stroke(); ctx.setLineDash([])
              if (!reduced) {
                const travel = (time/6000+stableUnit(node.id))%1
                ctx.fillStyle = style.color; ctx.beginPath(); ctx.arc(hub.x+dx*travel+nx,hub.y+dy*travel+ny,1.5,0,Math.PI*2); ctx.fill()
              }
            })
          }
          const glow = ctx.createRadialGradient(p.x,p.y,radius,p.x,p.y,radius*2.8)
          glow.addColorStop(0,color+'55'); glow.addColorStop(1,color+'00'); ctx.fillStyle=glow; ctx.fillRect(p.x-radius*3,p.y-radius*3,radius*6,radius*6)
          const portrait=portraits.get(node.id)
          const visibleRadius = radius
          ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,visibleRadius,0,Math.PI*2); ctx.clip(); ctx.fillStyle=color+'88'; ctx.fill()
          if (portrait?.complete && portrait.naturalWidth) { const crop=Math.min(portrait.naturalWidth,portrait.naturalHeight); ctx.drawImage(portrait,(portrait.naturalWidth-crop)/2,(portrait.naturalHeight-crop)/2,crop,crop,p.x-radius,p.y-radius,radius*2,radius*2) }
          ctx.restore(); ctx.font='11px system-ui'; ctx.fillStyle='#d6deed'; ctx.textAlign='center'
          if (node.id===selected?.id || data.nodes.length<=50) ctx.fillText((node.displayName || node.name).slice(0,12),p.x,p.y+visibleRadius+13)
          ctx.textAlign='start'; hits.current.push({...p,groupId:node.groupId,node})
        }
      } else if (!focused && mode === 'personal') {
        // Render actual bounded-batch objects in overview. Decorative particles
        // and climate/status group centers have no relationship edges.
        clusters.forEach(group => {
          const nodes = data.nodes.filter(node => node.groupId === group.id)
          nodes.forEach((node, index) => {
            const offset = personalNodeOffset(index, nodes.length)
            const p = project(group.center[0] + offset.x, group.center[1] + offset.y, group.center[2])
            // The HTML owner anchor stays at the screen origin even when the
            // camera rotates. Keep real targets clear of its label/hit area.
            let dx = p.x - hub.x, dy = p.y - hub.y
            const distance = Math.hypot(dx, dy)
            const clearance = Math.min(120,Math.max(60,width/2-34))
            if (distance < clearance) {
              const angle = distance < 1 ? index * 2.3999632297 : Math.atan2(dy, dx)
              p.x = hub.x + Math.cos(angle) * clearance
              p.y = hub.y + Math.sin(angle) * clearance
            }
            dx = p.x - hub.x; dy = p.y - hub.y
            const length = Math.hypot(dx, dy)
            if (data.selfPlanet && !loading && !error) {
              const relations = personalNodeRelations(node)
              relations.forEach((relation, relationIndex) => {
                const style = RELATION_STYLES[relation]
                const shift = (relationIndex - (relations.length - 1) / 2) * 5
                const nx = -dy / length * shift, ny = dx / length * shift
                const start = { x: hub.x + dx / length * 24 + nx, y: hub.y + dy / length * 24 + ny }
                const end = { x: p.x - dx / length * 18 + nx, y: p.y - dy / length * 18 + ny }
                ctx.strokeStyle = style.color + (node.id === selected?.id ? 'e0' : 'b0')
                ctx.lineWidth = node.id === selected?.id ? 2.2 : 1.4
                ctx.setLineDash([...style.dash])
                ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke()
                ctx.setLineDash([])
                const arrow = (x: number, y: number, angle: number) => {
                  ctx.beginPath(); ctx.moveTo(x - Math.cos(angle - 0.55) * 7, y - Math.sin(angle - 0.55) * 7)
                  ctx.lineTo(x, y); ctx.lineTo(x - Math.cos(angle + 0.55) * 7, y - Math.sin(angle + 0.55) * 7); ctx.stroke()
                }
                const angle = Math.atan2(dy, dx)
                if (style.arrow !== 'none') arrow(end.x, end.y, angle)
                if (style.arrow === 'both') arrow(start.x, start.y, angle + Math.PI)
              })
            }
            ctx.globalCompositeOperation = 'source-over'
            ctx.fillStyle = group.color
            ctx.beginPath()
            const person = !node.kind || node.kind === 'planet'
            const size = person ? 16 : node.id === selected?.id ? 10 : 7
            if (node.kind === 'galaxy') ctx.rect(p.x-size,p.y-size,size*2,size*2)
            else if (node.kind === 'activity') { ctx.moveTo(p.x,p.y-size-1); ctx.lineTo(p.x+size+1,p.y); ctx.lineTo(p.x,p.y+size+1); ctx.lineTo(p.x-size-1,p.y); ctx.closePath() }
            else ctx.arc(p.x,p.y,size,0,Math.PI*2)
            ctx.fill()
            if (person) {
              const portrait = portraits.get(node.id)
              if (portrait?.complete && portrait.naturalWidth) {
                ctx.save(); ctx.beginPath(); ctx.arc(p.x,p.y,size,0,Math.PI*2); ctx.clip()
                const crop = Math.min(portrait.naturalWidth,portrait.naturalHeight)
                ctx.drawImage(portrait,(portrait.naturalWidth-crop)/2,(portrait.naturalHeight-crop)/2,crop,crop,p.x-size,p.y-size,size*2,size*2); ctx.restore()
              } else {
                ctx.font = '13px system-ui'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText((node.displayName || node.name).slice(0,1),p.x,p.y+4); ctx.textAlign = 'start'
              }
            }
            ctx.font = '11px system-ui'; ctx.fillStyle = '#d6deed'; ctx.textAlign = 'center'
            ctx.fillText((node.displayName || node.name).slice(0,12),p.x,p.y+size+14)
            ctx.textAlign = 'start'; ctx.globalCompositeOperation = 'lighter'
            hits.current.push({ ...p, groupId: group.id, node })
          })
        })
      } else if (!focused) {
        clusters.forEach((group) => {
          const p = project(...group.center)
          const magnitude = galaxyMagnitude(group.count)
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, magnitude.radius)
          gradient.addColorStop(0, group.color + 'a0')
          gradient.addColorStop(1, group.color + '00')
          ctx.fillStyle = gradient
          ctx.fillRect(p.x-magnitude.radius,p.y-magnitude.radius,magnitude.radius*2,magnitude.radius*2)
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
          if (mode !== 'personal') {
            ctx.strokeStyle = focused.color + '40'
            ctx.lineWidth = 0.65
            ctx.beginPath()
            ctx.moveTo(width / 2, height * 0.44)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
          ctx.fillStyle = focused.color
          ctx.beginPath()
          const size = node.id === selected?.id ? 5 : 3
          if (node.kind === 'galaxy') ctx.rect(p.x - size, p.y - size, size * 2, size * 2)
          else if (node.kind === 'activity') { ctx.moveTo(p.x, p.y - size - 1); ctx.lineTo(p.x + size + 1, p.y); ctx.lineTo(p.x, p.y + size + 1); ctx.lineTo(p.x - size - 1, p.y); ctx.closePath() }
          else ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
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
      portraits.forEach(image => { image.onload = null })
      cancelAnimationFrame(frame)
      observer.disconnect()
      intersection.disconnect()
      canvas.removeEventListener('wheel', wheel)
      canvas.removeEventListener('pointermove', redraw)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [clusters, dots, data.nodes, data.selfPlanet, focus, reduced, selected, zoomTick, listOnly, mode, loading, error])

  function enter(id: string) {
    setFocus(id)
    setSelectedId(mode === 'galaxies' ? id : null)
    setCursor(null)
    view.current.zoom = mode !== 'galaxies' ? 1 : 2.4
  }
  const groupLabel = (id: string, name?: string) => {
    const group = data.groups.find(item => item.id === id)
    return group?.phase ? t('constellationName', { name: name ?? '', phase: t(`constellation_${group.phase}`) }) : name ?? t(`group_${id}`)
  }
  const focusedGroup = clusters.find((group) => group.id === focus)
  const visibleNodes = focus
    ? data.nodes.filter((node) => node.groupId === focus)
    : []
  return (
    <div className={`${styles.map} ${compact ? styles.compact : ''} ${listOnly ? styles.listView : ''}`}>
      <div className={styles.mapToolbar}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setQuery(search.trim())
            setCursor(null)
            setFocus(null)
            setSelectedId(null)
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
        <p>{t(contextLayer ? `meaning_personal_${layer}` : `meaning_${mode}`)}</p>
        {!listOnly && <button
          type="button"
          className={styles.sidebarToggle}
          aria-expanded={sidebarOpen}
          aria-controls="star-map-sidebar"
          onClick={() => setSidebarOpen((open) => !open)}
        >
          {t(browseLabel)}
        </button>}
      </div>
      {(mode === 'personal' || mode === 'discover') && <PersonalRelationLegend layer={mode === 'discover' ? 'planets' : layer} />}
      {mode === 'personal' && layer === 'constellations' && <div className={styles.relationLegend}>
        <p>{t('constellationLifecycle')}</p>
        <Link href="/activities?status=pending">{t('constellationRequests')}</Link>
      </div>}
      {focus && (
        <button
          className={styles.back}
          onClick={() => {
            setFocus(null)
            setSelectedId(null)
            setCursor(null)
            view.current.zoom = 1
          }}
        >
          {t('overview')} /{' '}
          {focusedGroup ? groupLabel(focusedGroup.id, focusedGroup.name) : ''}
        </button>
      )}
      <div className={styles.explorer}>
        {!listOnly && <section
          className={`${styles.stage} ${mode === 'personal' ? styles.centeredStage : ''}`}
          aria-label={t('title')}
          aria-busy={loading}
        >
          <div className={styles.stageTop}>
            <span>
              {loading
                ? t('loading')
                : t(totalLabel, { count: data.total })}
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
                setSelectedId(null)
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
                    setSelectedId(hit.node.id)
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
          {mode !== 'galaxies' && !loading && !error && data.selfPlanet !== undefined && <PersonalMapAnchor key={data.selfPlanet?.id ?? 'create'} planet={data.selfPlanet} origin={origin} />}
          {!canvasAvailable && (
            <p className={styles.fallback}>{t('fallback')}</p>
          )}
          {!loading && error && (
            <div className={styles.fallback} role="alert">
              {t(error)}
              {error !== 'signIn' && <button type="button" className={styles.next} onClick={() => setRevision(value => value + 1)}>{ta('retry')}</button>}
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
            <p className={styles.fallback}>{t(contextLayer ? `empty_${layer}` : mode === 'personal' ? 'personalEmpty' : 'empty')}</p>
          )}
        </section>}
        <aside
          id="star-map-sidebar"
          className={styles.sidebar}
          data-open={sidebarOpen}
          aria-label={t(browseLabel)}
        >
          <div className={styles.sidebarHeader}>
            <h2>{t(browseLabel)}</h2>
            <button
              type="button"
              className={styles.sidebarToggle}
              onClick={() => setSidebarOpen(false)}
            >
              {t('closeSidebar')}
            </button>
          </div>
          {listOnly && <div role={error ? 'alert' : 'status'} className={styles.listStatus}>
            {loading ? t('loading') : error ? t(error) : data.total === 0 ? t(contextLayer ? `empty_${layer}` : 'personalEmpty') : t(totalLabel, { count: data.total })}
            {!loading && error && <button type="button" className={styles.next} onClick={() => setRevision(value => value + 1)}>{ta('retry')}</button>}
          </div>}
          <ScrollRegion label={t(browseLabel)}>
            <nav className={styles.clusters} aria-label={t('chooseGroup')}>
              {clusters.map((group) => (
                <div key={group.id}>
                  <button
                    aria-pressed={focus === group.id}
                    aria-expanded={focus === group.id}
                    onClick={() =>
                      focus === group.id
                        ? (setFocus(null),
                          setSelectedId(null),
                          setCursor(null),
                          (view.current.zoom = 1))
                        : mode === 'galaxies'
                          ? (enter(group.id),
                            setSelectedId(group.id))
                          : enter(group.id)
                    }
                    style={
                      { '--cluster-color': group.color } as React.CSSProperties
                    }
                  >
                    <span className={styles.dot} />
                    <span>{groupLabel(group.id, group.name)}</span>
                    <span className={styles.clusterCaption}>
                      {t(data.groupScope === 'batch' ? 'constellationBatchCount' : contextLayer ? layer === 'galaxies' ? 'galaxyCount' : 'activityCount' : mode === 'galaxies' ? 'members' : 'planets', {
                        count: group.count,
                      })}
                    </span>
                  </button>
                  {(focus === group.id || (listOnly && !focus)) && (
                    <div
                      className={styles.nodeList}
                      aria-label={t(contextLayer ? layer === 'galaxies' ? 'chooseGalaxy' : 'chooseActivity' : mode === 'galaxies' ? 'chooseGalaxy' : 'choosePlanet')}
                    >
                      {(listOnly && !focus ? data.nodes.filter(node => node.groupId === group.id) : visibleNodes).map((node) => (
                        <button
                          key={node.id}
                          aria-pressed={selected?.id === node.id}
                          onClick={event => { event.currentTarget.focus({ preventScroll: true }); setSelectedId(node.id) }}
                        >
                          {mode === 'personal' && (!node.kind || node.kind === 'planet') ? <PersonAvatar key={node.avatarUrl} src={node.avatarUrl} name={node.displayName || node.name} size={28} /> : node.planetConfig && (
                            <PlanetAvatar
                              planetConfig={node.planetConfig}
                              size={28}
                            />
                          )}
                          <span className={styles.nodeIdentity}>
                            <span>{mode === 'personal' ? node.displayName || node.name : node.name}</span>
                            <PlanetRelationshipStatus relationship={node.relationship} />
                            {mode === 'personal' && <PersonalNodeRelations node={node} />}
                            {node.kind && node.kind !== 'planet' && <span>{t(`kind_${node.kind}`)}</span>}
                          </span>
                          {node.score !== undefined && (
                            <span className={styles.matchScore}>{t('score', { score: node.score })}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
            {cursor && <button className={styles.next} disabled={loading} onClick={() => { setCursor(null); setSelectedId(null) }}>{t('firstBatch')}</button>}
            {data.nextCursor && (
              <button
                className={styles.next}
                disabled={loading}
                onClick={() => {
                  setCursor(data.nextCursor)
                  setSelectedId(null)
                  if (mode === 'galaxies') {
                    setFocus(null)
                    view.current.zoom = 1
                  }
                }}
              >
                {t(mode === 'discover' ? 'loadMore' : 'nextBatch')}
              </button>
            )}
          </ScrollRegion>
        </aside>
          {selected && <MapObjectDialog label={selected.displayName || selected.name} kind={selected.kind ?? (mode === 'galaxies' ? 'galaxy' : 'planet')} onClose={() => setSelectedId(null)}>
            <div
              className={`${styles.card} ${styles.liveCard}`}
              aria-live="polite"
            >
              <div className={styles.nodeHeading}>
                {mode === 'personal' && (!selected.kind || selected.kind === 'planet') ? <PersonAvatar key={selected.avatarUrl} src={selected.avatarUrl} name={selected.displayName || selected.name} size={36} /> : selected.planetConfig && (
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
                <h2>{mode === 'personal' ? selected.displayName || selected.name : selected.name}</h2>
              </div>
              <p>{selected.tagline}</p>
              <PublicPlanetTags tags={selected.publicTags} />
              <PlanetRelationshipStatus relationship={selected.relationship} />
              {mode === 'personal' && <PersonalNodeRelations node={selected} />}
              {selected.score !== undefined && (
                <p>{t('score', { score: selected.score })}</p>
              )}
              {selected.memberCount !== undefined && (
                <p>{t('members', { count: selected.memberCount })}</p>
              )}
              {selected.date && <p>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(selected.date))}</p>}
              {selected.eventStatus && <p>{t(`activity_${selected.eventStatus.toLowerCase()}`)}</p>}
              {selected.userInterested && <p>{t('group_interested')}</p>}
              {selected.userAttendance && <p>{t(`attendance_${selected.userAttendance.toLowerCase()}`)}</p>}
              <Link href={mode !== 'galaxies' ? withExplorationOrigin(selected.href, origin) : selected.href}>
                {t(selected.kind === 'activity' ? 'openActivity' : selected.kind === 'galaxy' || mode === 'galaxies' ? 'openGalaxy' : 'openPlanet')}
              </Link>
              {mode !== 'galaxies' && selected.userId && (
                <div className={styles.planetActions} key={selected.id}>
                  <p>{t('privateRelationships')}</p>
                  <div className={styles.actionPair}>
                    <SavePlanetButton planetId={selected.id} initialSaved={selected.relationship?.saved} />
                    <FollowButton userId={selected.userId} />
                  </div>
                  <BeamButton userId={selected.userId} planetId={selected.id} hasFollowControl
                    conversationId={selected.relationship?.conversationId ?? undefined}
                    origin={origin} />
                </div>
              )}
            </div>
          </MapObjectDialog>}
      </div>
      {mode !== 'discover' && <p className={styles.mapNote}>
        {t(mode === 'personal' ? 'personalDecoration' : 'galaxyDecoration')}{' '}
        {t(contextLayer ? `scope_${layer}` : mode === 'galaxies' ? 'galaxyScope' : 'personalScope')}
      </p>}
    </div>
  )
}
