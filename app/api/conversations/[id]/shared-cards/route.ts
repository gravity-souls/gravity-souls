import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { resourceId } from '@/lib/input-schemas'
import { visibleConversationWhere } from '@/lib/inbox'
import { hydrateSharedMessages } from '@/lib/chat-shares'
import { invitationHeaders } from '@/lib/beam-invitations'
const schema = z.object({ ids: z.array(resourceId).min(1).max(100) }).strict()
// Read-only POST: bounded IDs keep refresh queries out of URLs; never acknowledges reads.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(), { id } = await params
    if (!await prisma.conversationThread.findFirst({ where: { ...await visibleConversationWhere(user.id), id }, select: { id: true } })) return Response.json({ error: 'unavailable' }, { status: 404 })
    const input = await readJson(request, schema)
    if (!input.ok) return input.response
    const rows = await prisma.directMessage.findMany({ where: { conversationId: id, type: 'share', id: { in: input.data.ids } }, take: 100 })
    return Response.json({ messages: await hydrateSharedMessages(rows, user) }, { headers: invitationHeaders })
  } catch (error) { return safeApiError(error) }
}
