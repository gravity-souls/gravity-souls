import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'planet-textures')
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { userLevel: true },
  })

  const effectiveUserLevel = Math.max(currentUser?.userLevel ?? 0, 5)

  if (effectiveUserLevel < 5) {
    return NextResponse.json({ error: 'Custom textures unlock at Lv.5' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Texture file is required' }, { status: 400 })
  }

  const extension = MIME_TO_EXTENSION[file.type]
  if (!extension) {
    return NextResponse.json({ error: 'Texture must be JPG, PNG, or WEBP' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Texture must be 5MB or smaller' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const filename = `${session.user.id}-${randomUUID()}.${extension}`
  const filePath = path.join(UPLOAD_DIR, filename)

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(filePath, bytes)

  return NextResponse.json({ url: `/uploads/planet-textures/${filename}` })
}
