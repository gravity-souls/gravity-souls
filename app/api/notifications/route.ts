import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function GET() {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const userId = session.user.id

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ])

  return NextResponse.json({ notifications, unreadCount })
}
