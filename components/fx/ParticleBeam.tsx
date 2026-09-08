'use client'

import { useEffect, useRef } from 'react'

import { useClientReady, useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Point { x: number; y: number }

interface Particle {
  t:         number
  offset:    number
  radius:    number
  speedMult: number
}

export interface ParticleBeamProps {
  from:       Point
  to:         Point
  playing?:   boolean
  color?:     string
  speed?:     number
  density?:   number
  arcHeight?: number
  className?: string
  style?:     React.CSSProperties
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m
    ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)]
    : [232, 226, 213]
}

function quadBezier(t: number, p0: Point, p1: Point, p2: Point): Point {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  }
}

function arcControl(from: Point, to: Point, arcHeight: number): Point {
  const mx  = (from.x + to.x) / 2
  const my  = (from.y + to.y) / 2
  const dx  = to.x - from.x
  const dy  = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  return {
    x: mx + (-dy / len) * arcHeight,
    y: my + ( dx / len) * arcHeight + Math.abs(arcHeight) * 0.25,
  }
}

function opacityAt(t: number): number {
  if (t < 0.12) return (t / 0.12) * 0.72
  if (t > 0.78) return ((1 - t) / 0.22) * 0.72
  return 0.72
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ParticleBeam({
  from,
  to,
  playing    = true,
  color      = '#e8e2d5',
  speed      = 1.4,
  density    = 35,
  arcHeight  = 30,
  className,
  style,
}: ParticleBeamProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const dimsRef      = useRef({ width: 0, height: 0 })
  const playingRef   = useRef(playing)

  const mounted = useClientReady()
  const reducedMotion = useReducedMotionPreference()

  // Keep playingRef in sync without restarting the animation loop.
  useEffect(() => { playingRef.current = playing }, [playing])

  // ResizeObserver: keep canvas size and DPR transform current. Runs regardless
  // of reduced-motion so the static frame below (drawn once, no animation) is
  // still sized and drawn correctly rather than sitting at 0x0.
  useEffect(() => {
    if (!mounted) return
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    function resize() {
      // Viewport-aware cap, matching CosmicGlobe.tsx's split (1 on narrow/mobile
      // screens, 1.5 on desktop) rather than a flat devicePixelRatio-capped-at-2.
      const narrow         = window.matchMedia('(max-width: 767px)').matches
      const dpr            = Math.min(window.devicePixelRatio || 1, narrow ? 1 : 1.5)
      const { width, height } = container!.getBoundingClientRect()
      dimsRef.current     = { width, height }
      canvas!.width       = Math.round(width  * dpr)
      canvas!.height      = Math.round(height * dpr)
      canvas!.style.width  = `${width}px`
      canvas!.style.height = `${height}px`
      // setTransform replaces the matrix (safe on repeated resize; ctx.scale would accumulate).
      canvas!.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  }, [mounted])

  // Reduced motion: render a single static frame (a few particles frozen along
  // the arc) instead of nothing — "static first, no silent empty render."
  useEffect(() => {
    if (!mounted || !reducedMotion) return
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function draw() {
      const { width, height } = dimsRef.current
      if (!width || !height) return
      ctx!.clearRect(0, 0, width, height)
      const [cr, cg, cb] = hexToRgb(color)
      const pr = Math.round(0.85 * 255 + 0.15 * cr)
      const pg = Math.round(0.85 * 252 + 0.15 * cg)
      const pb = Math.round(0.85 * 248 + 0.15 * cb)
      ctx!.fillStyle = `rgb(${pr}, ${pg}, ${pb})`
      const ctrl = arcControl(from, to, arcHeight)
      const STATIC_POINTS = 7
      for (let i = 0; i < STATIC_POINTS; i++) {
        const t = (i + 0.5) / STATIC_POINTS
        const pos = quadBezier(t * t, from, ctrl, to)
        ctx!.globalAlpha = opacityAt(t)
        ctx!.beginPath()
        ctx!.arc(pos.x, pos.y, 0.7, 0, Math.PI * 2)
        ctx!.fill()
      }
      ctx!.globalAlpha = 1
    }

    // The resize effect above runs first and populates dimsRef synchronously
    // on mount, but guard with a rAF in case this effect fires before it.
    const raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [mounted, reducedMotion, from.x, from.y, to.x, to.y, color, arcHeight])

  // Animation loop. Restarts only when beam geometry or rendering props change.
  useEffect(() => {
    if (!mounted || reducedMotion) return
    const canvas    = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')!
    if (!ctx) return

    // Tinted near-white: 85% white + 15% hue.
    const [cr, cg, cb] = hexToRgb(color)
    const pr        = Math.round(0.85 * 255 + 0.15 * cr)
    const pg        = Math.round(0.85 * 252 + 0.15 * cg)
    const pb        = Math.round(0.85 * 248 + 0.15 * cb)
    const fillColor = `rgb(${pr}, ${pg}, ${pb})`

    // Static beam geometry — precomputed once; only changes when props change (which restarts this effect).
    const ctrl  = arcControl(from, to, arcHeight)
    const dx    = to.x - from.x
    const dy    = to.y - from.y
    const len   = Math.hypot(dx, dy) || 1
    const perpX = -dy / len
    const perpY =  dx / len

    const particles: Particle[] = []
    let rafId:      number
    let lastTime   = 0
    let spawnAcc   = 0
    let isOnscreen = true
    const io = new IntersectionObserver(([entry]) => { isOnscreen = entry.isIntersecting })
    io.observe(container)

    function frame(now: number) {
      rafId = requestAnimationFrame(frame)
      if (document.hidden || !isOnscreen) return

      // Skip the first frame entirely to avoid a capped-dt spike from lastTime === 0.
      const dt = lastTime === 0 ? 0 : Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      const { width, height } = dimsRef.current
      if (width === 0 || height === 0) return

      // Fade existing pixels toward transparent rather than toward any color.
      // destination-out reduces each pixel's alpha by (source alpha) per frame.
      // At 0.15 per frame (≈60 fps) a particle's ghost decays to ~10% in ~25 frames (~400 ms).
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)'
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'

      if (playingRef.current) {
        spawnAcc += dt * density
        while (spawnAcc >= 1) {
          particles.push({
            t:         0,
            offset:    (Math.random() - 0.5) * 14,
            radius:    0.4 + Math.random() * 0.8,
            speedMult: 0.82 + Math.random() * 0.36,
          })
          spawnAcc -= 1
        }
      }

      ctx.fillStyle = fillColor

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.t += (dt / speed) * p.speedMult
        if (p.t >= 1) { particles.splice(i, 1); continue }

        const pos    = quadBezier(p.t * p.t, from, ctrl, to)
        const spread = Math.sin(p.t * Math.PI)
        const px     = pos.x + perpX * p.offset * spread
        const py     = pos.y + perpY * p.offset * spread

        ctx.globalAlpha = opacityAt(p.t)
        ctx.beginPath()
        ctx.arc(px, py, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
    }

    rafId = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(rafId); io.disconnect() }
  }, [mounted, reducedMotion, from.x, from.y, to.x, to.y, color, speed, density, arcHeight])

  // Reduced motion renders the static frame drawn above instead of nothing —
  // this is a decorative/non-primary effect (only ever used on the fx demo
  // page today), so no opt-in-to-animate control is offered here.
  if (!mounted) return null

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
