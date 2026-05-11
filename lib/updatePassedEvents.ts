import { EventStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function updatePassedEvents() {
  await prisma.event.updateMany({
    where: {
      status: EventStatus.APPROVED,
      date: { lt: new Date() },
    },
    data: { status: EventStatus.PASSED },
  })
}