import { NotificationType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function createNotification({
  userId,
  type,
  title,
  body,
  actionUrl,
}: {
  userId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
}) {
  return prisma.notification.create({
    data: { userId, type, title, body, actionUrl },
  })
}

export const NotificationTemplates = {
  resonanceReceived: (senderName: string, actionUrl: string) => ({
    type: NotificationType.RESONANCE_RECEIVED,
    title: 'A planet has entered your orbit',
    body: `${senderName} sent you a resonance signal`,
    actionUrl,
  }),
  resonanceAccepted: (senderName: string, actionUrl: string) => ({
    type: NotificationType.RESONANCE_ACCEPTED,
    title: 'Your signal was received',
    body: `${senderName} responded to your resonance`,
    actionUrl,
  }),
  galaxyNewPost: (galaxyName: string, actionUrl: string) => ({
    type: NotificationType.GALAXY_NEW_POST,
    title: `New signal in ${galaxyName}`,
    body: 'A new post was shared in your galaxy',
    actionUrl,
  }),
  galaxyNewEvent: (galaxyName: string, eventName: string, actionUrl: string) => ({
    type: NotificationType.GALAXY_NEW_EVENT,
    title: `New event in ${galaxyName}`,
    body: eventName,
    actionUrl,
  }),
  eventReminder: (eventName: string, actionUrl: string) => ({
    type: NotificationType.EVENT_REMINDER,
    title: 'Event starting soon',
    body: `${eventName} is happening in 24 hours`,
    actionUrl,
  }),
  levelUp: (newLevel: number, levelName: string) => ({
    type: NotificationType.LEVEL_UP,
    title: 'You have evolved',
    body: `You are now ${levelName}`,
    actionUrl: '/my-planet',
  }),
  newMatch: () => ({
    type: NotificationType.NEW_MATCH,
    title: 'New planets in your orbit',
    body: 'Your daily resonance matches are ready',
    actionUrl: '/resonance',
  }),
  commentReceived: (commenterName: string, actionUrl: string) => ({
    type: NotificationType.COMMENT_RECEIVED,
    title: 'Someone resonated with your signal',
    body: `${commenterName} left a comment`,
    actionUrl,
  }),
  commentReplyReceived: (commenterName: string, actionUrl: string) => ({
    type: NotificationType.COMMENT_RECEIVED,
    title: 'Someone replied to your comment',
    body: `${commenterName} replied to you`,
    actionUrl,
  }),
}
