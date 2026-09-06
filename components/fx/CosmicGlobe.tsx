'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { createMotionLoop } from '@/lib/motion-loop'

export type GlobeStep = 0 | 1 | 2
export type GlobeStatus = 'loading' | 'ready' | 'unavailable'
export interface CosmicGlobeProps {
  step?: GlobeStep
  paused?: boolean
  allowMotion?: boolean
  resetKey?: number
  onStatusChange?: (status: GlobeStatus) => void
  className?: string
  style?: CSSProperties
}

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

export default function CosmicGlobe({ step = 0, paused = false, allowMotion = false, resetKey = 0, onStatusChange, className, style }: CosmicGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const controls = useRef({ step, paused, allowMotion, resetKey, onStatusChange })
  const loopRef = useRef<ReturnType<typeof createMotionLoop> | null>(null)
  const contextAvailable = useRef(true)

  useEffect(() => {
    const reset = controls.current.resetKey !== resetKey
    controls.current = { step, paused, allowMotion, resetKey, onStatusChange }
    if (reset) loopRef.current?.reset()
    loopRef.current?.setPaused(paused || !contextAvailable.current)
    loopRef.current?.setMotionOverride(allowMotion)
    loopRef.current?.invalidate()
  }, [step, paused, allowMotion, resetKey, onStatusChange])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let stopped = false
    let contextLost = false
    let canvas: HTMLCanvasElement | null = null
    let pointerX = 0
    let pointerY = 0
    let dragging = false
    const disposables: { dispose(): void }[] = []
    const report = (status: GlobeStatus) => { if (!stopped) controls.current.onStatusChange?.(status) }

    function clearPointer() { pointerX = 0; pointerY = 0; dragging = false }
    function move(event: PointerEvent) {
      if (event.pointerType !== 'mouse' && !dragging) return
      const bounds = mount!.getBoundingClientRect()
      pointerX = ((event.clientX - bounds.left) / Math.max(bounds.width, 1) - 0.5) * 2
      pointerY = ((event.clientY - bounds.top) / Math.max(bounds.height, 1) - 0.5) * 2
    }
    function down(event: PointerEvent) { if (event.isPrimary) { dragging = true; move(event) } }
    function visibility() { if (document.hidden) clearPointer() }
    mount.addEventListener('pointermove', move, { passive: true })
    mount.addEventListener('pointerdown', down, { passive: true })
    mount.addEventListener('pointerup', clearPointer)
    mount.addEventListener('pointercancel', clearPointer)
    mount.addEventListener('pointerleave', clearPointer)
    document.addEventListener('visibilitychange', visibility)
    disposables.push({ dispose() {
      mount!.removeEventListener('pointermove', move)
      mount!.removeEventListener('pointerdown', down)
      mount!.removeEventListener('pointerup', clearPointer)
      mount!.removeEventListener('pointercancel', clearPointer)
      mount!.removeEventListener('pointerleave', clearPointer)
      document.removeEventListener('visibilitychange', visibility)
    } })

    async function init() {
      const THREE = await import('three')
      if (stopped) return
      const m = mount!
      const narrow = window.matchMedia('(max-width: 767px)').matches
      canvas = document.createElement('canvas')
      canvas.style.display = 'block'
      canvas.setAttribute('aria-hidden', 'true')
      m.appendChild(canvas)
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, alpha: true })
      renderer.setClearColor(0x040a18, 0)
      disposables.push(renderer)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 60)
      function resize() {
        const width = m.clientWidth, height = m.clientHeight
        if (!width || !height) return
        const small = window.matchMedia('(max-width: 767px)').matches
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1 : 1.5))
        renderer.setSize(width, height)
        camera.aspect = width / height
        // Fit the expanded silhouette along the limiting axis, including portrait screens.
        const verticalFov = camera.fov * Math.PI / 180
        const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect)
        camera.position.z = 1.65 / Math.sin(Math.min(verticalFov, horizontalFov) / 2)
        camera.updateProjectionMatrix()
        loopRef.current?.invalidate()
      }
      resize()
      const observer = new ResizeObserver(resize)
      observer.observe(m)
      disposables.push({ dispose: () => observer.disconnect() })
      const particleTex = new THREE.CanvasTexture(makeParticleTex())
      // Canvas 2D draws in sRGB; mark explicitly so Three.js applies the correct
      // sRGB→linear conversion when sampling the texture in the shader.
      particleTex.colorSpace = THREE.SRGBColorSpace
      disposables.push(particleTex)

      // ── Particle geometry ─────────────────────────────────────────────────
      const N_SURFACE    = narrow ? 3_500 : 7_000
      const N_EQUATORIAL = narrow ? 1_250 : 2_500
      const N_INNER      = narrow ? 750 : 1_500
      const N_TOTAL      = N_SURFACE + N_EQUATORIAL + N_INNER

      const globePos = new Float32Array(N_TOTAL * 3)
      const torusPos = new Float32Array(N_TOTAL * 3)
      const livePos  = new Float32Array(N_TOTAL * 3)
      const colors   = new Float32Array(N_TOTAL * 3)

      let p = 0

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

      const R_main = 0.70, r_tube = 0.28, squish = 0.78
      let q = 0

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

      for (let i = 0; i < N_EQUATORIAL; i++) {
        const phi   = (Math.random() - 0.5) * 0.90
        const theta = 2 * Math.PI * Math.random()
        const fuzz  = (Math.random() - 0.5) * 0.06
        const rr    = R_main + r_tube * Math.cos(phi) + fuzz
        torusPos[q]     = rr * Math.cos(theta)
        torusPos[q + 1] = r_tube * Math.sin(phi) * squish
        torusPos[q + 2] = rr * Math.sin(theta)
        q += 3
      }

      const R_inner = 0.40, r_inner = 0.20
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

      livePos.set(globePos)

      const sphereGeo = new THREE.BufferGeometry()
      const posAttr   = new THREE.BufferAttribute(livePos, 3)
      posAttr.usage   = THREE.DynamicDrawUsage
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

      const bloomTex = new THREE.CanvasTexture(makeBloomTex())
      // Same sRGB fix: the gradient's intermediate RGB tones (210,235,255 etc.)
      // are sRGB-encoded and must be linearised before additive composition.
      bloomTex.colorSpace = THREE.SRGBColorSpace
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

      const N_STARS = narrow ? 140 : 280
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


      const ringGeometry = new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 128 }, (_, i) => {
          const angle = i / 128 * Math.PI * 2
          return new THREE.Vector3(Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7)
        }),
      )
      const ringMaterial = new THREE.LineBasicMaterial({ color: '#8fd5ff', transparent: true, opacity: 0 })
      const ring = new THREE.LineLoop(ringGeometry, ringMaterial)
      scene.add(ring)
      disposables.push(ringGeometry, ringMaterial)
      let morph = controls.current.step === 2 ? 1 : 0
      let expansion = controls.current.step === 1 ? 0.3 : 0
      let yaw = 0
      let pitch = 0
      let previousReset = controls.current.resetKey
      let previousStep = controls.current.step
      let ready = false

      function lost(event: Event) {
        event.preventDefault()
        contextLost = true
        contextAvailable.current = false
        loopRef.current?.setPaused(true)
        report('unavailable')
      }
      function restored() {
        contextLost = false
        contextAvailable.current = true
        ready = false
        resize()
        loopRef.current?.setPaused(controls.current.paused)
      }
      canvas.addEventListener('webglcontextlost', lost)
      canvas.addEventListener('webglcontextrestored', restored)
      const ownedCanvas = canvas
      disposables.push({ dispose() {
        ownedCanvas.removeEventListener('webglcontextlost', lost)
        ownedCanvas.removeEventListener('webglcontextrestored', restored)
      } })

      const loop = createMotionLoop(m, ({ time, delta, animate }) => {
        if (contextLost) return
        // Ambient motion never advances the story. Each step keeps its own shape range.
        const cycle = 0.5 - 0.5 * Math.cos(time * Math.PI / 7)
        const targetMorph = controls.current.step === 2 ? 1 : cycle * (controls.current.step === 0 ? 0.85 : 0.35)
        const targetExpansion = controls.current.step === 1 ? 0.3 + cycle * 0.1 : 0
        const reset = previousReset !== controls.current.resetKey
        const stepChanged = previousStep !== controls.current.step
        previousStep = controls.current.step
        previousReset = controls.current.resetKey
        if (reset) { clearPointer(); yaw = 0; pitch = 0 }
        const ease = reset || (!animate && stepChanged) ? 1 : animate ? 1 - Math.exp(-4 * delta) : 0
        morph += (targetMorph - morph) * ease
        expansion += (targetExpansion - expansion) * ease
        yaw += ((animate ? pointerX * 0.1 : 0) - yaw) * ease
        pitch += ((animate ? pointerY * 0.06 : 0) - pitch) * ease
        const breath = 1 + 0.06 * Math.sin(time * 0.8)
        for (let i = 0; i < N_TOTAL * 3; i++) {
          livePos[i] = (globePos[i] + (torusPos[i] - globePos[i]) * morph) * (1 + expansion)
        }
        posAttr.needsUpdate = true
        sphere.rotation.set(0.2 + morph * 0.55 + pitch, time * 0.16 + yaw, 0)
        sphere.scale.setScalar(breath)
        sphereMat.color.setHSL(0.568, 0.76, 0.66)
        sphereMat.size = narrow ? 0.024 : 0.018
        ring.rotation.copy(sphere.rotation)
        ringMaterial.opacity = morph * 0.3
        bloom.scale.setScalar((1.85 + expansion + morph * 0.5) * breath)
        bloomMat.opacity = 0.5 + morph * 0.15
        try {
          renderer.render(scene, camera)
          if (!ready) { ready = true; report('ready') }
        } catch {
          contextLost = true
          contextAvailable.current = false
          loopRef.current?.setPaused(true)
          report('unavailable')
        }
      })
      loopRef.current = loop
      loop.setPaused(controls.current.paused)
      loop.setMotionOverride(controls.current.allowMotion)
      disposables.push(loop)
    }

    void init().catch(() => {
      canvas?.remove()
      report('unavailable')
      disposables.forEach((resource) => resource.dispose())
      disposables.length = 0
    })

    return () => {
      stopped = true
      loopRef.current = null
      disposables.forEach((resource) => resource.dispose())
      canvas?.remove()
    }
  }, [])

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', touchAction: 'pan-y pinch-zoom', ...style }} />
}
