import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { grantXP } from '@/lib/grantXP'
import { readJson, safeApiError } from '@/lib/api-input'
import { joinSchema } from '@/lib/input-schemas'

export async function POST(request: Request) {
  try {
    const session = await requireUser()
    const input = await readJson(request, joinSchema)
    if (!input.ok) return input.response
    const { communityId } = input.data
    const userId = session.user.id
    const community = await prisma.community.findUnique({ where: { id: communityId }, select: { id: true } })
    if (!community) return Response.json({ error: 'Community not found' }, { status: 404 })

    // Unique membership + skipDuplicates makes concurrent joins idempotent.
    // Ownership is never assigned by joining, even for ownerless communities.
    const result = await prisma.communityMembership.createMany({
      data: [{ userId, communityId, role: 'MEMBER' }],
      skipDuplicates: true,
    })
    const membership = await prisma.communityMembership.findUniqueOrThrow({
      where: { userId_communityId: { userId, communityId } },
    })
    const xpEvent = result.count ? await grantXP(userId, 'GALAXY_JOINED').catch(() => {
      console.error('Community join reward could not be recorded')
      return null
    }) : null
    return Response.json({ joined: true, membership, xpEvent, leveledUp: xpEvent?.leveledUp ?? false })
  } catch (error) {
    return safeApiError(error)
  }
}
