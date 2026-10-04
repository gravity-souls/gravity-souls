import { z } from 'zod'
import { hydrateSharedMessages } from '@/lib/chat-shares'
import { readJson, safeApiError } from '@/lib/api-input'
import { messageSchema } from '@/lib/input-schemas'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { NotificationTemplates } from '@/lib/createNotification'
import { grantXP } from '@/lib/grantXP'
import { getUserLocale } from '@/lib/notification-i18n'
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
        messages: await hydrateSharedMessages(rows.reverse(), user),
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
      await tx.$queryRaw`SELECT "id" FROM "conversation_thread" WHERE "id" = ${id} FOR UPDATE`
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

// POST /api/conversations/[id] - send a message in a conversation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let session
    try {
      session = await requireUser()
    } catch (res) {
      return res as Response
    }

    const { id } = await params
    const userId = session.user.id

    const conversation = await prisma.conversationThread.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      )
    }

    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const recipientId =
      conversation.userAId === userId
        ? conversation.userBId
        : conversation.userAId

    if (await isBlocked(userId, recipientId)) {
      return NextResponse.json(
        { error: 'This conversation is no longer available' },
        { status: 403 },
      )
    }

    if (
      !(await prisma.user.findFirst({
        where: { id: recipientId, deletedAt: null },
        select: { id: true },
      }))
    )
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 },
      )

    const input = await readJson(request, messageSchema)
    if (!input.ok) return input.response
    const body = input.data
    const { content, clientMessageId } = body
    const trimmedContent = content.trim()

    if (
      !content ||
      typeof content !== 'string' ||
      content.trim().length === 0
    ) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 },
      )
    }

    // A retried send (client never saw the first response) reuses the same
    // clientMessageId, so return the message already created instead of a duplicate.
    if (clientMessageId) {
      const existing = await prisma.directMessage.findFirst({
        where: { conversationId: id, clientMessageId },
      })
      if (existing) {
        if (
          existing.senderId !== userId ||
          existing.content !== trimmedContent
        ) {
          return NextResponse.json(
            { error: 'Message key already used' },
            { status: 409 },
          )
        }
        return NextResponse.json(
          {
            id: existing.id,
            fromId: existing.senderId,
            content: existing.content,
            type: existing.type,
            sentAt: existing.createdAt.toISOString(),
          },
          { status: 200 },
        )
      }
    }

    const messageAllowed = await checkRateLimit(
      rateLimitKey('MESSAGE_SEND', userId),
      RATE_LIMITS.MESSAGE_SEND.limit,
      RATE_LIMITS.MESSAGE_SEND.windowMs,
    )
    if (!messageAllowed)
      return NextResponse.json(
        { error: 'Too many messages. Try again later.' },
        { status: 429 },
      )

    const recipientLocale = await getUserLocale(recipientId)
    const notification = await NotificationTemplates.newMessage(
      session.user.name ?? 'A planet',
      `/messages/${id}`,
      recipientLocale,
    )

    let sent
    try {
      sent = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "conversation_thread" WHERE "id" = ${id} FOR UPDATE`
        const created = await tx.directMessage.create({
          data: {
            conversationId: id,
            senderId: userId,
            content: trimmedContent,
            type: 'text',
            clientMessageId: clientMessageId ?? undefined,
          },
        })
        await tx.conversationThread.update({
          where: { id },
          data: { lastMessageAt: created.createdAt },
        })
        const messageCount = await tx.directMessage.count({
          where: { conversationId: id },
        })
        await tx.notification.create({
          data: { userId: recipientId, ...notification },
        })
        return { msg: created, isFirstMessage: messageCount === 1 }
      })
    } catch (error) {
      // Two concurrent retries with the same clientMessageId can both pass the
      // findFirst check above; the unique constraint then rejects the loser,
      // which just means the winner's row is the canonical one to return.
      if (
        clientMessageId &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await prisma.directMessage.findFirst({
          where: { conversationId: id, clientMessageId },
        })
        if (existing) {
          if (
            existing.senderId !== userId ||
            existing.content !== trimmedContent
          ) {
            return NextResponse.json(
              { error: 'Message key already used' },
              { status: 409 },
            )
          }
          return NextResponse.json(
            {
              id: existing.id,
              fromId: existing.senderId,
              content: existing.content,
              type: existing.type,
              sentAt: existing.createdAt.toISOString(),
            },
            { status: 200 },
          )
        }
      }
      throw error
    }

    // XP is a separate reward; its failure must not turn a delivered message
    // into an apparent failed send and trigger a duplicate retry.
    if (sent.isFirstMessage) {
      try {
        await grantXP(userId, 'RESONANCE_SENT')
      } catch (error) {
        console.error('Could not grant message XP', error)
      }
    }

    return NextResponse.json(
      {
        id: sent.msg.id,
        fromId: sent.msg.senderId,
        content: sent.msg.content,
        type: sent.msg.type,
        sentAt: sent.msg.createdAt.toISOString(),
      },
      { status: 201 },
    )
  } catch (error) {
    return safeApiError(error)
  }
}
