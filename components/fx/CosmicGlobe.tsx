'use client'

import { useEffect, useRef } from 'react'

export interface CosmicGlobeProps {
  className?: string
  style?: React.CSSProperties
}

// ── Texture factories — browser-only, called inside useEffect ─────────────────

function makeParticleTex(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0,    'rgba(255,255,255,1.00)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.65, 'rgba(255,255,255,0.20)')
  g.addColorStop(1.0,  'rgba(255,255,255,0.00)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  return c
}

function makeBloomTex(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  g.addColorStop(0,    'rgba(255,255,255,0.50)')
  g.addColorStop(0.12, 'rgba(210,235,255,0.28)')
  g.addColorStop(0.35, 'rgba(120,185,255,0.10)')
  g.addColorStop(1.0,  'rgba(0,0,0,0.00)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 256)
  return c
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CosmicGlobe({ className, style }: CosmicGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let stopped     = false
    let rafId       = 0
    let ownedCanvas: HTMLCanvasElement | null = null
    const disposables: { dispose(): void }[] = []

    async function init() {
      const THREE = await import('three')
      if (stopped) return

      const m = mount!

      // ── Canvas ──────────────────────────────────────────────────────────────
      // Use document.createElement (not Three.js's internal createElementNS) so
      // we can control the canvas element's namespace and avoid context creation
      // failures in some browser environments.
      const canvas = document.createElement('canvas')
      canvas.style.display = 'block'
      ownedCanvas = canvas
      m.appendChild(canvas)

      console.log('[CosmicGlobe] mount:', m.clientWidth, '×', m.clientHeight)

      // ── Renderer ────────────────────────────────────────────────────────────
      // Root cause of the original "Error creating WebGL context":
      // Three.js requests stencil:true by default, which fails on this GPU/driver.
      // The default canvas.getContext('webgl2') (stencil:false by default) succeeds.
      // Fix: pass stencil:false to prevent Three.js from requesting the stencil buffer.
      let renderer: import('three').WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false })
      } catch (e) {
        console.error('[CosmicGlobe] renderer failed:', e)
        canvas.remove()
        ownedCanvas = null
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x040A18, 1)
      disposables.push(renderer)

      // ── Scene + Camera ──────────────────────────────────────────────────────
      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, m.clientWidth / m.clientHeight, 0.01, 60)
      camera.position.z = 3.5

      function resize() {
        const w = m.clientWidth
        const h = m.clientHeight
        console.log('[CosmicGlobe] resize:', w, '×', h)
        if (w === 0 || h === 0) return
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(m)
      disposables.push({ dispose: () => ro.disconnect() })

      // ── Particle texture ────────────────────────────────────────────────────
      const particleTex = new THREE.CanvasTexture(makeParticleTex())
      disposables.push(particleTex)

      // ── Particle geometry ───────────────────────────────────────────────────
      const N_SURFACE    = 7_000
      const N_EQUATORIAL = 2_500
      const N_INNER      = 1_500
      const N_TOTAL      = N_SURFACE + N_EQUATORIAL + N_INNER

      const positions = new Float32Array(N_TOTAL * 3)
      const colors    = new Float32Array(N_TOTAL * 3)
      let ptr = 0

      for (let i = 0; i < N_SURFACE; i++) {
        const phi   = Math.acos(1 - 2 * Math.random())
        const theta = 2 * Math.PI * Math.random()
        const r     = 1.0 + (Math.random() - 0.5) * 0.08
        positions[ptr]     = r * Math.sin(phi) * Math.cos(theta)
        positions[ptr + 1] = r * Math.cos(phi)
        positions[ptr + 2] = r * Math.sin(phi) * Math.sin(theta)
        const b = 0.45 + 0.55 * Math.random()
        colors[ptr] = colors[ptr + 1] = colors[ptr + 2] = b
        ptr += 3
      }

      for (let i = 0; i < N_EQUATORIAL; i++) {
        const theta = 2 * Math.PI * Math.random()
        const y     = (Math.random() - 0.5) * 0.60
        const rXZ   = Math.sqrt(Math.max(0, 1 - y * y))
        const j     = 1.0 + (Math.random() - 0.5) * 0.14
        positions[ptr]     = rXZ * Math.cos(theta) * j
        positions[ptr + 1] = y * j
        positions[ptr + 2] = rXZ * Math.sin(theta) * j
        const b = 0.55 + 0.45 * Math.random()
        colors[ptr] = colors[ptr + 1] = colors[ptr + 2] = b
        ptr += 3
      }

      for (let i = 0; i < N_INNER; i++) {
        const phi   = Math.acos(1 - 2 * Math.random())
        const theta = 2 * Math.PI * Math.random()
        const r     = Math.pow(Math.random(), 0.45) * 0.88
        positions[ptr]     = r * Math.sin(phi) * Math.cos(theta)
        positions[ptr + 1] = r * Math.cos(phi)
        positions[ptr + 2] = r * Math.sin(phi) * Math.sin(theta)
        const b = 0.65 + 0.35 * Math.random()
        colors[ptr] = colors[ptr + 1] = colors[ptr + 2] = b
        ptr += 3
      }

      const sphereGeo = new THREE.BufferGeometry()
      sphereGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      sphereGeo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))
      disposables.push(sphereGeo)

      const sphereMat = new THREE.PointsMaterial({
        size:            0.016,
        map:             particleTex,
        sizeAttenuation: true,
        blending:        THREE.AdditiveBlending,
        depthWrite:      false,
        transparent:     true,
        vertexColors:    true,
      })
      disposables.push(sphereMat)

      const sphere = new THREE.Points(sphereGeo, sphereMat)
      sphere.rotation.x = 0.20
      scene.add(sphere)

      // ── Central bloom sprite ────────────────────────────────────────────────
      const bloomTex = new THREE.CanvasTexture(makeBloomTex())
      disposables.push(bloomTex)

      const bloomMat = new THREE.SpriteMaterial({
        map:         bloomTex,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        transparent: true,
        opacity:     0.50,
      })
      disposables.push(bloomMat)

      const bloom = new THREE.Sprite(bloomMat)
      bloom.scale.setScalar(1.85)
      scene.add(bloom)

      // ── Starfield ───────────────────────────────────────────────────────────
      const N_STARS = 280
      const starPos = new Float32Array(N_STARS * 3)
      for (let i = 0; i < N_STARS; i++) {
        const phi   = Math.acos(1 - 2 * Math.random())
        const theta = 2 * Math.PI * Math.random()
        const r     = 10 + Math.random() * 12
        starPos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
        starPos[i * 3 + 1] = r * Math.cos(phi)
        starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      }
      const starGeo = new THREE.BufferGeometry()
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
      disposables.push(starGeo)

      const starMat = new THREE.PointsMaterial({
        size:            0.09,
        color:           new THREE.Color('#BDD4F0'),
        sizeAttenuation: true,
        transparent:     true,
        opacity:         0.72,
        depthWrite:      false,
      })
      disposables.push(starMat)
      scene.add(new THREE.Points(starGeo, starMat))

      // ── Animation loop ──────────────────────────────────────────────────────
      // THREE.Timer replaces the deprecated THREE.Clock (deprecated r183, removed r184).
      // timer.update(timestamp) must be called each frame before querying elapsed time.
      const timer = new THREE.Timer()
      timer.connect(document)
      disposables.push({ dispose: () => timer.disconnect() })

      console.log('[CosmicGlobe] starting animation loop')

      function animate(timestamp: number) {
        if (stopped) return
        rafId = requestAnimationFrame(animate)

        timer.update(timestamp)
        const t = timer.getElapsed()

        sphere.rotation.y = t * 0.079
        const breath = 1 + 0.025 * Math.sin(t * 0.44)
        sphere.scale.setScalar(breath)
        bloom.scale.setScalar(1.85 * breath)
        const hue = 0.570 + 0.048 * Math.sin(t * 0.14)
        sphereMat.color.setHSL(hue, 0.88, 0.60)

        renderer.render(scene, camera)
      }

      rafId = requestAnimationFrame(animate)
    }

    void init().catch((err: unknown) => {
      if (!stopped) console.error('[CosmicGlobe] init failed:', err)
    })

    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
      disposables.forEach((d) => d.dispose())
      ownedCanvas?.remove()
    }
  }, [])

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
    />
  )
}
