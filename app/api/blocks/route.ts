import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { blockSchema } from '@/lib/input-schemas'

// GET /api/blocks - list the users I have blocked (owner-only; never discloses who blocked me)
export async function GET() {
  try {
    const session = await requireUser()

    const blocks = await prisma.block.findMany({
      where: { blockerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: { blockedId: true, createdAt: true },
    })

    return Response.json({ blocked: blocks.map((b) => ({ userId: b.blockedId, since: b.createdAt })) })
  } catch (error) {
    return safeApiError(error)
  }
}

// POST /api/blocks - block a user. Transactionally removes any existing
// follow edges in both directions; blocking always wins over a connection.
export async function POST(request: Request) {
  try {
    const session = await requireUser()
    const userId = session.user.id

    const input = await readJson(request, blockSchema)
    if (!input.ok) return input.response
    const { userId: targetUserId } = input.data

    if (targetUserId === userId) return Response.json({ error: 'Cannot block yourself' }, { status: 400 })

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })
    if (!target) return Response.json({ error: 'Planet not found' }, { status: 404 })

    await prisma.$transaction([
      prisma.block.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: targetUserId } },
        create: { blockerId: userId, blockedId: targetUserId },
        update: {},
      }),
      prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId, followingId: targetUserId },
            { followerId: targetUserId, followingId: userId },
          ],
        },
      }),
    ])

    return Response.json({ blocked: true }, { status: 201 })
  } catch (error) {
    return safeApiError(error)
  }
}
