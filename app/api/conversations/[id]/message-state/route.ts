import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { resourceId } from '@/lib/input-schemas'
import { imageConversation, imageHeaders } from '@/lib/chat-images'
import { hydrateMessageState } from '@/lib/chat-interactions'
const schema = z.object({ ids: z.array(resourceId).min(1).max(100) }).strict()
// Read-only POST, no read acknowledgements; bounded history refresh.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(), { id } = await params
    await imageConversation(user.id,id)
    const input = await readJson(request,schema); if (!input.ok) return input.response
    const rows = await prisma.directMessage.findMany({where:{conversationId:id,id:{in:input.data.ids}},take:100})
    return Response.json({messages:await hydrateMessageState(rows,user)},{headers:imageHeaders})
  } catch (error) { return safeApiError(error) }
}
