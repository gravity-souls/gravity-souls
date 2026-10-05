import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { REACTION_EMOJI } from '@/lib/chat-interaction-types'
import { summarizeReactions } from '@/lib/chat-interactions'
import { imageConversation, lockImageConversation, imageHeaders, imageUnavailable } from '@/lib/chat-images'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
const schema=z.object({emoji:z.enum(REACTION_EMOJI).nullable()}).strict()
export async function PUT(request:Request,{params}:{params:Promise<{id:string;messageId:string}>}) {
  try {
    const {user}=await requireUser(),{id,messageId}=await params
    const {otherId}=await imageConversation(user.id,id,true)
    const input=await readJson(request,schema);if(!input.ok)return input.response
    const emoji=input.data.emoji
    const result=await prisma.$transaction(async tx=>{
      await lockImageConversation(tx,user.id,id,otherId)
      await tx.$queryRaw`SELECT "id" FROM "direct_message" WHERE "id" = ${messageId} AND "conversationId" = ${id} FOR UPDATE`
      const message=await tx.directMessage.findFirst({where:{id:messageId,conversationId:id}})
      if(!message)throw imageUnavailable()
      const existing=await tx.directMessageReaction.findUnique({where:{messageId_userId:{messageId,userId:user.id}}})
      let reactionVersion=message.reactionVersion
      if((existing?.emoji ?? null)!==emoji){
        const limit=RATE_LIMITS.MESSAGE_REACTION
        if(!await checkRateLimit(rateLimitKey('MESSAGE_REACTION',user.id),limit.limit,limit.windowMs,tx))throw Response.json({error:'rateLimited'},{status:429})
        if(emoji)await tx.directMessageReaction.upsert({where:{messageId_userId:{messageId,userId:user.id}},create:{messageId,userId:user.id,emoji},update:{emoji}})
        else await tx.directMessageReaction.deleteMany({where:{messageId,userId:user.id}})
        reactionVersion=(await tx.directMessage.update({where:{id:messageId},data:{reactionVersion:{increment:1}}})).reactionVersion
      }
      const rows=await tx.directMessageReaction.findMany({where:{messageId,user:{deletedAt:null}},select:{emoji:true,userId:true}})
      return {id:messageId,reactionVersion,reactions:summarizeReactions(rows,user.id)}
    })
    return Response.json(result,{headers:imageHeaders})
  } catch(error){return safeApiError(error)}
}
