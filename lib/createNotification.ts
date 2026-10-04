import { NotificationType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { tNotification } from '@/lib/notification-i18n'
import type { Locale } from '@/lib/i18n-locales'

export function createNotification({
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
async function localized(
  type: NotificationType,
  key: string,
  locale: Locale,
  actionUrl: string,
  params: Record<string, string> = {},
) {
  return {
    type,
    title: await tNotification(locale, key + 'Title', params),
    body: await tNotification(locale, key + 'Body', params),
    actionUrl,
  }
}
export const NotificationTemplates = {
  resonanceReceived: (name: string, url: string, locale: Locale) =>
    localized(
      NotificationType.RESONANCE_RECEIVED,
      'resonanceReceived',
      locale,
      url,
      { name },
    ),
  resonanceAccepted: (name: string, url: string, locale: Locale) =>
    localized(
      NotificationType.RESONANCE_ACCEPTED,
      'resonanceAccepted',
      locale,
      url,
      { name },
    ),
  galaxyNewPost: (galaxy: string, url: string, locale: Locale) =>
    localized(NotificationType.GALAXY_NEW_POST, 'galaxyPost', locale, url, {
      galaxy,
    }),
  galaxyNewEvent: async (
    galaxy: string,
    event: string,
    url: string,
    locale: Locale,
  ) => ({
    type: NotificationType.GALAXY_NEW_EVENT,
    title: await tNotification(locale, 'eventNewTitle', { galaxy }),
    body: event,
    actionUrl: url,
  }),
  eventReminder: (event: string, url: string, locale: Locale) =>
    localized(NotificationType.EVENT_REMINDER, 'eventReminder', locale, url, {
      event,
    }),
  levelUp: (level: number, _name: string, locale: Locale) =>
    localized(NotificationType.LEVEL_UP, 'levelUp', locale, '/my-planet', {
      level: String(level),
    }),
  newMatch: (locale: Locale) =>
    localized(NotificationType.NEW_MATCH, 'newMatch', locale, '/resonance'),
  commentReceived: (name: string, url: string, locale: Locale) =>
    localized(
      NotificationType.COMMENT_RECEIVED,
      'commentReceived',
      locale,
      url,
      { name },
    ),
  commentReplyReceived: (name: string, url: string, locale: Locale) =>
    localized(NotificationType.COMMENT_RECEIVED, 'commentReply', locale, url, {
      name,
    }),
  newFollower: (name: string, url: string, locale: Locale) =>
    localized(NotificationType.NEW_FOLLOWER, 'newFollower', locale, url, {
      name,
    }),
  newMessage: (name: string, url: string, locale: Locale) =>
    localized(NotificationType.NEW_MESSAGE, 'newMessage', locale, url, {
      name,
    }),
}
