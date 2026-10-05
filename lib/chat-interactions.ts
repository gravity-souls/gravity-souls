import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hydrateSharedMessages } from '@/lib/chat-shares'
import { REACTION_CHOICES, quotePreview, type ReactionSummary, type MessageQuote } from '@/lib/chat-interaction-types'
import type { Actor } from '@/lib/galaxy-workflow'
type Row = Parameters<typeof hydrateSharedMessages>[0][number] & { conversationId: string; replyToId?: string | null; reactionVersion?: number }
type Hydrated = Awaited<ReturnType<typeof hydrateSharedMessages>>[number]
export function quotation(message: Hydrated | undefined): MessageQuote { return quotePreview(message) }
export async function validateReplyTo(db: Prisma.TransactionClient, conversationId: string, replyToId: string | null | undefined, viewer: Actor) {
  if (!replyToId) return
  const target = await db.directMessage.findFirst({ where: { id: replyToId, conversationId } })
  const [message] = target ? await hydrateSharedMessages([target], viewer, db) : []
  if (!quotation(message).available) throw Response.json({ error: 'replyUnavailable' }, { status: 404 })
}
export function summarizeReactions(rows: { emoji: string; userId: string }[], viewerId: string): ReactionSummary[] {
  return REACTION_CHOICES.flatMap(([,emoji]) => {
    const matching = rows.filter(row=>row.emoji===emoji)
    return matching.length ? [{ emoji, count: matching.length, mine: matching.some(row=>row.userId===viewerId) }] : []
  })
}
export async function hydrateMessageState(rows: Row[], viewer: Actor, db: Prisma.TransactionClient = prisma) {
  const ids = rows.map(row=>row.id), replyIds = [...new Set(rows.flatMap(row=>row.replyToId ? [row.replyToId] : []))]
  const [base, sources, reactions] = await Promise.all([
    hydrateSharedMessages(rows,viewer,db),
    replyIds.length ? db.directMessage.findMany({ where: { id: { in: replyIds }, conversationId: { in: [...new Set(rows.map(row=>row.conversationId))] } } }) : Promise.resolve([]),
    ids.length ? db.$queryRaw<{id:string;reactionVersion:number;reactions:{emoji:string;userId:string}[]}[]>`
      SELECT m."id",m."reactionVersion",COALESCE(jsonb_agg(jsonb_build_object('emoji',r."emoji",'userId',r."userId"))
        FILTER (WHERE r."id" IS NOT NULL AND u."deletedAt" IS NULL),'[]'::jsonb) AS reactions
      FROM "direct_message" m LEFT JOIN "direct_message_reaction" r ON r."messageId"=m."id"
      LEFT JOIN "user" u ON u."id"=r."userId"
      WHERE m."id" IN (${Prisma.join(ids)}) GROUP BY m."id",m."reactionVersion"
    ` : Promise.resolve([]),
  ])
  const reactionState=new Map(reactions.map(row=>[row.id,row]))
  const hydratedSources = await hydrateSharedMessages(sources,viewer,db)
  const lookup = new Map(sources.map((source,index)=>[`${source.conversationId}:${source.id}`,hydratedSources[index]]))
  return base.map((message,index)=>({ ...message, quote: rows[index].replyToId ? quotation(lookup.get(`${rows[index].conversationId}:${rows[index].replyToId}`)) : null, reactionVersion: reactionState.get(message.id)?.reactionVersion ?? rows[index].reactionVersion ?? 0, reactions: summarizeReactions(reactionState.get(message.id)?.reactions ?? [],viewer.id) }))
}
