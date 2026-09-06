import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'

// GET /api/follows/[userId] - follow status between the current user and another user
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await requireUser()
    const { userId: otherUserId } = await params
    const viewerId = session.user.id

    const [amFollowing, followsMe] = await Promise.all([
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: otherUserId } },
        select: { id: true },
      }),
      prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: otherUserId, followingId: viewerId } },
        select: { id: true },
      }),
    ])

    return Response.json({ following: !!amFollowing, followedBy: !!followsMe })
  } catch (error) {
    return safeApiError(error)
  }
}

// DELETE /api/follows/[userId] - unfollow. Only the follower may remove their own outgoing edge.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await requireUser()
    const { userId: targetUserId } = await params
    const userId = session.user.id

    await prisma.follow.deleteMany({ where: { followerId: userId, followingId: targetUserId } })

    return Response.json({ following: false })
  } catch (error) {
    return safeApiError(error)
  }
}
