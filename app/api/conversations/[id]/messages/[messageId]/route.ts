import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { imageConversation, imageHeaders, imageUnavailable } from '@/lib/chat-images'
import { hydrateMessageState } from '@/lib/chat-interactions'
export async function GET(_request: Request,{params}:{params:Promise<{id:string;messageId:string}>}) {
  try {
    const {user}=await requireUser(),{id,messageId}=await params
    await imageConversation(user.id,id)
    const message=await prisma.directMessage.findFirst({where:{id:messageId,conversationId:id}})
    if (!message) throw imageUnavailable()
    const [hydrated]=await hydrateMessageState([message],user)
    return Response.json(hydrated,{headers:imageHeaders})
  } catch(error) {return safeApiError(error)}
}
