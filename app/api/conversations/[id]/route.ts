import { z } from 'zod'
import { hydrateMessageState, validateReplyTo } from '@/lib/chat-interactions'
import { lockContactPair } from '@/lib/beam-invitations'
import { canContact } from '@/lib/visibility'
import { resolveLocale } from '@/lib/i18n-locales'
import { readJson, safeApiError } from '@/lib/api-input'
import { messageSchema } from '@/lib/input-schemas'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { NotificationTemplates } from '@/lib/createNotification'
import { grantXP } from '@/lib/grantXP'
import { isBlocked, canViewProfile } from '@/lib/visibility'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveUserPlanetConfig } from '@/lib/user-planet-config'

const pageQuery = z
  .object({ before: z.string().min(1).max(100).optional() })
  .strict()
const readSchema = z
  .object({ ids: z.array(z.string().min(1).max(100)).min(1).max(50) })
  .strict()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const query = pageQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!query.success)
      return NextResponse.json({ error: 'invalidQuery' }, { status: 400 })
    const conversation = await prisma.conversationThread.findFirst({
      where: { id, OR: [{ userAId: user.id }, { userBId: user.id }] },
      include: {
        userA: { include: { planets: { where: { active: true }, take: 1 } } },
        userB: { include: { planets: { where: { active: true }, take: 1 } } },
      },
    })
    if (!conversation)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    const other =
      conversation.userAId === user.id ? conversation.userB : conversation.userA
    if (await isBlocked(user.id, other.id))
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    const canSeePlanet = await canViewProfile(user.id, other.id)
    const mine =
      conversation.userAId === user.id ? conversation.userA : conversation.userB
    if (mine.deletedAt) return NextResponse.json({ error: 'unavailable' }, { status: 404 })
    const before = query.data.before
    if (
      before &&
      !(await prisma.directMessage.findFirst({
        where: { id: before, conversationId: id },
        select: { id: true },
      }))
    )
      return NextResponse.json({ error: 'invalidCursor' }, { status: 400 })
    const rows = await prisma.directMessage.findMany({
      where: { conversationId: id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 41,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    })
    const more = rows.length > 40
    if (more) rows.pop()
    const olderCursor = more ? rows.at(-1)!.id : null
    return NextResponse.json(
      {
        conversation: { id, createdAt: conversation.createdAt },
        viewerId: user.id,
        canSend: other.deletedAt === null,
        myPlanet: mine.planets[0]
          ? {
              ...mine.planets[0],
              planetConfig: resolveUserPlanetConfig(mine, mine.planets[0]),
            }
          : null,
        otherPlanet:
          canSeePlanet && other.planets[0]
            ? {
                ...other.planets[0],
                planetConfig: resolveUserPlanetConfig(other, other.planets[0]),
              }
            : null,
        otherUser: { id: other.id, name: other.name },
        messages: await hydrateMessageState(rows.reverse(), user),
        olderCursor,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (error) {
    return safeApiError(error)
  }
}

// A read-only fetch never marks unseen messages as read. The visible page acknowledges
// only the IDs it has actually received, preserving concurrent incoming messages.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user } = await requireUser()
    const { id } = await params
    const conversation = await prisma.conversationThread.findFirst({
      where: { id, OR: [{ userAId: user.id }, { userBId: user.id }] },
    })
    if (!conversation)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    const otherId =
      conversation.userAId === user.id
        ? conversation.userBId
        : conversation.userAId
    if (await isBlocked(user.id, otherId))
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    const input = await readJson(request, readSchema)
    if (!input.ok) return input.response
    const result = await prisma.$transaction(async (tx) => {
      await lockContactPair(tx,user.id,otherId)
      await tx.$queryRaw`SELECT "id" FROM "conversation_thread" WHERE "id" = ${id} FOR UPDATE`
      if (!await tx.user.findFirst({where:{id:user.id,deletedAt:null}}) || !await canContact(user.id,otherId,tx) || !await tx.conversationThread.findUnique({where:{id}})) throw NextResponse.json({error:'unavailable'},{status:404})
      const updated = await tx.directMessage.updateMany({
        where: {
          conversationId: id,
          id: { in: input.data.ids },
          senderId: { not: user.id },
          readAt: null,
        },
        data: { readAt: new Date() },
      })
      const unread = await tx.directMessage.count({
        where: { conversationId: id, senderId: { not: user.id }, readAt: null },
      })
      if (unread === 0)
        await tx.notification.updateMany({
          where: {
            userId: user.id,
            type: 'NEW_MESSAGE',
            actionUrl: `/messages/${id}`,
            read: false,
          },
          data: { read: true },
        })
      return { updated: updated.count, unread }
    })
    return NextResponse.json(result)
  } catch (error) {
    return safeApiError(error)
  }
}

// Sending/retrying always validates current contact under the participant/thread locks.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(), { id } = await params
    const conversation = await prisma.conversationThread.findUnique({ where: { id } })
    if (!conversation) return NextResponse.json({ error: 'unavailable' }, { status: 404 })
    if (conversation.userAId !== user.id && conversation.userBId !== user.id) return NextResponse.json({ error: 'unavailable' }, { status: 403 })
    const recipientId = conversation.userAId === user.id ? conversation.userBId : conversation.userAId
    if (!await canContact(user.id, recipientId)) return NextResponse.json({ error: 'unavailable' }, { status: 403 })
    const input = await readJson(request, messageSchema); if (!input.ok) return input.response
    const { content, clientMessageId, replyToId } = input.data
    const result = await prisma.$transaction(async tx => {
      await lockContactPair(tx,user.id,recipientId)
      await tx.$queryRaw`SELECT "id" FROM "conversation_thread" WHERE "id" = ${id} FOR UPDATE`
      const people = await tx.user.findMany({ where: { id: { in: [user.id,recipientId] }, deletedAt: null }, select: { id: true, name: true, language: true } })
      const sender = people.find(person=>person.id===user.id), recipient = people.find(person=>person.id===recipientId)
      if (!sender || !recipient || !await tx.conversationThread.findUnique({where:{id}})) throw NextResponse.json({error:'unavailable'},{status:404})
      if (!await canContact(user.id,recipientId,tx)) throw NextResponse.json({error:'unavailable'},{status:403})
      const existing = clientMessageId ? await tx.directMessage.findUnique({ where: { conversationId_clientMessageId: { conversationId: id, clientMessageId } } }) : null
      if (existing) {
        if (existing.senderId!==user.id || existing.type!=='text' || existing.content!==content || existing.replyToId!==(replyToId ?? null)) throw NextResponse.json({error:'keyConflict'},{status:409})
        return { message: existing, created: false, first: false }
      }
      await validateReplyTo(tx,id,replyToId,user)
      const limit = RATE_LIMITS.MESSAGE_SEND
      if (!await checkRateLimit(rateLimitKey('MESSAGE_SEND',user.id),limit.limit,limit.windowMs,tx)) throw NextResponse.json({error:'rateLimited'},{status:429})
      const message = await tx.directMessage.create({ data: { conversationId: id, senderId: user.id, content, type:'text', clientMessageId, replyToId } })
      await tx.conversationThread.update({ where: { id }, data: { lastMessageAt: message.createdAt } })
      const notice = await NotificationTemplates.newMessage(sender.name,`/messages/${id}`,resolveLocale(recipient.language))
      await tx.notification.create({ data: { userId: recipientId, ...notice } })
      return { message, created: true, first: await tx.directMessage.count({where:{conversationId:id}})===1 }
    })
    if (result.first) { try { await grantXP(user.id,'RESONANCE_SENT') } catch { console.error('Could not grant message XP') } }
    const [message] = await hydrateMessageState([result.message],user)
    return NextResponse.json(message,{ status: result.created ? 201 : 200, headers: { 'Cache-Control':'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}
