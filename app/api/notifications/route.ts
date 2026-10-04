import { z } from 'zod'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { visibleConversationWhere } from '@/lib/inbox'
import { safeApiError } from '@/lib/api-input'
import { safeNotificationTarget } from '@/lib/notification-target'

const query = z
  .object({ cursor: z.string().min(1).max(100).optional() })
  .strict()
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const parsed = query.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!parsed.success)
      return NextResponse.json({ error: 'invalidQuery' }, { status: 400 })
    const cursor = parsed.data.cursor
    if (
      cursor &&
      !(await prisma.notification.findFirst({
        where: { id: cursor, userId: user.id },
        select: { id: true },
      }))
    )
      return NextResponse.json({ error: 'invalidCursor' }, { status: 400 })
    const [rows, unreadCount, unreadMessagesCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 31,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
      prisma.directMessage.count({
        where: {
          senderId: { not: user.id },
          readAt: null,
          conversation: await visibleConversationWhere(user.id),
        },
      }),
    ])
    const more = rows.length > 30
    if (more) rows.pop()
    return NextResponse.json(
      {
        notifications: rows.map((row) => ({
          ...row,
          actionUrl: safeNotificationTarget(row.actionUrl),
        })),
        unreadCount,
        unreadMessagesCount,
        nextCursor: more ? rows.at(-1)!.id : null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return safeApiError(error)
  }
}
