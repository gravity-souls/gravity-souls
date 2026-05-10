import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { grantXP } from '@/lib/grantXP'
import { requireLevel } from '@/lib/requireLevel'

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

  const currentUserConfig = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      planetTint: true,
      planetAtmoColor: true,
      planetAtmoDensity: true,
      planetHasRing: true,
      planetRingColor: true,
      planetRotationSpeed: true,
      planetCloudOpacity: true,
      planetCustomTexture: true,
    },
  })

  if (!currentUserConfig) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  async function requireConfigLevel(minLevel: number, message: string) {
    const levelCheck = await requireLevel(request, minLevel)
    if (!levelCheck.authorized) {
      return NextResponse.json({ error: message }, { status: 403 })
    }

    return null
  }

  if (tintColor !== currentUserConfig.planetTint) {
    const response = await requireConfigLevel(2, 'Planet colors unlock at Lv.2')
    if (response) return response
  }

  if (
    atmosphereColor !== currentUserConfig.planetAtmoColor
    || atmosphereDensity !== currentUserConfig.planetAtmoDensity
    || hasRing !== currentUserConfig.planetHasRing
    || ringColor !== currentUserConfig.planetRingColor
  ) {
    const response = await requireConfigLevel(3, 'Atmosphere and rings unlock at Lv.3')
    if (response) return response
  }

  if (
    rotationSpeed !== currentUserConfig.planetRotationSpeed
    || cloudOpacity !== currentUserConfig.planetCloudOpacity
  ) {
    const response = await requireConfigLevel(4, 'Motion and surface controls unlock at Lv.4')
    if (response) return response
  }

  if ((customTextureUrl || null) !== currentUserConfig.planetCustomTexture) {
    const response = await requireConfigLevel(5, 'Custom textures unlock at Lv.5')
    if (response) return response
  }

  const hasProfileCompletedXP = await prisma.xPEvent.findFirst({
    where: { userId: session.user.id, type: 'PROFILE_COMPLETED' },
    select: { id: true },
  })

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

  const xpEvent = hasProfileCompletedXP ? null : await grantXP(session.user.id, 'PROFILE_COMPLETED')

  return NextResponse.json({ ...updatedUser, xpEvent, leveledUp: xpEvent?.leveledUp ?? false })
}
