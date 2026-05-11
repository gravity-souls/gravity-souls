import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

interface ReadBody {
  ids?: unknown
  all?: unknown
}

export async function PATCH(request: Request) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  let body: ReadBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const userId = session.user.id

  if (body.all === true) {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })

    return NextResponse.json({ updated: result.count })
  }

  if (!Array.isArray(body.ids) || !body.ids.every((id) => typeof id === 'string')) {
    return NextResponse.json({ error: 'ids must be a string array or all must be true' }, { status: 400 })
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId,
      id: { in: body.ids },
      read: false,
    },
    data: { read: true },
  })

  return NextResponse.json({ updated: result.count })
}
