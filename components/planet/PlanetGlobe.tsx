'use client'

import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

// Suppress THREE.Clock deprecation warning from R3F v9 internals (fixed in R3F v10)
const _origWarn = console.warn
console.warn = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock')) return
  _origWarn.apply(console, args)
}

// ---------------------------------------------------------------------------
// Inner Three.js scene components (must live inside <Canvas>)
// ---------------------------------------------------------------------------

function RotatingSphere({
  textureFile,
  ringEnabled,
  glowColor,
  onError,
}: {
  textureFile: string
  ringEnabled: boolean
  glowColor: string
  onError: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  // Load texture — on failure, call onError to trigger CSS fallback
  let texture: THREE.Texture | null = null
  try {
    texture = useLoader(THREE.TextureLoader, `/textures/${textureFile}`)
  } catch {
    // Loader will throw during SSR or on failure — handled below
  }

  useEffect(() => {
    if (!texture) onError()
  }, [texture, onError])

  // Slow rotation
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.15
    if (ringRef.current) ringRef.current.rotation.z += delta * 0.05
  })

  const color = new THREE.Color(glowColor)

  return (
    <>
      {/* Planet sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 64, 64]} />
        {texture ? (
          <meshStandardMaterial map={texture} roughness={0.8} metalness={0.1} />
        ) : (
          <meshStandardMaterial color={glowColor} roughness={0.7} metalness={0.2} />
        )}
      </mesh>

      {/* Atmospheric glow shell (BackSide) */}
      <mesh ref={glowRef} scale={1.06}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Optional ring */}
      {ringEnabled && (
        <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0, 0]}>
          <ringGeometry args={[1.3, 1.7, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* Lighting */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 2, 5]} intensity={1.2} />
    </>
  )
}

// ---------------------------------------------------------------------------
// CSS gradient fallback sphere
// ---------------------------------------------------------------------------

function FallbackSphere({ glowColor, size }: { glowColor: string; size: number }) {
  return (
    <div
      className="rounded-full animate-nebula-breathe"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${glowColor}cc 0%, ${glowColor}44 60%, ${glowColor}18 100%)`,
        boxShadow: `0 0 ${size * 0.3}px ${glowColor}55, 0 0 ${size * 0.7}px ${glowColor}20`,
      }}
    >
      {/* Specular highlight */}
      <div
        className="w-full h-full rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.18) 0%, transparent 55%)',
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// PlanetGlobe — public API
// ---------------------------------------------------------------------------

interface Props {
  /** Texture filename inside /textures/, e.g. "mars.jpg" */
  textureFile: string
  /** Show Saturn-like ring around the planet (default false) */
  ringEnabled?: boolean
  /** Hex color for the atmospheric glow (default #a78bfa) */
  glowColor?: string
  /** Rendered size in pixels (default 300) */
  size?: number
  className?: string
}

/**
 * PlanetGlobe — renders a Three.js rotating sphere with a NASA texture.
 * Falls back to a CSS gradient sphere if WebGL or texture loading fails.
 * Auto-disposes WebGL resources on unmount via R3F's built-in cleanup.
 */
export default function PlanetGlobe({
  textureFile,
  ringEnabled = false,
  glowColor = '#a78bfa',
  size = 300,
  className = '',
}: Props) {
  const [useFallback, setUseFallback] = useState(false)

  // Check WebGL availability once
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      if (!gl) setUseFallback(true)
    } catch {
      setUseFallback(true)
    }
  }, [])

  if (useFallback) {
    return <FallbackSphere glowColor={glowColor} size={size} />
  }

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <Canvas
        camera={{ position: [0, 0, 2.8], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        // R3F automatically disposes geometries, materials, and textures on unmount
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Suspense fallback={null}>
          <RotatingSphere
            textureFile={textureFile}
            ringEnabled={ringEnabled}
            glowColor={glowColor}
            onError={() => setUseFallback(true)}
          />
        </Suspense>
      </Canvas>

      {/* Outer glow ring behind canvas (CSS) */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none -z-10"
        style={{
          boxShadow: `0 0 ${size * 0.4}px ${glowColor}30, 0 0 ${size * 0.8}px ${glowColor}12`,
        }}
      />
    </div>
  )
}
