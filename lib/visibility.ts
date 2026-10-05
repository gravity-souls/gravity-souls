import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * A block is never disclosed to the blocked user and never overridden by a
 * follow or a match score (approved). All checks here are server-side;
 * never filter for this on the client.
 */
export async function isBlocked(userIdA: string, userIdB: string, db: Pick<Prisma.TransactionClient, 'block'> = prisma): Promise<boolean> {
  if (userIdA === userIdB) return false
  const block = await db.block.findFirst({
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
export async function canViewProfile(viewerId: string | null, targetUserId: string, db: Pick<Prisma.TransactionClient, 'block' | 'profile' | 'follow'> = prisma): Promise<boolean> {
  if (viewerId === targetUserId) return true
  if (!viewerId) return false
  if (await isBlocked(viewerId, targetUserId, db)) return false

  const profile = await db.profile.findUnique({
    where: { userId: targetUserId },
    select: { visibility: true },
  })
  const visibility = profile?.visibility ?? 'MEMBERS'
  if (visibility === 'MEMBERS') return true

  // PRIVATE: visible only to a mutual connection (either direction follows).
  const connection = await db.follow.findFirst({
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
 * always win. New threads need mutual follows or explicit invitation acceptance
 * (ADR 0002), checked separately by their creation routes.
 */
export async function canContact(actorId: string, targetUserId: string, db: Pick<Prisma.TransactionClient, 'block'> = prisma): Promise<boolean> {
  if (actorId === targetUserId) return false
  return !(await isBlocked(actorId, targetUserId, db))
}

export async function mutualFollow(userIdA: string, userIdB: string): Promise<boolean> {
  const [aFollowsB, bFollowsA] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userIdA, followingId: userIdB } }, select: { id: true } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: userIdB, followingId: userIdA } }, select: { id: true } }),
  ])
  return !!aFollowsB && !!bFollowsA
}

/** Conservative discovery boundary, shared by star-map counts and node queries.
 * Private planets remain accessible through permitted detail paths, not discovery.
 */
export async function discoveryPlanetWhere(viewerId: string): Promise<import('@prisma/client').Prisma.PlanetWhereInput> {
  const excluded = await blockedUserIds(viewerId)
  excluded.add(viewerId)
  return {
    active: true,
    userId: { notIn: [...excluded] },
    user: { deletedAt: null, OR: [{ profile: null }, { profile: { is: { visibility: { not: 'PRIVATE' } } } }] },
  }
}

/** Owner-only map collection. Uses the same PRIVATE follow-connected rule as
 * canViewProfile; saves and conversations never grant access by themselves.
 * Relationship predicates stay in SQL so large collections need no ID preload.
 */
export async function personalMapPlanetWhere(
  viewerId: string,
  collection: import('@/types/star-map').PersonalMapCollection,
): Promise<Prisma.PlanetWhereInput> {
  const excluded = await blockedUserIds(viewerId)
  excluded.add(viewerId)
  const outgoing = { user: { followers: { some: { followerId: viewerId } } } }
  const incoming = { user: { following: { some: { followingId: viewerId } } } }
  const saved = { savedBy: { some: { userId: viewerId } } }
  const membership: Prisma.PlanetWhereInput = collection === 'saved' ? saved
    : collection === 'following' ? outgoing
    : collection === 'mutual' ? { AND: [outgoing, incoming] }
    : { OR: [saved, outgoing] }
  return {
    active: true,
    userId: { notIn: [...excluded] },
    user: { deletedAt: null },
    AND: [membership, { OR: [
      { user: { profile: null } },
      { user: { profile: { is: { visibility: 'MEMBERS' } } } },
      outgoing, incoming,
    ] }],
  }
}
