import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { readJson, safeApiError } from '@/lib/api-input'
import { galaxySchema } from '@/lib/input-schemas'
import { galaxyAccess, deny, notify, reward } from '@/lib/galaxy-workflow'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const input = await readJson(request, galaxySchema)
    if (!input.ok) return input.response
    const galaxy = await prisma.$transaction(async (tx) => {
      const access = await galaxyAccess(tx, id, user, true)
      if (!access.isAdmin) deny('adminOnly')
      const updated = await tx.community.update({
        where: { id },
        data: input.data,
      })
      // Opening a previously moderated galaxy resolves pending joins consistently.
      if (
        access.galaxy.joinPolicy === 'APPROVAL' &&
        updated.joinPolicy === 'OPEN'
      ) {
        const pending = await tx.communityJoinRequest.findMany({
          where: { communityId: id, status: 'PENDING' },
        })
        for (const r of pending) {
          await tx.communityMembership.upsert({
            where: {
              userId_communityId: { userId: r.userId, communityId: id },
            },
            create: { userId: r.userId, communityId: id },
            update: {},
          })
          if (!r.rewarded) await reward(tx, r.userId, 'GALAXY_JOINED')
          await tx.communityJoinRequest.update({
            where: { id: r.id },
            data: { status: 'APPROVED', rewarded: true },
          })
        }
        await notify(
          tx,
          pending.map((r) => r.userId),
          'galaxyJoined',
          `/galaxy/${updated.slug}`,
          { galaxy: updated.name },
        )
      }
      return updated
    })
    return Response.json({ galaxy })
  } catch (error) {
    return safeApiError(error)
  }
}
