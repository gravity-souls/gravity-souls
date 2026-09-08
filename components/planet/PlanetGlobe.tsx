'use client'

import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { BackSide, DoubleSide, type Mesh } from 'three'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { PlanetConfig } from '@/types/planet'
import { useNarrowViewportPreference, useReducedMotionPreference } from '@/lib/hooks/useBrowserPreferences'

interface Props {
  planetConfig: PlanetConfig
  size?: number
  framing?: 'hero' | 'avatar'
}


interface ErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

class PlanetGlobeErrorBoundary extends Component<ErrorBoundaryProps, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

function hasWebGLSupport() {
  if (typeof window === 'undefined') return false

  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

function GlobeFallback({ planetConfig, size = 300 }: Props) {
  return (
    <div
      className="rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.24) 0%, ${planetConfig.tintColor}cc 26%, ${planetConfig.tintColor}55 58%, rgba(0,0,0,0.42) 100%)`,
        boxShadow: `0 0 ${Math.round(size * 0.24)}px ${planetConfig.tintColor}70, 0 0 ${Math.round(size * 0.5)}px ${planetConfig.atmosphereColor}24`,
      }}
    />
  )
}

// Drives the render loop while the Canvas uses frameloop="demand": as long as
// `active` is true it keeps re-invalidating every frame (continuous rotation);
// as soon as it's false the chain simply stops being re-armed, so R3F stops
// rendering entirely instead of just freezing rotation in place. This is what
// gives us both "pause when hidden/offscreen" and "static when reduced motion
// is preferred" without touching the per-mesh useFrame callbacks below.
function FrameDriver({ active }: { active: boolean }) {
  const invalidate = useThree((state) => state.invalidate)

  useFrame(() => {
    if (active) invalidate()
  })

  // Kick the loop back on when it flips from inactive to active — otherwise
  // there's no pending frame left to call invalidate() from.
  useEffect(() => {
    if (active) invalidate()
  }, [active, invalidate])

  return null
}

// iOS Safari (and others, under memory pressure) can drop the WebGL context
// at any time without throwing — PlanetGlobeErrorBoundary can't catch this.
// Mirrors CosmicGlobe.tsx's webglcontextlost/webglcontextrestored handling.
function ContextLossWatcher({ onLost, onRestored }: { onLost: () => void; onRestored: () => void }) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const canvas = gl.domElement

    function lost(event: Event) {
      event.preventDefault()
      onLost()
    }
    function restored() {
      onRestored()
      invalidate()
    }

    canvas.addEventListener('webglcontextlost', lost)
    canvas.addEventListener('webglcontextrestored', restored)
    return () => {
      canvas.removeEventListener('webglcontextlost', lost)
      canvas.removeEventListener('webglcontextrestored', restored)
    }
  }, [gl, invalidate, onLost, onRestored])

  return null
}

function PlanetSphere({ planetConfig }: { planetConfig: PlanetConfig }) {
  const planetRef = useRef<Mesh>(null)
  const texture = useTexture(planetConfig.customTextureUrl || `/textures/${planetConfig.baseTexture}`)

  useFrame(() => {
    if (planetRef.current) planetRef.current.rotation.y += planetConfig.rotationSpeed
  })

  return (
    <mesh ref={planetRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        map={texture}
        color="#ffffff"
        emissive={planetConfig.tintColor}
        emissiveIntensity={0.08}
        specular="#333"
        shininess={25}
      />
    </mesh>
  )
}

function AtmosphereGlow({ planetConfig }: { planetConfig: PlanetConfig }) {
  return (
    <mesh>
      <sphereGeometry args={[1.08, 32, 32]} />
      <meshPhongMaterial
        color={planetConfig.atmosphereColor}
        transparent
        opacity={planetConfig.atmosphereDensity}
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function CloudLayer({ planetConfig }: { planetConfig: PlanetConfig }) {
  const cloudRef = useRef<Mesh>(null)
  const cloudTexture = useTexture('/textures/earth_clouds.jpg')

  useFrame(() => {
    if (cloudRef.current) cloudRef.current.rotation.y += planetConfig.rotationSpeed * 1.15
  })

  if (planetConfig.cloudOpacity <= 0) return null

  return (
    <mesh ref={cloudRef}>
      <sphereGeometry args={[1.02, 32, 32]} />
      <meshPhongMaterial
        map={cloudTexture}
        color="#ffffff"
        transparent
        opacity={planetConfig.cloudOpacity}
        depthWrite={false}
      />
    </mesh>
  )
}

function PlanetRing({ planetConfig }: { planetConfig: PlanetConfig }) {
  const ringRef = useRef<Mesh>(null)

  useFrame(() => {
    if (ringRef.current) ringRef.current.rotation.z += 0.004
  })

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2.35, 0, 0]}>
      <ringGeometry args={[1.58, 1.68, 128]} />
      <meshPhongMaterial
        color={planetConfig.ringColor || planetConfig.tintColor}
        emissive={planetConfig.ringColor || planetConfig.tintColor}
        emissiveIntensity={0.26}
        specular="#ffffff"
        shininess={80}
        transparent
        opacity={0.82}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function PlanetScene({
  planetConfig,
  sceneScale,
  active,
  onContextLost,
  onContextRestored,
}: {
  planetConfig: PlanetConfig
  sceneScale: number
  active: boolean
  onContextLost: () => void
  onContextRestored: () => void
}) {
  return (
    <>
      <ContextLossWatcher onLost={onContextLost} onRestored={onContextRestored} />
      <FrameDriver active={active} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 2, 2]} intensity={1.8} />
      <directionalLight position={[-3, -1, -2]} intensity={0.3} color="#8844ff" />
      <group scale={sceneScale}>
        <AtmosphereGlow planetConfig={planetConfig} />
        {planetConfig.hasRing && <PlanetRing planetConfig={planetConfig} />}
        <PlanetSphere planetConfig={planetConfig} />
        <CloudLayer planetConfig={planetConfig} />
      </group>
    </>
  )
}

export default function PlanetGlobe({ planetConfig, size = 300, framing = 'hero' }: Props) {
  const [webGLAvailable, setWebGLAvailable] = useState<boolean | null>(null)
  const [checkedCustomTexture, setCheckedCustomTexture] = useState<{ source?: string; url?: string }>({})
  const [contextLost, setContextLost] = useState(false)
  const [onscreen, setOnscreen] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const reducedMotion = useReducedMotionPreference()
  const narrowViewport = useNarrowViewportPreference()
  const customTextureUrl = planetConfig.customTextureUrl
  const availableCustomTextureUrl = customTextureUrl && !customTextureUrl.startsWith('/')
    ? customTextureUrl
    : checkedCustomTexture.source === customTextureUrl
      ? checkedCustomTexture.url
      : undefined
  const sceneScale = framing === 'avatar' ? 0.9 : 0.58
  const renderPlanetConfig = { ...planetConfig, customTextureUrl: availableCustomTextureUrl }

  const handleContextLost = useCallback(() => setContextLost(true), [])
  const handleContextRestored = useCallback(() => setContextLost(false), [])

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) setWebGLAvailable(hasWebGLSupport())
    })

    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false

    if (!customTextureUrl) return () => { cancelled = true }
    if (!customTextureUrl.startsWith('/')) return () => { cancelled = true }

    fetch(customTextureUrl, { method: 'HEAD' })
      .then((response) => {
        if (!cancelled) setCheckedCustomTexture({ source: customTextureUrl, url: response.ok ? customTextureUrl : undefined })
      })
      .catch(() => {
        if (!cancelled) setCheckedCustomTexture({ source: customTextureUrl, url: undefined })
      })

    return () => { cancelled = true }
  }, [customTextureUrl])

  // Pause the render loop when the globe scrolls offscreen or the tab is
  // backgrounded — a page can mount many PlanetGlobe instances at once
  // (e.g. discovery grids) and each would otherwise render every frame
  // forever via R3F's default frameloop="always".
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let intersecting = true
    function update() { setOnscreen(intersecting && !document.hidden) }
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting
      update()
    })
    observer.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  if (webGLAvailable === false) {
    return <PlanetAvatar planetConfig={renderPlanetConfig} size={size} rotating rotationDuration={22} className="mx-auto" />
  }

  if (webGLAvailable === null) {
    return <GlobeFallback planetConfig={renderPlanetConfig} size={size} />
  }

  const active = onscreen && !reducedMotion && !contextLost

  return (
    <PlanetGlobeErrorBoundary fallback={<PlanetAvatar planetConfig={renderPlanetConfig} size={size} rotating rotationDuration={22} className="mx-auto" />}>
      <Suspense fallback={<GlobeFallback planetConfig={renderPlanetConfig} size={size} />}>
        <div ref={containerRef} className="relative" style={{ width: size, height: size }}>
          <Canvas
            camera={{ position: [0, 0, 2.8], fov: 45 }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            dpr={[1, narrowViewport ? 1 : 1.5]}
            frameloop="demand"
            style={{ width: size, height: size, background: 'transparent' }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          >
            <Suspense fallback={null}>
              <PlanetScene
                planetConfig={renderPlanetConfig}
                sceneScale={sceneScale}
                active={active}
                onContextLost={handleContextLost}
                onContextRestored={handleContextRestored}
              />
            </Suspense>
          </Canvas>
          {contextLost && (
            <div className="absolute inset-0" aria-hidden="true">
              <PlanetAvatar planetConfig={renderPlanetConfig} size={size} rotating={false} className="mx-auto" />
            </div>
          )}
        </div>
      </Suspense>
    </PlanetGlobeErrorBoundary>
  )
}
