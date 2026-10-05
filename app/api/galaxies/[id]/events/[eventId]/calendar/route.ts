import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { galaxyAccess, deny } from '@/lib/galaxy-workflow'
import { assertEventProposerVisible } from '@/lib/event-visibility'
import { eventCalendar } from '@/lib/event-calendar'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  try {
    const { user } = await requireUser()
    const { id, eventId } = await params
    if (!await prisma.user.findFirst({ where: { id: user.id, deletedAt: null }, select: { id: true } })) deny('Unauthorized', 401)
    const access = await galaxyAccess(prisma, id, user)
    const event = await prisma.event.findUnique({ where: { id: eventId }, include: {
      proposer: { select: { id: true, deletedAt: true } },
      rsvps: { where: { userId: user.id }, select: { status: true } },
    } })
    if (!event || event.galaxyId !== id || !access.membership && !access.isAdmin && event.proposerId !== user.id) deny('notFound', 404)
    await assertEventProposerVisible(user.id, event.proposer)
    if (event.status !== 'APPROVED' || event.date <= new Date()) deny('eventClosed', 409)
    if (event.rsvps[0]?.status !== 'APPROVED' && event.proposerId !== user.id) deny('attendanceRequired', 403)
    return new Response(eventCalendar(event), { headers: {
      'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="gravity-souls-activity.ics"',
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
    } })
  } catch (error) { return safeApiError(error) }
}
