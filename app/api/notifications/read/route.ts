import { z } from 'zod'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
const readSchema = z.union([
  z.object({ all: z.literal(true) }).strict(),
  z
    .object({ ids: z.array(z.string().min(1).max(100)).min(1).max(100) })
    .strict(),
])
export async function PATCH(request: Request) {
  try {
    const { user } = await requireUser()
    const input = await readJson(request, readSchema)
    if (!input.ok) return input.response
    const result = await prisma.notification.updateMany({
      where: {
        userId: user.id,
        read: false,
        ...('ids' in input.data ? { id: { in: input.data.ids } } : {}),
      },
      data: { read: true },
    })
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })
    return NextResponse.json({ updated: result.count, unreadCount })
  } catch (error) {
    return safeApiError(error)
  }
}
