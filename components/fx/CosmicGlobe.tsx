'use client'

import { useEffect, useRef } from 'react'

export interface CosmicGlobeProps {
  className?: string
  style?: React.CSSProperties
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

export default function CosmicGlobe({ className, style }: CosmicGlobeProps) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let stopped     = false
    let rafId       = 0
    let ownedCanvas: HTMLCanvasElement | null = null
    const disposables: { dispose(): void }[] = []

    // ── Pointer state ─────────────────────────────────────────────────────────
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
    let scrollAcc            = 0
    let focusSmooth          = 0
    let expandSmooth         = 0
    let traverseSmooth       = 0
    let cameraTraverseSmooth = 0

    // shellSpread is separate from traverseSmooth so the ring can close faster
    // than the camera retreats on exit — "shell sealing behind you" feeling.
    let shellSpread = 0

    // presenceSmooth builds slowly while hovering, creating a subtle bloom lift
    // and "invitation" feeling before any scroll input.
    let presenceSmooth = 0

    // Touch swipe momentum: EMA velocity preserved after pointer lift.
    let touchVelocity = 0

    // Long press state
    let holdStart  = 0
    // bloomPulse = 1.0 on long press fire; decays over ~14 frames as visual confirmation.
    let bloomPulse = 0

    // Integrated sphere rotation — allows variable speed without discontinuities.
    let sphereRotY = 0

    // Wheel intent gate
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
      if (reducedMotion) {
        mouseNX = 0; mouseNY = 0; mouseActive = false
        scrollAcc = 0; touchVelocity = 0; bloomPulse = 0
      }
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
      lastPointerY  = e.clientY
      touchVelocity = 0   // clear momentum when a new contact starts
      mouseActive   = true
    }

    const onPointerMove = (e: PointerEvent) => {
      if (reducedMotion) return
      readCoords(e)

      if (e.pointerType === 'touch') {
        const dy = lastPointerY - e.clientY   // positive = swipe up = deeper
        if (Math.abs(dy) > 1) {
          const delta = dy * TOUCH_SENS
          scrollAcc = Math.max(SCROLL_MIN, Math.min(SCROLL_MAX, scrollAcc + delta))
          // EMA of per-event deltas — smoothed velocity for momentum after lift.
          touchVelocity = touchVelocity * 0.70 + delta * 0.30
          if (Math.abs(dy) > 8 && longPressTimer !== null) {
            clearTimeout(longPressTimer)
            longPressTimer = null
          }
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
      // touchVelocity preserved — becomes momentum in animate()
    }

    // pointercancel = gesture interrupted by system (call, home swipe).
    // No momentum: the gesture did not complete intentionally.
    const onPointerCancel = () => {
      mouseNX = 0; mouseNY = 0; mouseActive = false
      touchVelocity = 0
      clearLongPress()
    }

    const onPointerDown = (e: PointerEvent) => {
      if (reducedMotion || e.pointerType !== 'touch') return
      holdStart      = performance.now()
      longPressTimer = setTimeout(() => {
        scrollAcc  = Math.max(SCROLL_MIN, scrollAcc - 1.0)
        bloomPulse = 1.0   // bloom flash confirms the action
        longPressTimer = null
      }, 650)
    }

    const onPointerUp = () => {
      clearLongPress()
      // touchVelocity preserved — becomes momentum
    }

    // Wheel drives the depth dial on desktop. passive:true — page scroll is not blocked.
    // Intent gate: require ~0.3 s of continuous hover before wheel activates (unless
    // already in focus state) to prevent incidental page-scroll gestures from
    // triggering depth changes.
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

      const particleTex = new THREE.CanvasTexture(makeParticleTex())
      disposables.push(particleTex)

      // ── Particle geometry ─────────────────────────────────────────────────
      const N_SURFACE    = 7_000
      const N_EQUATORIAL = 2_500
      const N_INNER      = 1_500
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

      const timer = new THREE.Timer()
      timer.connect(document)
      disposables.push({ dispose: () => timer.disconnect() })

      const MORPH_PERIOD = 30
      const MAX_YAW      = 6 * Math.PI / 180
      const MAX_PITCH    = 3 * Math.PI / 180

      const EQ_START    = N_SURFACE * 3
      const INNER_START = (N_SURFACE + N_EQUATORIAL) * 3

      // ── Animation loop ────────────────────────────────────────────────────
      function animate(timestamp: number) {
        if (stopped) return
        rafId = requestAnimationFrame(animate)

        timer.update(timestamp)
        const t  = timer.getElapsed()
        const dt = Math.max(Math.min(timer.getDelta(), 0.05), 0.001)

        // ── Hover dwell ───────────────────────────────────────────────────
        if (mouseActive) hoverFrames = Math.min(hoverFrames + 1, 120)
        else             hoverFrames = 0

        // ── Presence ──────────────────────────────────────────────────────
        // Builds over ~2 s while hovering; decays in ~1.5 s on leave.
        // Provides a gentle "surface invitation" before any scroll input.
        presenceSmooth += ((mouseActive ? 1 : 0) - presenceSmooth) * (mouseActive ? 0.008 : 0.010)

        // ── Long press bloom pulse ────────────────────────────────────────
        bloomPulse = Math.max(0, bloomPulse - 0.07)   // decays in ~14 frames

        // Hold tension: 0→1 over the 650 ms window.
        const holdTension = longPressTimer !== null
          ? Math.min(1, (performance.now() - holdStart) / 650)
          : 0

        // ── Scroll / momentum state ───────────────────────────────────────
        if (!mouseActive) {
          // Apply touch momentum then decay it (friction ~12 %/frame).
          if (Math.abs(touchVelocity) > 0.0002) {
            scrollAcc = Math.max(SCROLL_MIN, Math.min(SCROLL_MAX, scrollAcc + touchVelocity))
            touchVelocity *= 0.88
          } else {
            touchVelocity = 0
          }
          // Standard decay toward surface when pointer absent.
          scrollAcc += (0 - scrollAcc) * 0.028
        } else {
          // Drain residual momentum while actively touching.
          touchVelocity *= 0.60
        }

        // ── Depth targets ─────────────────────────────────────────────────
        const focusTarget    = Math.max(0, Math.min(1, (scrollAcc  - 0.5) / 1.0))
        const expandTarget   = Math.max(0, Math.min(1, (-scrollAcc - 0.5) / 1.0))
        const traverseTarget = Math.max(0, Math.min(1, (scrollAcc  - 1.5) / 1.0))

        focusSmooth  += (focusTarget  - focusSmooth)  * 0.040
        expandSmooth += (expandTarget - expandSmooth) * 0.040

        // Asymmetric traversal: entry rushes forward, exit lingers.
        // Entry — viewer accelerates inward through the shell.
        // Exit  — reluctant release; the passage closes slowly.
        traverseSmooth += (traverseTarget - traverseSmooth) *
          (traverseTarget > traverseSmooth ? 0.032 : 0.020)

        // Camera leads particles on entry, also retreats more slowly on exit.
        cameraTraverseSmooth += (traverseTarget - cameraTraverseSmooth) *
          (traverseTarget > cameraTraverseSmooth ? 0.055 : 0.030)

        // Shell ring: opens with particles on entry; snaps back faster on exit
        // so the ring seals while the camera is still retreating.
        shellSpread += (traverseTarget - shellSpread) *
          (traverseTarget > shellSpread ? 0.032 : 0.055)

        // Camera z: 3.5 → 1.2 at full traversal (0.2 units outside shell surface).
        camera.position.z = 3.5 - cameraTraverseSmooth * 2.3

        // ── Inner arrival ─────────────────────────────────────────────────
        // A low-frequency luminosity pulse activates once past 50 % traversal —
        // the "heartbeat" of the inner space. 0.88 rad/s ≈ one cycle per 7 s.
        const arrivalDepth = Math.max(0, (traverseSmooth - 0.5) * 2)
        const innerPulse   = arrivalDepth * 0.07 * Math.sin(t * 0.88)

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

        // Surface: radial scale + shell opening via shellSpread (not traverseSmooth),
        // so the ring can close faster than the camera retreats on exit.
        // XY spread from the z-axis is rotation-independent: correct at any
        // rotation angle throughout the 30-second morph cycle.
        for (let i = 0; i < EQ_START; i += 3) {
          livePos[i]     *= globalRadialScale
          livePos[i + 1] *= globalRadialScale
          livePos[i + 2] *= globalRadialScale

          if (shellSpread > 0.001) {
            const px  = livePos[i]
            const py  = livePos[i + 1]
            const rXY = Math.sqrt(px * px + py * py)

            if (rXY > 0.08) {
              const spread = shellSpread * 0.50
              livePos[i]     += (px / rXY) * spread
              livePos[i + 1] += (py / rXY) * spread
            } else {
              // Near-polar: retreat along local -Z to increase camera distance.
              livePos[i + 2] -= shellSpread * 0.15
            }
          }
        }

        // Equatorial: radial scale only.
        for (let i = EQ_START; i < INNER_START; i += 3) {
          livePos[i]     *= globalRadialScale
          livePos[i + 1] *= globalRadialScale
          livePos[i + 2] *= globalRadialScale
        }

        // Inner: radial scale + inward pull (core contracts as viewer approaches).
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
        // Rotation speed eases down during expand (globe breathes out, slows).
        // Integrated via dt to avoid discontinuities when speed changes.
        const rotSpeed = 0.079 - 0.020 * expandSmooth
        sphereRotY += rotSpeed * dt
        sphere.rotation.y = sphereRotY + smoothYaw
        sphere.rotation.x = 0.20 + smoothPitch
        const breath = 1 + 0.025 * Math.sin(t * 0.44)
        sphere.scale.setScalar(breath)

        // ── Bloom ─────────────────────────────────────────────────────────
        const cursorDist      = Math.sqrt(mouseNX * mouseNX + mouseNY * mouseNY)
        const targetBloomLift = mouseActive ? Math.max(0, 1 - cursorDist / 0.35) : 0
        smoothBloomLift += (targetBloomLift - smoothBloomLift) * 0.040

        bloom.scale.setScalar(
          (1.85 + 0.60 * morphFactor)
          * (1 + 0.18 * smoothBloomLift
               + presenceSmooth * 0.12    // gentle ambient lift from hover presence
               + holdTension    * 0.08    // subtle build-up during 650 ms hold
               + bloomPulse     * 0.30)   // confirmation flash on long press fire
          * (1 - 0.10 * focusSmooth + 0.18 * expandSmooth + 0.80 * traverseSmooth)
          * breath
        )
        bloomMat.opacity = Math.min(1.0,
          0.50 + 0.30 * morphFactor
          + 0.15 * smoothBloomLift
          + 0.07 * presenceSmooth
          + holdTension * 0.06
          + bloomPulse  * 0.20
          + 0.22 * focusSmooth
          - 0.08 * expandSmooth
          + 0.42 * traverseSmooth
        )

        // Starfield: slightly brighter during expand (universe breathes in).
        starMat.opacity = Math.min(0.90, 0.72 + 0.18 * expandSmooth)

        // ── Color ─────────────────────────────────────────────────────────
        // Traversal hue shifts toward indigo (−0.025), saturation up (+0.10),
        // lightness rises (+0.18) with an inner-pulse layer (+0.07 at full depth).
        const hueBase = 0.570 + 0.048 * Math.sin(t * 0.14) - 0.018 * morphFactor
        sphereMat.color.setHSL(
          hueBase - 0.020 * focusSmooth + 0.015 * expandSmooth - 0.025 * traverseSmooth,
          0.88 + 0.10 * focusSmooth - 0.06 * expandSmooth + 0.10 * traverseSmooth,
          Math.max(0.01, Math.min(0.99,
            0.60 + 0.06 * focusSmooth + 0.18 * traverseSmooth + innerPulse
          )),
        )

        // ── Particle size ─────────────────────────────────────────────────
        // No traversal modifier: sizeAttenuation already enlarges near particles;
        // adding a multiplier during traversal amplifies near-camera artifacts.
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
