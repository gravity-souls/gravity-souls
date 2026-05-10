import { prisma } from '@/lib/prisma'
import { XP_EVENTS, type XPEventType, calculateLevel } from '@/lib/xp'

export async function grantXP(
  userId: string,
  eventType: XPEventType,
): Promise<{ newXP: number; newLevel: number; leveledUp: boolean }> {
  const amount = XP_EVENTS[eventType]

  if (eventType === 'PROFILE_COMPLETED') {
    const existing = await prisma.xPEvent.findFirst({
      where: { userId, type: eventType },
      select: { id: true },
    })

    if (existing) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true, userLevel: true },
      })

      return {
        newXP: user?.xp ?? 0,
        newLevel: user?.userLevel ?? 1,
        leveledUp: false,
      }
    }
  }

  const [, updatedUser] = await prisma.$transaction([
    prisma.xPEvent.create({
      data: { userId, type: eventType, xpGranted: amount },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: amount } },
      select: { xp: true, userLevel: true },
    }),
  ])

  const newLevel = calculateLevel(updatedUser.xp)
  const leveledUp = newLevel > updatedUser.userLevel

  if (leveledUp) {
    await prisma.user.update({
      where: { id: userId },
      data: { userLevel: newLevel },
    })
  }

  return {
    newXP: updatedUser.xp,
    newLevel,
    leveledUp,
  }
}

export async function grantDailyLoginXP(userId: string) {
  const now = new Date()
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const existing = await prisma.xPEvent.findFirst({
    where: {
      userId,
      type: 'DAILY_LOGIN',
      createdAt: { gte: todayUtc },
    },
    select: { id: true },
  })

  if (existing) return null

  return grantXP(userId, 'DAILY_LOGIN')
}
