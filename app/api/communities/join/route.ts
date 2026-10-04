import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { joinSchema } from '@/lib/input-schemas'
import {
  galaxyAccess,
  notify,
  adminIds,
  reward,
  deny,
} from '@/lib/galaxy-workflow'
export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const input = await readJson(request, joinSchema)
    if (!input.ok) return input.response
    const result = await prisma.$transaction(async (tx) => {
      const id = input.data.communityId
      const access = await galaxyAccess(tx, id, user, true)
      if (access.membership)
        return {
          joined: true,
          membership: access.membership,
          requestStatus: 'APPROVED',
        }
      if (
        !(await tx.planet.findFirst({
          where: { userId: user.id, active: true },
        }))
      )
        deny('createPlanetFirst', 403)
      const previous = await tx.communityJoinRequest.findUnique({
        where: { userId_communityId: { userId: user.id, communityId: id } },
      })
      const pending = access.galaxy.joinPolicy === 'APPROVAL' && !access.isAdmin
      const reviewers = await adminIds(tx, id)
      if (pending && reviewers.length === 0) deny('noReviewer', 409)
      const status = pending ? 'PENDING' : 'APPROVED'
      await tx.communityJoinRequest.upsert({
        where: { userId_communityId: { userId: user.id, communityId: id } },
        create: {
          userId: user.id,
          communityId: id,
          status,
          rewarded: !pending,
        },
        update: { status, ...(!pending ? { rewarded: true } : {}) },
      })
      if (pending) {
        if (previous?.status !== 'PENDING')
          await notify(
            tx,
            reviewers,
            'galaxyJoinRequested',
            `/galaxy/${access.galaxy.slug}/manage`,
            { galaxy: access.galaxy.name },
          )
        return { joined: false, requestStatus: 'PENDING' }
      }
      const membership = await tx.communityMembership.create({
        data: { userId: user.id, communityId: id },
      })
      if (!previous?.rewarded) await reward(tx, user.id, 'GALAXY_JOINED')
      return { joined: true, membership, requestStatus: 'APPROVED' }
    })
    return Response.json(result)
  } catch (error) {
    return safeApiError(error)
  }
}
