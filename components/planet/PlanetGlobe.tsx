'use client'

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { BackSide, DoubleSide, type Mesh } from 'three'
import PlanetAvatar from '@/components/planet/PlanetAvatar'
import type { PlanetConfig } from '@/types/planet'

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

function PlanetScene({ planetConfig, sceneScale }: { planetConfig: PlanetConfig; sceneScale: number }) {
  return (
    <>
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
  const sceneScale = framing === 'avatar' ? 0.9 : 0.58

  useEffect(() => {
    let cancelled = false

    Promise.resolve().then(() => {
      if (!cancelled) setWebGLAvailable(hasWebGLSupport())
    })

    return () => { cancelled = true }
  }, [])

  if (webGLAvailable === false) {
    return <PlanetAvatar planetConfig={planetConfig} size={size} rotating rotationDuration={22} className="mx-auto" />
  }

  if (webGLAvailable === null) {
    return <GlobeFallback planetConfig={planetConfig} size={size} />
  }

  return (
    <PlanetGlobeErrorBoundary fallback={<PlanetAvatar planetConfig={planetConfig} size={size} rotating rotationDuration={22} className="mx-auto" />}>
      <Suspense fallback={<GlobeFallback planetConfig={planetConfig} size={size} />}>
        <div className="relative" style={{ width: size, height: size }}>
          <Canvas
            camera={{ position: [0, 0, 2.8], fov: 45 }}
            gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
            style={{ width: size, height: size, background: 'transparent' }}
            onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          >
            <Suspense fallback={null}>
              <PlanetScene planetConfig={planetConfig} sceneScale={sceneScale} />
            </Suspense>
          </Canvas>
        </div>
      </Suspense>
    </PlanetGlobeErrorBoundary>
  )
}