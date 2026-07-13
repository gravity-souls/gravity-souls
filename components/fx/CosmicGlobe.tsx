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

    // ── Pointer interaction state ─────────────────────────────────────────────
    let mouseNX      = 0
    let mouseNY      = 0
    let mouseActive  = false
    let lastPointerY = 0

    let smoothYaw       = 0
    let smoothPitch     = 0
    let disturbX        = 0
    let disturbY        = 0
    let disturbZ        = 0
    let disturbAmp      = 0
    let smoothBloomLift = 0

    // ── Scroll-depth state ────────────────────────────────────────────────────
    // scrollAcc: depth dial.  negative → expand, positive → focus / traverse.
    // Decays toward 0 when the pointer leaves; holds while pointer is present.
    let scrollAcc            = 0
    let focusSmooth          = 0
    let expandSmooth         = 0
    let traverseSmooth       = 0   // particle shell-parting and inner pull
    let cameraTraverseSmooth = 0   // faster lerp — camera leads particles

    // hoverFrames counts consecutive animation frames the pointer has been inside.
    // Used to gate wheel events: the user must have genuinely hovered for ~0.3 s
    // before wheel events contribute to traversal, preventing incidental page-scroll
    // gestures from triggering depth states when the pointer passes over the component.
    let hoverFrames = 0

    const SCROLL_SENS = 0.003
    const TOUCH_SENS  = 0.012
    const SCROLL_MAX  =  2.5
    const SCROLL_MIN  = -1.5

    let longPressTimer: ReturnType<typeof setTimeout> | null = null

    // ── Reduced-motion ────────────────────────────────────────────────────────
    const motionMQ    = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = motionMQ.matches

    const onMotionChange = (e: MediaQueryListEvent) => {
      reducedMotion = e.matches
      if (reducedMotion) { mouseNX = 0; mouseNY = 0; mouseActive = false; scrollAcc = 0 }
    }
    if (typeof motionMQ.addEventListener === 'function') {
      motionMQ.addEventListener('change', onMotionChange)
      disposables.push({ dispose: () => motionMQ.removeEventListener('change', onMotionChange) })
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(motionMQ as any).addListener(onMotionChange)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      disposables.push({ dispose: () => (motionMQ as any).removeListener(onMotionChange) })
    }

    // ── Event handlers ────────────────────────────────────────────────────────

    const readCoords = (e: PointerEvent) => {
      const rect = mount.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      mouseNX = ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouseNY = 1 - ((e.clientY - rect.top)  / rect.height) * 2
    }

    const onPointerEnter = (e: PointerEvent) => {
      if (reducedMotion) return
      readCoords(e)
      lastPointerY = e.clientY
      mouseActive  = true
    }

    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return
      readCoords(e)

      if (e.pointerType === 'touch') {
        const dy = lastPointerY - e.clientY  // positive = swipe up = deeper
        if (Math.abs(dy) > 1) {              // ignore sub-pixel jitter
          scrollAcc = Math.max(SCROLL_MIN, Math.min(SCROLL_MAX, scrollAcc + dy * TOUCH_SENS))
        }
        if (Math.abs(dy) > 8 && longPressTimer !== null) {
          clearTimeout(longPressTimer)
          longPressTimer = null
        }
      }
      lastPointerY = e.clientY
      mouseActive  = true
    }

    const clearLongPress = () => {
      if (longPressTimer !== null) { clearTimeout(longPressTimer); longPressTimer = null }
    }

    const onPointerLeave = () => {
      mouseNX = 0; mouseNY = 0; mouseActive = false
      clearLongPress()
    }

    // pointercancel fires when a touch is interrupted by a system gesture or call.
    const onPointerCancel = () => {
      mouseNX = 0; mouseNY = 0; mouseActive = false
      clearLongPress()
    }

    // 650 ms touch hold without significant movement → expand state.
    const onPointerDown = (e: PointerEvent) => {
      if (reducedMotion || e.pointerType !== 'touch') return
      longPressTimer = setTimeout(() => {
        scrollAcc      = Math.max(SCROLL_MIN, scrollAcc - 1.0)
        longPressTimer = null
      }, 650)
    }

    const onPointerUp = () => { clearLongPress() }

    // Wheel drives the depth dial on desktop.  passive:true — page scroll is
    // not blocked, which is correct when the component is embedded in a longer page.
    // Intent gate: require ~0.3 s of continuous hover before wheel activates,
    // unless the dial is already in focus state (scrollAcc > 0.5). This stops
    // incidental page-scroll trackpad gestures from triggering depth states when
    // the pointer drifts over the component.
    const onWheel = (e: WheelEvent) => {
      if (reducedMotion) return
      if (hoverFrames < 18 && scrollAcc < 0.5) return
      let delta = e.deltaY
      if (e.deltaMode === 1) delta *= 40
      if (e.deltaMode === 2) delta *= 800
      scrollAcc = Math.max(SCROLL_MIN, Math.min(SCROLL_MAX, scrollAcc + delta * SCROLL_SENS))
    }

    mount.addEventListener('pointerenter',  onPointerEnter,  { passive: true })
    mount.addEventListener('pointermove',   onPointerMove,   { passive: true })
    mount.addEventListener('pointerleave',  onPointerLeave,  { passive: true })
    mount.addEventListener('pointercancel', onPointerCancel, { passive: true })
    mount.addEventListener('pointerdown',   onPointerDown,   { passive: true })
    mount.addEventListener('pointerup',     onPointerUp,     { passive: true })
    mount.addEventListener('wheel',         onWheel,         { passive: true })
    disposables.push({
      dispose: () => {
        mount.removeEventListener('pointerenter',  onPointerEnter)
        mount.removeEventListener('pointermove',   onPointerMove)
        mount.removeEventListener('pointerleave',  onPointerLeave)
        mount.removeEventListener('pointercancel', onPointerCancel)
        mount.removeEventListener('pointerdown',   onPointerDown)
        mount.removeEventListener('pointerup',     onPointerUp)
        mount.removeEventListener('wheel',         onWheel)
        clearLongPress()
      },
    })

    // ── Three.js init ─────────────────────────────────────────────────────────

    async function init() {
      const THREE = await import('three')
      if (stopped) return

      const m = mount!

      // ── Canvas + renderer ─────────────────────────────────────────────────
      const canvas = document.createElement('canvas')
      canvas.style.display = 'block'
      ownedCanvas = canvas
      m.appendChild(canvas)

      let renderer: import('three').WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false })
      } catch (e) {
        console.error('[CosmicGlobe] renderer failed:', e)
        canvas.remove(); ownedCanvas = null; return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x040A18, 1)
      disposables.push(renderer)

      // ── Scene + camera ────────────────────────────────────────────────────
      const scene  = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(55, m.clientWidth / m.clientHeight, 0.01, 60)
      camera.position.z = 3.5

      function resize() {
        const w = m.clientWidth, h = m.clientHeight
        if (w === 0 || h === 0) return
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(m)
      disposables.push({ dispose: () => ro.disconnect() })

      // ── Particle texture ──────────────────────────────────────────────────
      const particleTex = new THREE.CanvasTexture(makeParticleTex())
      disposables.push(particleTex)

      // ── Particle positions ────────────────────────────────────────────────
      const N_SURFACE    = 7_000
      const N_EQUATORIAL = 2_500
      const N_INNER      = 1_500
      const N_TOTAL      = N_SURFACE + N_EQUATORIAL + N_INNER

      const globePos = new Float32Array(N_TOTAL * 3)
      const torusPos = new Float32Array(N_TOTAL * 3)
      const livePos  = new Float32Array(N_TOTAL * 3)
      const colors   = new Float32Array(N_TOTAL * 3)

      // ── Globe positions ───────────────────────────────────────────────────
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

      // ── Torus target positions ────────────────────────────────────────────
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

      // ── Geometry ──────────────────────────────────────────────────────────
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

      // ── Bloom sprite ──────────────────────────────────────────────────────
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

      // ── Starfield ─────────────────────────────────────────────────────────
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

      // ── Timer ─────────────────────────────────────────────────────────────
      const timer = new THREE.Timer()
      timer.connect(document)
      disposables.push({ dispose: () => timer.disconnect() })

      // ── Animation constants ───────────────────────────────────────────────
      const MORPH_PERIOD = 30
      const MAX_YAW      = 6 * Math.PI / 180
      const MAX_PITCH    = 3 * Math.PI / 180

      // Byte-index boundaries for the three particle groups in the flat array.
      const EQ_START    = N_SURFACE * 3
      const INNER_START = (N_SURFACE + N_EQUATORIAL) * 3

      // ── Animation loop ────────────────────────────────────────────────────
      function animate(timestamp: number) {
        if (stopped) return
        rafId = requestAnimationFrame(animate)

        timer.update(timestamp)
        const t = timer.getElapsed()

        // ── Hover dwell counter ───────────────────────────────────────────
        // Increments while pointer is inside; resets to 0 on leave so each
        // new hover must dwell before the wheel intent gate opens.
        if (mouseActive) hoverFrames = Math.min(hoverFrames + 1, 120)
        else             hoverFrames = 0

        // ── Scroll-depth state machine ────────────────────────────────────
        if (!mouseActive) scrollAcc += (0 - scrollAcc) * 0.030

        const focusTarget    = Math.max(0, Math.min(1, (scrollAcc  - 0.5) / 1.0))
        const expandTarget   = Math.max(0, Math.min(1, (-scrollAcc - 0.5) / 1.0))
        const traverseTarget = Math.max(0, Math.min(1, (scrollAcc  - 1.5) / 1.0))

        focusSmooth          += (focusTarget    - focusSmooth)          * 0.040
        expandSmooth         += (expandTarget   - expandSmooth)         * 0.040
        // Particles trail the camera slightly — the viewer enters the shell
        // before the opening fully forms, creating a genuine crossing moment.
        traverseSmooth       += (traverseTarget - traverseSmooth)       * 0.025
        cameraTraverseSmooth += (traverseTarget - cameraTraverseSmooth) * 0.042

        // Camera: z=3.5 → z=1.2 at full traversal.
        // Stopping at z=1.2 keeps all particles ≥ 0.2 units from the camera,
        // preventing near-plane clipping and oversized sizeAttenuation blowup
        // on near-polar particles that the XY spread cannot reach.
        camera.position.z = 3.5 - cameraTraverseSmooth * 2.3

        // ── Parallax ─────────────────────────────────────────────────────
        smoothYaw   += (mouseNX *  MAX_YAW   - smoothYaw)   * 0.025
        smoothPitch += (-mouseNY * MAX_PITCH - smoothPitch) * 0.025

        // ── Globe ↔ torus morph ───────────────────────────────────────────
        const morphFactor = 0.5 - 0.5 * Math.cos((t / MORPH_PERIOD) * Math.PI * 2)
        for (let i = 0; i < N_TOTAL * 3; i++) {
          livePos[i] = globePos[i] + (torusPos[i] - globePos[i]) * morphFactor
        }

        // ── Per-group position modifiers ──────────────────────────────────
        const globalRadialScale = 1 - focusSmooth * 0.18 + expandSmooth * 0.28

        // Surface group: radial scale + shell opening during traversal.
        //
        // Shell opening spreads particles outward from the z-axis (the camera's
        // approach axis) rather than using a facing-angle bias on local pz.
        // The z-axis spread is rotation-independent: it produces the same
        // portal-ring silhouette regardless of where sphere.rotation.y is in
        // its 30-second cycle, so the shell crossing always looks consistent.
        //
        // Near-polar particles (rXY < 0.08) cannot spread laterally without
        // becoming a dense point; they retreat slightly along local -Z instead,
        // which increases their camera distance and reduces apparent billboard size.
        // (Local z ≈ world z for the brief duration of a typical traversal
        // gesture — the sphere rotation moves ~23° over a few seconds, which
        // is close enough for a soft perceptual effect.)
        for (let i = 0; i < EQ_START; i += 3) {
          livePos[i]     *= globalRadialScale
          livePos[i + 1] *= globalRadialScale
          livePos[i + 2] *= globalRadialScale

          if (traverseSmooth > 0.001) {
            const px  = livePos[i]
            const py  = livePos[i + 1]
            const rXY = Math.sqrt(px * px + py * py)

            if (rXY > 0.08) {
              // Spread laterally away from the viewing axis — the ring opens.
              const spread = traverseSmooth * 0.50
              livePos[i]     += (px / rXY) * spread
              livePos[i + 1] += (py / rXY) * spread
            } else {
              // Near-polar: retreat along local -Z to increase camera distance.
              livePos[i + 2] -= traverseSmooth * 0.15
            }
          }
        }

        // Equatorial group: radial scale only.
        for (let i = EQ_START; i < INNER_START; i += 3) {
          livePos[i]     *= globalRadialScale
          livePos[i + 1] *= globalRadialScale
          livePos[i + 2] *= globalRadialScale
        }

        // Inner group: radial scale + extra inward pull during traversal.
        // The core contracts as the viewer approaches — denser, more magnetic.
        const innerScale = globalRadialScale * (1 - traverseSmooth * 0.22)
        for (let i = INNER_START; i < N_TOTAL * 3; i += 3) {
          livePos[i]     *= innerScale
          livePos[i + 1] *= innerScale
          livePos[i + 2] *= innerScale
        }

        // ── Outer-shell disturbance (pointer ripple) ──────────────────────
        const ndx = mouseNX
        const ndy = mouseNY
        const ndz = Math.sqrt(Math.max(0, 1 - ndx * ndx - ndy * ndy))
        disturbX += (ndx - disturbX) * 0.035
        disturbY += (ndy - disturbY) * 0.035
        disturbZ += (ndz - disturbZ) * 0.035
        disturbAmp += ((mouseActive ? 0.045 : 0) - disturbAmp) * 0.030

        if (disturbAmp > 0.0005) {
          for (let i = 0; i < EQ_START; i += 3) {
            const px = livePos[i], py = livePos[i + 1], pz = livePos[i + 2]
            const lenSq = px * px + py * py + pz * pz
            if (lenSq < 0.01) continue
            const invLen = 1 / Math.sqrt(lenSq)
            const dot    = (px * disturbX + py * disturbY + pz * disturbZ) * invLen
            const effect = Math.max(0, (dot - 0.55) / 0.45)
            if (effect > 0) {
              const push = disturbAmp * effect
              livePos[i]     += px * invLen * push
              livePos[i + 1] += py * invLen * push
              livePos[i + 2] += pz * invLen * push
            }
          }
        }

        posAttr.needsUpdate = true

        // ── Motion ───────────────────────────────────────────────────────
        sphere.rotation.y = t * 0.079 + smoothYaw
        sphere.rotation.x = 0.20 + smoothPitch
        const breath = 1 + 0.025 * Math.sin(t * 0.44)
        sphere.scale.setScalar(breath)

        // ── Bloom ─────────────────────────────────────────────────────────
        const cursorDist      = Math.sqrt(mouseNX * mouseNX + mouseNY * mouseNY)
        const targetBloomLift = mouseActive ? Math.max(0, 1 - cursorDist / 0.35) : 0
        smoothBloomLift += (targetBloomLift - smoothBloomLift) * 0.040

        bloom.scale.setScalar(
          (1.85 + 0.60 * morphFactor)
          * (1 + 0.18 * smoothBloomLift)
          * (1 - 0.10 * focusSmooth + 0.18 * expandSmooth + 0.55 * traverseSmooth)
          * breath
        )
        bloomMat.opacity = Math.min(
          1.0,
          0.50 + 0.30 * morphFactor + 0.15 * smoothBloomLift
          + 0.22 * focusSmooth - 0.08 * expandSmooth + 0.38 * traverseSmooth
        )

        // ── Color ─────────────────────────────────────────────────────────
        const hueBase = 0.570 + 0.048 * Math.sin(t * 0.14) - 0.018 * morphFactor
        sphereMat.color.setHSL(
          hueBase - 0.020 * focusSmooth + 0.015 * expandSmooth - 0.010 * traverseSmooth,
          0.88 + 0.10 * focusSmooth - 0.06 * expandSmooth + 0.06 * traverseSmooth,
          0.60 + 0.06 * focusSmooth + 0.10 * traverseSmooth,
        )

        // ── Particle size ─────────────────────────────────────────────────
        // No traversal modifier — sizeAttenuation already enlarges nearby
        // particles; adding a multiplier would amplify near-camera artifacts.
        sphereMat.size = 0.016 * (1 - 0.22 * focusSmooth + 0.30 * expandSmooth)

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
