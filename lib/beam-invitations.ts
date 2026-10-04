import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canContact, canViewProfile } from '@/lib/visibility'

export async function lockContactPair(tx: Prisma.TransactionClient, a: string, b: string) {
  await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" IN (${Prisma.join([a, b].sort())}) ORDER BY "id" FOR NO KEY UPDATE`
}
export async function permittedInvitationPair(a: string, b: string, db: Pick<Prisma.TransactionClient, 'user' | 'block' | 'profile' | 'follow'> = prisma) {
  if (a === b) return false
  const users = await db.user.count({ where: { id: { in: [a, b] }, deletedAt: null } })
  return users === 2 && await canContact(a, b, db) && await canViewProfile(a, b, db) && await canViewProfile(b, a, db)
}
export function canonicalPair(a: string, b: string) {
  const [userAId, userBId] = [a, b].sort()
  return { userAId, userBId }
}
export const invitationHeaders = { 'Cache-Control': 'private, no-store' }
