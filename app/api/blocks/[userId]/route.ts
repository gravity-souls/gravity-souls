import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'

// DELETE /api/blocks/[userId] - unblock. Only the blocker may remove their own block.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const session = await requireUser()
    const { userId: targetUserId } = await params
    const userId = session.user.id

    await prisma.block.deleteMany({ where: { blockerId: userId, blockedId: targetUserId } })

    return Response.json({ blocked: false })
  } catch (error) {
    return safeApiError(error)
  }
}
