import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'
import { requireLevel } from '@/lib/requireLevel'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'planet-textures')
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function shouldUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'
}

async function storeTexture({ bytes, contentType, filename }: { bytes: Buffer; contentType: string; filename: string }) {
  if (shouldUseBlobStorage()) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`planet-textures/${filename}`, bytes, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    })

    return blob.url
  }

  if (isProductionRuntime()) {
    throw new Error('missing_blob_storage')
  }

  const filePath = path.join(UPLOAD_DIR, filename)
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(filePath, bytes)

  return `/uploads/planet-textures/${filename}`
}

export async function POST(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Sign in before uploading a custom texture' }, { status: 401 })
  }

  const levelCheck = await requireLevel(request, 5)
  if (!levelCheck.authorized) {
    return NextResponse.json({ error: 'Custom textures unlock at Lv.5' }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Upload request could not be read' }, { status: 400 })
  }

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
  let url: string

  try {
    url = await storeTexture({ bytes, contentType: file.type, filename })
  } catch (error) {
    console.error('Planet texture upload failed', error)

    if (error instanceof Error && error.message === 'missing_blob_storage') {
      return NextResponse.json(
        { error: 'Production uploads need Vercel Blob storage. Add BLOB_READ_WRITE_TOKEN in your deployment.' },
        { status: 500 },
      )
    }

    if (shouldUseBlobStorage()) {
      return NextResponse.json(
        { error: 'Vercel Blob upload failed. Check that BLOB_READ_WRITE_TOKEN belongs to a Blob store connected to this project.' },
        { status: 500 },
      )
    }

    return NextResponse.json(
      { error: 'Texture storage is not available on this server' },
      { status: 500 },
    )
  }

  return NextResponse.json({ url })
}
