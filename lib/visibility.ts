import { prisma } from '@/lib/prisma'

/**
 * A block is never disclosed to the blocked user and never overridden by a
 * follow or a match score (approved). All checks here are server-side;
 * never filter for this on the client.
 */
export async function isBlocked(userIdA: string, userIdB: string): Promise<boolean> {
  if (userIdA === userIdB) return false
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: userIdA, blockedId: userIdB },
        { blockerId: userIdB, blockedId: userIdA },
      ],
    },
    select: { id: true },
  })
  return !!block
}

export async function blockedUserIds(viewerId: string): Promise<Set<string>> {
  const blocks = await prisma.block.findMany({
    where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] },
    select: { blockerId: true, blockedId: true },
  })
  const ids = new Set<string>()
  for (const b of blocks) ids.add(b.blockerId === viewerId ? b.blockedId : b.blockerId)
  return ids
}

/**
 * Can viewerId see targetUserId's planet/profile? A missing Profile row
 * (not yet created) defaults to the approved MEMBERS-visible default.
 * The owner can always view their own planet.
 */
export async function canViewProfile(viewerId: string | null, targetUserId: string): Promise<boolean> {
  if (viewerId === targetUserId) return true
  if (!viewerId) return false
  if (await isBlocked(viewerId, targetUserId)) return false

  const profile = await prisma.profile.findUnique({
    where: { userId: targetUserId },
    select: { visibility: true },
  })
  const visibility = profile?.visibility ?? 'MEMBERS'
  if (visibility === 'MEMBERS') return true

  // PRIVATE: visible only to a mutual connection (either direction follows).
  const connection = await prisma.follow.findFirst({
    where: {
      OR: [
        { followerId: viewerId, followingId: targetUserId },
        { followerId: targetUserId, followingId: viewerId },
      ],
    },
    select: { id: true },
  })
  return !!connection
}

/**
 * Can actorId start new contact (DM, follow) with targetUserId? Blocks
 * always win. New DMs additionally require a mutual follow (approved),
 * checked separately by the caller via mutualFollow().
 */
export async function canContact(actorId: string, targetUserId: string): Promise<boolean> {
  if (actorId === targetUserId) return false
  return !(await isBlocked(actorId, targetUserId))
}

export async function mutualFollow(userIdA: string, userIdB: string): Promise<boolean> {
  const [aFollowsB, bFollowsA] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userIdA, followingId: userIdB } }, select: { id: true } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userIdB, followingId: userIdA } }, select: { id: true } }),
  ])
  return !!aFollowsB && !!bFollowsA
}
