import { readJson, safeApiError } from '@/lib/api-input'
import { eventStatusSchema } from '@/lib/input-schemas'
import { EventStatus, NotificationType } from '@prisma/client'
import { NotificationTemplates, createNotification } from '@/lib/createNotification'
import { tNotification } from '@/lib/notification-i18n'
import { resolveLocale } from '@/lib/i18n-locales'
import { getCommunityAccess, jsonError } from '@/lib/galaxy-events'
import { grantXP } from '@/lib/grantXP'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  try {
    let session
    try {
      session = await requireUser()
    } catch (res) {
      return res as Response
    }

    const { id, eventId } = await params
    const userId = session.user.id
    const access = await getCommunityAccess(id, userId)

    if (!access) return jsonError('Galaxy not found', 404)
    if (!access.isAdmin) return jsonError('Only galaxy admins can review event proposals', 403)

    const input = await readJson(request, eventStatusSchema)
    if (!input.ok) return input.response
    const body = input.data
    const status = body.status === 'APPROVED' ? EventStatus.APPROVED : body.status === 'REJECTED' ? EventStatus.REJECTED : null
    const rejectionReason = typeof body.rejectionReason === 'string' && body.rejectionReason.trim()
      ? body.rejectionReason.trim()
      : null

    if (!status) return jsonError('Status must be APPROVED or REJECTED', 400)

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        proposer: { select: { id: true, name: true, language: true } },
        galaxy: {
          select: {
            id: true,
            slug: true,
            name: true,
            memberships: { select: { userId: true, user: { select: { language: true } } } },
          },
        },
      },
    })

    if (!event || event.galaxyId !== id) return jsonError('Event not found', 404)

    const updatedEvent = await prisma.event.update({
      where: { id: event.id },
      data: { status },
      select: { id: true, status: true, title: true },
    })

    const eventsActionUrl = `/galaxy/${event.galaxy.slug}#events`

    if (status === EventStatus.APPROVED) {
      const proposerLocale = resolveLocale(event.proposer.language)
      await createNotification({
        userId: event.proposerId,
        type: NotificationType.GALAXY_NEW_EVENT,
        title: await tNotification(proposerLocale, 'eventApprovedTitle'),
        body: await tNotification(proposerLocale, 'eventApprovedBody', { title: event.title, galaxy: event.galaxy.name }),
        actionUrl: eventsActionUrl,
      })

      // Each member gets the notification in their own locale, not the admin's —
      // group by locale so we only translate once per distinct locale, not once per member.
      const membersByLocale = new Map<string, string[]>()
      for (const member of event.galaxy.memberships) {
        const locale = resolveLocale(member.user.language)
        const ids = membersByLocale.get(locale) ?? []
        ids.push(member.userId)
        membersByLocale.set(locale, ids)
      }

      for (const [locale, userIds] of membersByLocale) {
        const template = await NotificationTemplates.galaxyNewEvent(
          event.galaxy.name,
          event.title,
          eventsActionUrl,
          resolveLocale(locale),
        )
        await prisma.notification.createMany({
          data: userIds.map((userId) => ({ userId, ...template })),
        })
      }

      const xpEvent = await grantXP(event.proposerId, 'EVENT_APPROVED')
      return Response.json({ event: updatedEvent, xpEvent, leveledUp: xpEvent.leveledUp })
    }

    const proposerLocale = resolveLocale(event.proposer.language)
    await createNotification({
      userId: event.proposerId,
      type: NotificationType.GALAXY_NEW_EVENT,
      title: await tNotification(proposerLocale, 'eventProposalUpdateTitle'),
      body: rejectionReason ?? await tNotification(proposerLocale, 'eventProposalRejectedBody'),
      actionUrl: eventsActionUrl,
    })

    return Response.json({ event: updatedEvent })

  } catch (error) {
    return safeApiError(error)
  }
}