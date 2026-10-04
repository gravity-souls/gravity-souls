import { isBlocked } from '@/lib/visibility'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { activeEvent, deny, lockedEvent } from '@/lib/galaxy-workflow'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'

type Context = { params: Promise<{ id: string; eventId: string }> }

async function readOrSave(context: Context, save: boolean) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await context.params
    if (save) {
      const { limit, windowMs } = RATE_LIMITS.EVENT_INTEREST
      if (!await checkRateLimit(rateLimitKey('EVENT_INTEREST', user.id), limit, windowMs)) deny('rateLimited', 429)
    }
    const result = await prisma.$transaction(async tx => {
      const access = await lockedEvent(tx, id, eventId, user)
      if ((!access.membership && !access.isAdmin) || !['APPROVED', 'PASSED', 'CANCELLED'].includes(access.event.status)) deny('notFound', 404)
      // Use the same bidirectional block rule within this transaction.
      const hidden = await isBlocked(user.id, access.event.proposerId, tx)
      if (hidden || access.event.proposer.deletedAt) deny('notFound', 404)
      if (save) {
        activeEvent(access.event)
        await tx.eventInterest.upsert({
          where: { userId_eventId: { userId: user.id, eventId } },
          create: { userId: user.id, eventId }, update: {},
        })
      }
      return !!await tx.eventInterest.findUnique({ where: { userId_eventId: { userId: user.id, eventId } } })
    })
    return Response.json({ interested: result }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}

export async function GET(_request: Request, context: Context) { return readOrSave(context, false) }
export async function POST(_request: Request, context: Context) { return readOrSave(context, true) }
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    // Cleanup is permitted after membership/visibility loss; never reveal existence.
    await prisma.eventInterest.deleteMany({ where: { userId: user.id, eventId, event: { galaxyId: id } } })
    return new Response(null, { status: 204 })
  } catch (error) { return safeApiError(error) }
}
