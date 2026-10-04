'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'
import styles from './star-map.module.css'

const COLORS = ['#ba9aff', '#68d8bd', '#e9c779', '#7babf5', '#e59bbd']
const CENTERS = [[-215, 65, 70], [155, -90, -45], [220, 115, 80], [-125, -145, -100], [0, 170, -60]]
const COUNTS = [720, 650, 570, 680, 600]
type Point = { x: number; y: number; z: number; group: number; size: number }
type Hit = { x: number; y: number; group: number }

function createPoints() {
  // Seeded decorative particles only; never represent users or real relationships.
  let seed = 817
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646 }
  const points: Point[] = []
  CENTERS.forEach(([cx, cy, cz], group) => {
    for (let i = 0; i < COUNTS[group]; i++) {
      const angle = random() * Math.PI * 2
      const r = Math.sqrt(random()) * 68
      const spiral = angle + r * 0.028
      points.push({ x: cx + Math.cos(spiral) * r, y: cy + Math.sin(spiral) * r * 0.65, z: cz + (random() - 0.5) * 78, group, size: random() > 0.985 ? 2.2 : 0.5 + random() * 0.8 })
    }
  })
  for (let i = 0; i < 650; i++) points.push({ x: (random() - 0.5) * 820, y: (random() - 0.5) * 620, z: (random() - 0.5) * 540, group: -1, size: 0.45 })
  return points
}
const POINTS = createPoints()

export default function StarMapPreview() {
  const t = useTranslations('starMapPreview')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hits = useRef<Hit[]>([])
  const view = useRef({ yaw: -0.16, pitch: -0.12, zoom: 1 })
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const [selected, setSelected] = useState(0)
  const [motion, setMotion] = useState<'system' | 'play' | 'pause'>('system')
  const [zoom, setZoom] = useState(1)
  const [resetKey, setResetKey] = useState(0)
  const [canvasAvailable, setCanvasAvailable] = useState(true)
  const reduced = useReducedMotionPreference()
  const paused = motion === 'pause' || (motion === 'system' && reduced)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) { queueMicrotask(() => setCanvasAvailable(false)); return }
    let frame = 0
    let width = 0
    let height = 0
    let visible = true
    let last = 0
    let disposed = false
    const project = (x: number, y: number, z: number) => {
      const { yaw, pitch, zoom: scale } = view.current
      const rx = x * Math.cos(yaw) + z * Math.sin(yaw)
      const rz = -x * Math.sin(yaw) + z * Math.cos(yaw)
      const ry = y * Math.cos(pitch) - rz * Math.sin(pitch)
      const depth = y * Math.sin(pitch) + rz * Math.cos(pitch)
      const perspective = 730 / (730 + depth)
      const fit = Math.min(width / 730, height / 560) * scale
      return { x: width / 2 + rx * fit * perspective, y: height / 2 + ry * fit * perspective, p: perspective, fit }
    }
    function render(time: number) {
      frame = 0
      if (disposed || !ctx || !canvas) return
      if (!visible || document.hidden) { last = 0; return }
      if (!paused && !drag.current) view.current.yaw += Math.min(time - (last || time), 45) * 0.000035
      last = time
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'
      const center = project(0, 0, 0)
      // Sparse flowing connections, concentrated on the selected cluster.
      POINTS.forEach((point, i) => {
        if (point.group < 0 || i % (point.group === selected ? 18 : 65) !== 0) return
        const end = project(point.x, point.y, point.z)
        const color = COLORS[point.group]
        const gradient = ctx.createLinearGradient(center.x, center.y, end.x, end.y)
        gradient.addColorStop(0, '#ffffff32')
        gradient.addColorStop(0.55, color + (point.group === selected ? '46' : '16'))
        gradient.addColorStop(1, color + '06')
        ctx.strokeStyle = gradient
        ctx.lineWidth = 0.6
        ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(end.x, end.y); ctx.stroke()
        if (!paused && point.group === selected) {
          const travel = ((time * 0.00015 + i * 0.013) % 1)
          ctx.fillStyle = color + 'ab'
          ctx.fillRect(center.x + (end.x - center.x) * travel, center.y + (end.y - center.y) * travel, 1.5, 1.5)
        }
      })
      POINTS.forEach((point) => {
        const p = project(point.x, point.y, point.z)
        const color = point.group < 0 ? '#9bafc7' : COLORS[point.group]
        ctx.fillStyle = color + (point.group === selected ? 'cd' : point.group < 0 ? '52' : '85')
        const size = Math.max(0.5, point.size * p.p * Math.min(p.fit, 1.4))
        ctx.fillRect(p.x, p.y, size, size)
        if (point.size > 2) {
          ctx.strokeStyle = color + '85'; ctx.lineWidth = 0.6
          ctx.beginPath(); ctx.moveTo(p.x - 4, p.y); ctx.lineTo(p.x + 4, p.y); ctx.moveTo(p.x, p.y - 4); ctx.lineTo(p.x, p.y + 4); ctx.stroke()
        }
      })
      hits.current = CENTERS.map(([x, y, z], group) => ({ ...project(x, y, z), group }))
      hits.current.forEach((p) => {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 24)
        glow.addColorStop(0, COLORS[p.group] + (p.group === selected ? '90' : '44')); glow.addColorStop(1, COLORS[p.group] + '00')
        ctx.fillStyle = glow; ctx.fillRect(p.x - 24, p.y - 24, 48, 48)
        ctx.fillStyle = COLORS[p.group]; ctx.beginPath(); ctx.arc(p.x, p.y, p.group === selected ? 3 : 2, 0, Math.PI * 2); ctx.fill()
      })
      const core = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 20)
      core.addColorStop(0, '#fff9'); core.addColorStop(0.15, '#e2d8ff65'); core.addColorStop(1, '#ffffff00')
      ctx.fillStyle = core; ctx.fillRect(center.x - 20, center.y - 20, 40, 40)
      ctx.globalCompositeOperation = 'source-over'
      if (!paused) frame = requestAnimationFrame(render)
    }
    const redraw = () => { if (!frame && !disposed) frame = requestAnimationFrame(render) }
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width; height = rect.height
      const ratio = Math.min(window.devicePixelRatio || 1, width < 768 ? 1 : 1.5)
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); redraw()
    }
    const visibility = () => { if (!document.hidden) { last = 0; redraw() } }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { last = 0; redraw() } })
    intersection.observe(canvas)
    canvas.addEventListener('pointermove', redraw, { passive: true })
    document.addEventListener('visibilitychange', visibility)
    resize()
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect()
      canvas.removeEventListener('pointermove', redraw); document.removeEventListener('visibilitychange', visibility)
    }
  }, [paused, selected, zoom, resetKey])

  function changeZoom(amount: number) {
    view.current.zoom = Math.max(0.65, Math.min(1.8, view.current.zoom + amount))
    setZoom(view.current.zoom)
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><ArrowLeft size={16} /><span>Gravity Souls</span></Link>
        <LanguageSwitcher variant="compact" persistToAccount={false} />
      </header>
      <div className={styles.heading}><div><p className={styles.eyebrow}>{t('eyebrow')}</p><h1>{t('title')}</h1></div><p className={styles.disclaimer}>{t('demo')}</p></div>
      <section className={styles.stage} aria-label={t('title')}>
        <div className={styles.stageTop}><span>{t('constellations', { count: 5 })}</span><span>{t('hint')}</span></div>
        <canvas ref={canvasRef} className={styles.canvas} aria-label={t('canvasLabel')}
          onPointerDown={(e) => { if (!e.isPrimary) return; e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, moved: false } }}
          onPointerMove={(e) => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; const dy = e.clientY - d.y; if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true; view.current.yaw += dx * 0.004; view.current.pitch = Math.max(-0.7, Math.min(0.7, view.current.pitch + dy * 0.003)); d.x = e.clientX; d.y = e.clientY }}
          onPointerUp={(e) => {
            if (drag.current && !drag.current.moved) { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; const nearest = hits.current.toSorted((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]; if (nearest && Math.hypot(nearest.x - x, nearest.y - y) < 55) setSelected(nearest.group) }
            drag.current = null
          }} onPointerCancel={() => { drag.current = null }} />
        {!canvasAvailable && <p className={styles.fallback}>{t('fallback')}</p>}
        <div className={styles.controls}>
          <button onClick={() => setMotion(paused ? 'play' : 'pause')} aria-label={paused ? t('play') : t('pause')}>{paused ? <Play size={15} /> : <Pause size={15} />}<span>{paused ? t('play') : t('pause')}</span></button>
          <button onClick={() => changeZoom(-0.15)} aria-label={t('zoomOut')} disabled={zoom <= 0.65}><Minus size={16} /></button>
          <button onClick={() => changeZoom(0.15)} aria-label={t('zoomIn')} disabled={zoom >= 1.8}><Plus size={16} /></button>
          <button onClick={() => { view.current = { yaw: -0.16, pitch: -0.12, zoom: 1 }; setZoom(1); setSelected(0); setMotion('system'); setResetKey((key) => key + 1) }} aria-label={t('reset')}><RotateCcw size={15} /></button>
        </div>
        <aside className={styles.card} aria-live="polite" style={{ borderTopColor: COLORS[selected] }}>
          <p className={styles.eyebrow}>{t('selected')}</p><h2>{t(`name${selected}`)}</h2><p>{t(`description${selected}`)}</p><span className={styles.cardFooter}>{t('previewOnly')}</span>
        </aside>
      </section>
      <nav className={styles.clusters} aria-label={t('choose')}>
        {COLORS.map((color, index) => <button key={color} aria-pressed={selected === index} onClick={() => setSelected(index)} style={{ '--cluster-color': color } as React.CSSProperties}><span className={styles.dot} /><span>{t(`name${index}`)}</span><span className={styles.clusterCaption}>{t(`tag${index}`)}</span></button>)}
      </nav>
      <footer className={styles.footer}><p>{t('next')}</p><Link href="/galaxies">{t('explore')}</Link></footer>
    </main>
  )
}
