'use client'

import { useEffect, useRef } from 'react'

export interface CosmicGlobeProps {
  className?: string
  style?: React.CSSProperties
}

// ── Texture factories — browser-only ─────────────────────────────────────────

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

      // ── Canvas + renderer ───────────────────────────────────────────────────
      // document.createElement avoids the createElementNS canvas that fails on
      // this GPU/driver combination. stencil:false matches the browser's default
      // context attributes (stencil defaults to false), which is what allows the
      // WebGL2 context to be created successfully on this machine.
      const canvas = document.createElement('canvas')
      canvas.style.display = 'block'
      ownedCanvas = canvas
      m.appendChild(canvas)

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

      // ── Scene + camera ──────────────────────────────────────────────────────
      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, m.clientWidth / m.clientHeight, 0.01, 60)
      camera.position.z = 3.5

      function resize() {
        const w = m.clientWidth
        const h = m.clientHeight
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

      // ── Particle positions ──────────────────────────────────────────────────
      const N_SURFACE    = 7_000
      const N_EQUATORIAL = 2_500
      const N_INNER      = 1_500
      const N_TOTAL      = N_SURFACE + N_EQUATORIAL + N_INNER

      // Three position buffers: resting globe, torus target, live (interpolated).
      const globePos = new Float32Array(N_TOTAL * 3)
      const torusPos = new Float32Array(N_TOTAL * 3)
      const livePos  = new Float32Array(N_TOTAL * 3)
      const colors   = new Float32Array(N_TOTAL * 3)

      // ── Globe positions (resting state) ─────────────────────────────────────
      let p = 0

      // Surface — uniform area sampling on sphere shell
      for (let i = 0; i < N_SURFACE; i++) {
        const phi   = Math.acos(1 - 2 * Math.random())
        const theta = 2 * Math.PI * Math.random()
        const r     = 1.0 + (Math.random() - 0.5) * 0.08
        globePos[p]     = r * Math.sin(phi) * Math.cos(theta)
        globePos[p + 1] = r * Math.cos(phi)
        globePos[p + 2] = r * Math.sin(phi) * Math.sin(theta)
        const b = 0.45 + 0.55 * Math.random()
        colors[p] = colors[p + 1] = colors[p + 2] = b
        p += 3
      }

      // Equatorial — concentrated within |y| < 0.30 on sphere shell
      for (let i = 0; i < N_EQUATORIAL; i++) {
        const theta = 2 * Math.PI * Math.random()
        const y     = (Math.random() - 0.5) * 0.60
        const rXZ   = Math.sqrt(Math.max(0, 1 - y * y))
        const j     = 1.0 + (Math.random() - 0.5) * 0.14
        globePos[p]     = rXZ * Math.cos(theta) * j
        globePos[p + 1] = y * j
        globePos[p + 2] = rXZ * Math.sin(theta) * j
        const b = 0.55 + 0.45 * Math.random()
        colors[p] = colors[p + 1] = colors[p + 2] = b
        p += 3
      }

      // Inner — radially-weighted volume; additive overlap creates white core
      for (let i = 0; i < N_INNER; i++) {
        const phi   = Math.acos(1 - 2 * Math.random())
        const theta = 2 * Math.PI * Math.random()
        const r     = Math.pow(Math.random(), 0.45) * 0.88
        globePos[p]     = r * Math.sin(phi) * Math.cos(theta)
        globePos[p + 1] = r * Math.cos(phi)
        globePos[p + 2] = r * Math.sin(phi) * Math.sin(theta)
        const b = 0.65 + 0.35 * Math.random()
        colors[p] = colors[p + 1] = colors[p + 2] = b
        p += 3
      }

      // ── Torus target positions ───────────────────────────────────────────────
      // Torus parameters: major radius R, tube radius r_tube, vertical squish.
      // squish < 1 flattens the tube vertically so the ring reads as organic,
      // not mathematically perfect.
      const R_main = 0.70
      const r_tube = 0.28
      const squish = 0.78

      let q = 0

      // Surface group → outer torus shell with fuzz
      for (let i = 0; i < N_SURFACE; i++) {
        const phi   = 2 * Math.PI * Math.random()
        const theta = 2 * Math.PI * Math.random()
        const fuzz  = (Math.random() - 0.5) * 0.10
        const rr    = R_main + r_tube * Math.cos(phi) + fuzz
        torusPos[q]     = rr * Math.cos(theta)
        torusPos[q + 1] = r_tube * Math.sin(phi) * squish
        torusPos[q + 2] = rr * Math.sin(theta)
        q += 3
      }

      // Equatorial group → bright outer ring (phi concentrated near 0).
      // phi ≈ 0 puts particles at the outer equatorial edge of the tube,
      // forming the dense luminous band of the torus.
      for (let i = 0; i < N_EQUATORIAL; i++) {
        const phi   = (Math.random() - 0.5) * 0.90   // ±~26° from equatorial
        const theta = 2 * Math.PI * Math.random()
        const fuzz  = (Math.random() - 0.5) * 0.06
        const rr    = R_main + r_tube * Math.cos(phi) + fuzz
        torusPos[q]     = rr * Math.cos(theta)
        torusPos[q + 1] = r_tube * Math.sin(phi) * squish
        torusPos[q + 2] = rr * Math.sin(theta)
        q += 3
      }

      // Inner group → secondary inner ring near the torus hole.
      // In globe state these particles fill the core; during the morph they
      // flow outward to a smaller ring, making the center appear more luminous.
      const R_inner = 0.40
      const r_inner = 0.20
      for (let i = 0; i < N_INNER; i++) {
        const phi   = 2 * Math.PI * Math.random()
        const theta = 2 * Math.PI * Math.random()
        const fuzz  = (Math.random() - 0.5) * 0.06
        const rr    = R_inner + r_inner * Math.cos(phi) + fuzz
        torusPos[q]     = rr * Math.cos(theta)
        torusPos[q + 1] = r_inner * Math.sin(phi) * squish
        torusPos[q + 2] = rr * Math.sin(theta)
        q += 3
      }

      // livePos starts as a copy of globePos
      livePos.set(globePos)

      // ── Geometry ─────────────────────────────────────────────────────────────
      const sphereGeo = new THREE.BufferGeometry()
      const posAttr   = new THREE.BufferAttribute(livePos, 3)
      posAttr.usage   = THREE.DynamicDrawUsage   // GL_DYNAMIC_DRAW — optimises for per-frame uploads
      sphereGeo.setAttribute('position', posAttr)
      sphereGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
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

      // ── Central bloom sprite ─────────────────────────────────────────────────
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

      // ── Starfield ─────────────────────────────────────────────────────────────
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

      // ── Timer ─────────────────────────────────────────────────────────────────
      // THREE.Timer replaces the deprecated THREE.Clock (deprecated r183).
      // timer.update(timestamp) must be called before getDelta/getElapsed each frame.
      const timer = new THREE.Timer()
      timer.connect(document)
      disposables.push({ dispose: () => timer.disconnect() })

      // ── Animation loop ────────────────────────────────────────────────────────
      // MORPH_PERIOD: one full globe → torus → globe cycle in seconds.
      // Cosine easing gives a natural dwell at each extreme and a smooth transition.
      const MORPH_PERIOD = 30

      function animate(timestamp: number) {
        if (stopped) return
        rafId = requestAnimationFrame(animate)

        timer.update(timestamp)
        const t = timer.getElapsed()

        // ── Morph factor (0 = globe, 1 = torus) ─────────────────────────────
        const morphFactor = 0.5 - 0.5 * Math.cos((t / MORPH_PERIOD) * Math.PI * 2)

        // Linearly interpolate every particle toward its torus target
        for (let i = 0; i < N_TOTAL * 3; i++) {
          livePos[i] = globePos[i] + (torusPos[i] - globePos[i]) * morphFactor
        }
        posAttr.needsUpdate = true

        // ── Motion ──────────────────────────────────────────────────────────
        sphere.rotation.y = t * 0.079
        const breath = 1 + 0.025 * Math.sin(t * 0.44)
        sphere.scale.setScalar(breath)

        // Bloom expands and brightens as torus opens — center appears luminous
        bloom.scale.setScalar((1.85 + 0.60 * morphFactor) * breath)
        bloomMat.opacity = 0.50 + 0.30 * morphFactor

        // ── Color ────────────────────────────────────────────────────────────
        // Hue cycles blue ↔ cyan; nudge toward cyan during torus phase
        const hue = 0.570 + 0.048 * Math.sin(t * 0.14) - 0.018 * morphFactor
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
