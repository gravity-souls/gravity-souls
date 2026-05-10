import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

interface PlanetConfigBody {
  baseTexture?: unknown
  tintColor?: unknown
  atmosphereColor?: unknown
  atmosphereDensity?: unknown
  hasRing?: unknown
  ringColor?: unknown
  rotationSpeed?: unknown
  cloudOpacity?: unknown
  customTextureUrl?: unknown
}

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

function isTextureName(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9_-]+\.jpg$/i.test(value)
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isCustomTextureUrl(value: unknown): value is string | null | undefined {
  if (value === undefined || value === null || value === '') return true
  if (typeof value !== 'string') return false
  if (/^\/uploads\/planet-textures\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(value)) return true

  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:'
      && url.hostname.endsWith('.public.blob.vercel-storage.com')
      && /^\/planet-textures\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/i.test(url.pathname)
    )
  } catch {
    return false
  }
}

export async function PATCH(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  let body: PlanetConfigBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    baseTexture,
    tintColor,
    atmosphereColor,
    atmosphereDensity = 0.12,
    hasRing,
    ringColor,
    rotationSpeed = 0.018,
    cloudOpacity = 0,
    customTextureUrl,
  } = body

  if (!isTextureName(baseTexture)) {
    return NextResponse.json({ error: 'baseTexture must be a texture jpg filename' }, { status: 400 })
  }
  if (!isHexColor(tintColor)) {
    return NextResponse.json({ error: 'tintColor must be a hex color' }, { status: 400 })
  }
  if (!isHexColor(atmosphereColor)) {
    return NextResponse.json({ error: 'atmosphereColor must be a hex color' }, { status: 400 })
  }
  if (!isNumberInRange(atmosphereDensity, 0, 0.3)) {
    return NextResponse.json({ error: 'atmosphereDensity must be between 0 and 0.3' }, { status: 400 })
  }
  if (typeof hasRing !== 'boolean') {
    return NextResponse.json({ error: 'hasRing must be a boolean' }, { status: 400 })
  }
  if (typeof ringColor !== 'string' || (ringColor !== '' && !isHexColor(ringColor))) {
    return NextResponse.json({ error: 'ringColor must be empty or a hex color' }, { status: 400 })
  }
  if (!isNumberInRange(rotationSpeed, 0.005, 0.03)) {
    return NextResponse.json({ error: 'rotationSpeed must be between 0.005 and 0.03' }, { status: 400 })
  }
  if (!isNumberInRange(cloudOpacity, 0, 0.5)) {
    return NextResponse.json({ error: 'cloudOpacity must be between 0 and 0.5' }, { status: 400 })
  }
  if (!isCustomTextureUrl(customTextureUrl)) {
    return NextResponse.json({ error: 'customTextureUrl must be an uploaded planet texture URL' }, { status: 400 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { userLevel: true },
  })

  const effectiveUserLevel = Math.max(currentUser?.userLevel ?? 0, 5)

  if (customTextureUrl && effectiveUserLevel < 5) {
    return NextResponse.json({ error: 'Custom textures unlock at Lv.5' }, { status: 403 })
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      planetTexture: baseTexture,
      planetTint: tintColor,
      planetAtmoColor: atmosphereColor,
      planetAtmoDensity: atmosphereDensity,
      planetHasRing: hasRing,
      planetRingColor: ringColor,
      planetRotationSpeed: rotationSpeed,
      planetCloudOpacity: cloudOpacity,
      planetCustomTexture: customTextureUrl || null,
    },
  })

  return NextResponse.json(updatedUser)
}
