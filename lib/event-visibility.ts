import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { blockedUserIds, isBlocked } from '@/lib/visibility'
import { deny } from '@/lib/galaxy-workflow'

export async function eventProposerWhere(userId: string): Promise<Prisma.EventWhereInput> {
  const blocked = await blockedUserIds(userId)
  return { proposerId: { notIn: [...blocked] }, proposer: { deletedAt: null } }
}

export async function assertEventProposerVisible(userId: string, proposer: { id: string; deletedAt: Date | null }, db: Pick<Prisma.TransactionClient, 'block'> = prisma) {
  if (proposer.deletedAt || await isBlocked(userId, proposer.id, db)) deny('notFound', 404)
}
