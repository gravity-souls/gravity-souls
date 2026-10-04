// --- Server-side notification translation --------------------------------
// Notifications are created server-side (API routes, background jobs) with
// no React tree to pull next-intl's useTranslations from. This resolves the
// RECIPIENT's stored language preference (user.language) and looks up a
// string from the same messages/*.json files next-intl uses client-side,
// under the flat `notifications.*` namespace.
//
// NotificationTemplates resolve recipient-language copy for every template.
// Previously stored notifications retain their original text.

import { defaultLocale, resolveLocale, type Locale } from '@/lib/i18n-locales'
import { prisma } from '@/lib/prisma'

export async function getUserLocale(userId: string): Promise<Locale> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { language: true } })
  return resolveLocale(user?.language)
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => params[key] ?? `{${key}}`)
}

export async function tNotification(
  locale: Locale,
  key: string,
  params?: Record<string, string>,
): Promise<string> {
  const messages = (await import(`@/messages/${locale}.json`)).default as {
    notifications?: Record<string, string>
  }
  const fallbackMessages =
    locale === defaultLocale
      ? messages
      : ((await import(`@/messages/${defaultLocale}.json`)).default as { notifications?: Record<string, string> })

  const template = messages.notifications?.[key] ?? fallbackMessages.notifications?.[key] ?? key
  return interpolate(template, params)
}
