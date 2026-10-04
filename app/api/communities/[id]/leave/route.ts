import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { safeApiError } from '@/lib/api-input'
import { galaxyAccess, deny } from '@/lib/galaxy-workflow'
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    await prisma.$transaction(async (tx) => {
      const access = await galaxyAccess(tx, id, user, true)
      if (access.galaxy.creatorId === user.id)
        deny('transferBeforeLeaving', 409)
      if (
        !access.galaxy.creatorId &&
        access.membership?.role === 'ADMIN' &&
        (await tx.communityMembership.count({
          where: { communityId: id, role: 'ADMIN' },
        })) <= 1
      )
        deny('transferBeforeLeaving', 409)
      await tx.communityMembership.deleteMany({
        where: { communityId: id, userId: user.id },
      })
      await tx.communityJoinRequest.updateMany({
        where: { communityId: id, userId: user.id },
        data: { status: 'CANCELLED' },
      })
      await tx.eventRSVP.updateMany({
        where: {
          userId: user.id,
          event: { galaxyId: id, date: { gt: new Date() } },
          status: { in: ['PENDING', 'APPROVED'] },
        },
        data: { status: 'CANCELLED' },
      })
    })
    return Response.json({ joined: false })
  } catch (error) {
    return safeApiError(error)
  }
}
