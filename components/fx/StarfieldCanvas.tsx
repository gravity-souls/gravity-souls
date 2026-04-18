'use client'

import { useEffect, useRef } from 'react'

// --- Star definition ----------------------------------------------------------

interface Star {
  x: number
  y: number
  size: number
  colorBase: string   // e.g. "255,255,255"
  baseOpacity: number
  opacity: number
  twinkleSpeed: number
  twinkleOffset: number
  vx: number
  vy: number
  hasCross: boolean   // large stars get a diffraction cross
}

// Four colour families  -  white, lavender, violet, pale-cyan
const COLOR_BASES = [
  '255,255,255',
  '224,213,255',
  '167,139,250',
  '186,230,253',
]

function makeStar(w: number, h: number): Star {
  const roll = Math.random()
  // 60% small · 30% medium · 10% large
  const size =
    roll < 0.60 ? 0.4 + Math.random() * 0.5
    : roll < 0.90 ? 0.9 + Math.random() * 0.6
    :               1.5 + Math.random() * 0.8

  const baseOpacity = 0.25 + Math.random() * 0.65

  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size,
    colorBase: COLOR_BASES[Math.floor(Math.random() * COLOR_BASES.length)],
    baseOpacity,
    opacity: baseOpacity,
    twinkleSpeed: 0.0002 + Math.random() * 0.0009,
    twinkleOffset: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 0.012,
    vy: -0.008 - Math.random() * 0.018,
    hasCross: size > 1.4,
  }
}

// --- Component ----------------------------------------------------------------

export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId = 0
    let stars: Star[] = []
    let W = 0
    let H = 0

    function resize() {
      W = window.innerWidth
      H = window.innerHeight
      canvas!.width  = W
      canvas!.height = H
      stars = Array.from({ length: 190 }, () => makeStar(W, H))
    }

    function drawCross(x: number, y: number, size: number, color: string, opacity: number) {
      const len = size * 4
      const fade = opacity * 0.35
      // Horizontal arm
      const hGrad = ctx!.createLinearGradient(x - len, y, x + len, y)
      hGrad.addColorStop(0, `rgba(${color},0)`)
      hGrad.addColorStop(0.5, `rgba(${color},${fade.toFixed(2)})`)
      hGrad.addColorStop(1, `rgba(${color},0)`)
      ctx!.beginPath()
      ctx!.moveTo(x - len, y)
      ctx!.lineTo(x + len, y)
      ctx!.strokeStyle = hGrad
      ctx!.lineWidth = 0.8
      ctx!.stroke()
      // Vertical arm
      const vGrad = ctx!.createLinearGradient(x, y - len, x, y + len)
      vGrad.addColorStop(0, `rgba(${color},0)`)
      vGrad.addColorStop(0.5, `rgba(${color},${fade.toFixed(2)})`)
      vGrad.addColorStop(1, `rgba(${color},0)`)
      ctx!.beginPath()
      ctx!.moveTo(x, y - len)
      ctx!.lineTo(x, y + len)
      ctx!.strokeStyle = vGrad
      ctx!.lineWidth = 0.8
      ctx!.stroke()
    }

    function tick(t: number) {
      ctx!.clearRect(0, 0, W, H)

      for (const s of stars) {
        // Twinkling  -  smooth sin oscillation
        s.opacity = Math.max(
          0.05,
          s.baseOpacity + Math.sin(t * s.twinkleSpeed + s.twinkleOffset) * 0.3,
        )

        // Slow drift
        s.x += s.vx
        s.y += s.vy

        // Wrap
        if (s.y < -4) s.y = H + 4
        if (s.x < -4) s.x = W + 4
        if (s.x > W + 4) s.x = -4

        const op = Math.min(1, s.opacity)

        // Core dot
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${s.colorBase},${op.toFixed(2)})`
        ctx!.fill()

        // Soft glow halo for medium/large stars
        if (s.size > 0.8) {
          const haloRadius = s.size * 4
          const g = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, haloRadius)
          g.addColorStop(0, `rgba(${s.colorBase},${(op * 0.28).toFixed(2)})`)
          g.addColorStop(1, `rgba(${s.colorBase},0)`)
          ctx!.beginPath()
          ctx!.arc(s.x, s.y, haloRadius, 0, Math.PI * 2)
          ctx!.fillStyle = g
          ctx!.fill()
        }

        // Diffraction cross for the brightest stars
        if (s.hasCross) {
          drawCross(s.x, s.y, s.size, s.colorBase, op)
        }
      }

      animId = requestAnimationFrame(tick)
    }

    resize()
    window.addEventListener('resize', resize)
    animId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
      aria-hidden="true"
    />
  )
}
