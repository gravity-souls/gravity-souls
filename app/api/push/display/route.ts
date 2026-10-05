import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { eligiblePush } from '@/lib/push-notifications'
import { pushHeaders } from '@/lib/push-validation'
import { tNotification } from '@/lib/notification-i18n'
import { resolveLocale } from '@/lib/i18n-locales'
export async function GET(request: Request) {
  try {
    const { user, session } = await requireUser()
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !/^[a-zA-Z0-9_-]{1,128}$/.test(id)) return Response.json({}, { status: 404, headers: pushHeaders })
    const row = await eligiblePush(id)
    if (!row || row.subscription.userId !== user.id || row.subscription.sessionId !== session.id || !['sent','pending'].includes(row.status)) return Response.json({}, { status: 404, headers: pushHeaders })
    const locale = resolveLocale(row.subscription.user.language)
    const generic = { en: 'You have a new message.', fr: 'Vous avez un nouveau message.', zh: '你有一条新消息。' }
    const body = row.subscription.preview === 'sender' ? await tNotification(locale, 'newMessageBody', { name: row.message.sender.name }) : generic[locale]
    return Response.json({ title: 'Gravity Souls', body, tag: `chat-${row.message.conversationId}`, url: `/messages/${row.message.conversationId}` }, { headers: pushHeaders })
  } catch (error) { return safeApiError(error) }
}
