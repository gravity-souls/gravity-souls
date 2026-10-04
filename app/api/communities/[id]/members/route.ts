import { requireUser, getOptionalUserSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { readJson, safeApiError } from '@/lib/api-input'
import { galaxyMemberSchema } from '@/lib/input-schemas'
import {
  members,
  galaxyAccess,
  deny,
  notify,
  reward,
} from '@/lib/galaxy-workflow'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getOptionalUserSession()
    const { id } = await params
    return Response.json(await members(id, session?.user ?? null))
  } catch (error) {
    return safeApiError(error)
  }
}
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const input = await readJson(request, galaxyMemberSchema)
    if (!input.ok) return input.response
    await prisma.$transaction(async (tx) => {
      const access = await galaxyAccess(tx, id, user, true)
      const { action, userId } = input.data
      if (action === 'claim') {
        if (!access.isOperator || access.galaxy.creatorId) deny('ownerOnly')
        await tx.community.update({
          where: { id },
          data: { creatorId: user.id },
        })
        await tx.communityMembership.upsert({
          where: { userId_communityId: { userId: user.id, communityId: id } },
          create: { userId: user.id, communityId: id, role: 'ADMIN' },
          update: { role: 'ADMIN' },
        })
        return
      }
      if (!access.isAdmin) deny('adminOnly')
      if (!userId) deny('invalidRequest', 400)
      if (action === 'approveJoin' || action === 'rejectJoin') {
        const r = await tx.communityJoinRequest.findUnique({
          where: { userId_communityId: { userId, communityId: id } },
        })
        if (!r || r.status !== 'PENDING') deny('alreadyReviewed', 409)
        const approved = action === 'approveJoin'
        if (approved)
          await tx.communityMembership.upsert({
            where: { userId_communityId: { userId, communityId: id } },
            create: { userId, communityId: id },
            update: {},
          })
        await tx.communityJoinRequest.update({
          where: { id: r.id },
          data: {
            status: approved ? 'APPROVED' : 'REJECTED',
            rewarded: approved || r.rewarded,
          },
        })
        if (approved && !r.rewarded) await reward(tx, userId, 'GALAXY_JOINED')
        await notify(
          tx,
          [userId],
          approved ? 'galaxyJoined' : 'galaxyJoinRejected',
          `/galaxy/${access.galaxy.slug}`,
          { galaxy: access.galaxy.name },
        )
        return
      }
      const target = await tx.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
      })
      if (!target) deny('notFound', 404)
      if (userId === access.galaxy.creatorId) deny('ownerProtected', 409)
      if (action !== 'remove' && !access.isOwner) deny('ownerOnly')
      if (action === 'remove' && target.role === 'ADMIN' && !access.isOwner)
        deny('ownerOnly')
      if (action === 'transfer') {
        await tx.community.update({
          where: { id },
          data: { creatorId: userId },
        })
        await tx.communityMembership.update({
          where: { id: target.id },
          data: { role: 'ADMIN' },
        })
        await notify(
          tx,
          [userId],
          'galaxyOwnership',
          `/galaxy/${access.galaxy.slug}/manage`,
          { galaxy: access.galaxy.name },
        )
      } else if (action === 'remove') {
        await tx.eventRSVP.updateMany({
          where: {
            userId,
            event: { galaxyId: id, date: { gt: new Date() } },
            status: { in: ['PENDING', 'APPROVED'] },
          },
          data: { status: 'CANCELLED' },
        })
        await tx.communityMembership.delete({ where: { id: target.id } })
        await tx.communityJoinRequest.updateMany({
          where: { userId, communityId: id },
          data: { status: 'CANCELLED' },
        })
        await notify(
          tx,
          [userId],
          'galaxyRemoved',
          `/galaxy/${access.galaxy.slug}`,
          { galaxy: access.galaxy.name },
        )
      } else
        await tx.communityMembership.update({
          where: { id: target.id },
          data: { role: action === 'promote' ? 'ADMIN' : 'MEMBER' },
        })
    })
    return Response.json({ ok: true })
  } catch (error) {
    return safeApiError(error)
  }
}
