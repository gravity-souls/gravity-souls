import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { defaultLocale, isLocale } from '@/lib/i18n-locales'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

async function setLocaleCookie(language: string) {
  const cookieStore = await cookies()
  cookieStore.set('locale', language, {
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  })
}

export async function GET() {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  })

  const language = (user && isLocale(user.language)) ? user.language : defaultLocale
  await setLocaleCookie(language)

  return NextResponse.json({ language })
}

export async function PATCH(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  let body: { language?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!isLocale(body.language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { language: body.language },
  })
  await setLocaleCookie(body.language)

  return NextResponse.json({ success: true, language: body.language })
}
