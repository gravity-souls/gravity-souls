import type { Prisma } from '@prisma/client'
import { blockedUserIds, isBlocked } from '@/lib/visibility'
import { deny } from '@/lib/galaxy-workflow'

export async function eventProposerWhere(userId: string): Promise<Prisma.EventWhereInput> {
  const blocked = await blockedUserIds(userId)
  return { proposerId: { notIn: [...blocked] }, proposer: { deletedAt: null } }
}

export async function assertEventProposerVisible(userId: string, proposer: { id: string; deletedAt: Date | null }) {
  if (proposer.deletedAt || await isBlocked(userId, proposer.id)) deny('notFound', 404)
}
