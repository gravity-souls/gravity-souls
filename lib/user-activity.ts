import { prisma } from '@/lib/prisma'

const ACTIVE_WRITE_DEBOUNCE_MS = 60_000

export async function touchUserActivity(userId: string) {
  const staleBefore = new Date(Date.now() - ACTIVE_WRITE_DEBOUNCE_MS)

  await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [
        { lastActiveAt: null },
        { lastActiveAt: { lt: staleBefore } },
      ],
    },
    data: { lastActiveAt: new Date() },
  })
}
