import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/session'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 3 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'event-covers')
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

async function storeCover({ bytes, contentType, filename }: { bytes: Buffer; contentType: string; filename: string }) {
  if (shouldUseBlobStorage()) {
    const { put } = await import('@vercel/blob')
    const blob = await put(`event-covers/${filename}`, bytes, {
      access: 'public',
      addRandomSuffix: false,
      contentType,
    })
    return blob.url
  }

  if (isProductionRuntime()) throw new Error('missing_blob_storage')

  const filePath = path.join(UPLOAD_DIR, filename)
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(filePath, bytes)

  return `/uploads/event-covers/${filename}`
}

export async function POST(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch {
    return NextResponse.json({ error: 'Sign in before uploading an event cover' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Upload request could not be read' }, { status: 400 })
  }

  const file = formData.get('file')

  if (!(file instanceof File)) return NextResponse.json({ error: 'Cover image is required' }, { status: 400 })

  const extension = MIME_TO_EXTENSION[file.type]
  if (!extension) return NextResponse.json({ error: 'Cover image must be JPG, PNG, or WEBP' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Cover image must be 3MB or smaller' }, { status: 400 })

  try {
    const bytes = Buffer.from(await file.arrayBuffer())
    const filename = `${session.user.id}-${randomUUID()}.${extension}`
    const url = await storeCover({ bytes, contentType: file.type, filename })
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Event cover upload failed', error)

    if (error instanceof Error && error.message === 'missing_blob_storage') {
      return NextResponse.json(
        { error: 'Production uploads need Vercel Blob storage. Add BLOB_READ_WRITE_TOKEN in your deployment.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: 'Cover image storage is not available on this server' }, { status: 500 })
  }
}