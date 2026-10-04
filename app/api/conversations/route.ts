import { readJson, safeApiError } from '@/lib/api-input'
import { conversationSchema } from '@/lib/input-schemas'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { canContact, mutualFollow, canViewProfile } from '@/lib/visibility'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'
import { resolveUserPlanetConfig } from '@/lib/user-planet-config'

import { z } from 'zod'
import { visibleConversationWhere } from '@/lib/inbox'
import { USER_PLANET_CONFIG_SELECT } from '@/lib/user-planet-config'

const listQuery = z
  .object({
    cursor: z.string().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(30),
  })
  .strict()
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const parsed = listQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    )
    if (!parsed.success)
      return NextResponse.json({ error: 'invalidQuery' }, { status: 400 })
    const { cursor, limit } = parsed.data
    const selectUser = {
      id: true,
      name: true,
      ...USER_PLANET_CONFIG_SELECT,
      planets: {
        where: { active: true },
        take: 1,
        select: {
          id: true,
          name: true,
          avatarSymbol: true,
          visual: true,
          mood: true,
          lifestyle: true,
          coreThemes: true,
        },
      },
    } as const
    const where = await visibleConversationWhere(user.id)
    if (
      cursor &&
      !(await prisma.conversationThread.findFirst({
        where: { ...where, id: cursor },
        select: { id: true },
      }))
    )
      return NextResponse.json({ error: 'invalidCursor' }, { status: 400 })
    const rows = await prisma.conversationThread.findMany({
      where,
      orderBy: [
        { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        { id: 'asc' },
      ],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        userA: { select: selectUser },
        userB: { select: selectUser },
        messages: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1 },
        _count: {
          select: {
            messages: { where: { senderId: { not: user.id }, readAt: null } },
          },
        },
      },
    })
    const more = rows.length > limit
    if (more) rows.pop()
    const result = await Promise.all(
      rows.map(async (conv) => {
        const other = conv.userAId === user.id ? conv.userB : conv.userA
        const planet = (await canViewProfile(user.id, other.id))
          ? other.planets[0]
          : null
        const message = conv.messages[0]
        return {
          id: conv.id,
          otherUser: { id: other.id, name: other.name },
          otherPlanet: planet
            ? {
                ...planet,
                planetConfig: resolveUserPlanetConfig(other, planet),
              }
            : null,
          lastMessage: message
            ? {
                id: message.id,
                content: message.content,
                type: message.type,
                senderId: message.senderId,
                createdAt: message.createdAt,
              }
            : null,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
          unreadCount: conv._count.messages,
        }
      }),
    )
    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Next-Cursor': more ? rows.at(-1)!.id : '',
      },
    })
  } catch (error) {
    return safeApiError(error)
  }
}

// POST /api/conversations - start a new conversation with another user
export async function POST(request: Request) {
  try {
    let session
    try {
      session = await requireUser()
    } catch (res) {
      return res as Response
    }

    const userId = session.user.id
    const input = await readJson(request, conversationSchema)
    if (!input.ok) return input.response
    const body = input.data
    const { recipientId } = body

    if (!recipientId || typeof recipientId !== 'string') {
      return NextResponse.json(
        { error: 'recipientId is required' },
        { status: 400 },
      )
    }
    if (recipientId === userId) {
      return NextResponse.json(
        { error: 'Cannot message yourself' },
        { status: 400 },
      )
    }

    // Verify recipient exists
    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, deletedAt: null },
      select: { id: true },
    })
    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 },
      )
    }

    if (!(await canContact(userId, recipientId))) {
      return NextResponse.json(
        { error: 'This planet is not reachable' },
        { status: 403 },
      )
    }

    // Ensure consistent ordering for unique constraint
    const [uA, uB] = [userId, recipientId].sort()

    const existingThread = await prisma.conversationThread.findUnique({
      where: { userAId_userBId: { userAId: uA, userBId: uB } },
      select: { id: true },
    })

    // Starting a brand-new thread requires a mutual follow (approved); an
    // already-established thread can continue even if a follow later lapses.
    if (!existingThread && !(await mutualFollow(userId, recipientId))) {
      return NextResponse.json(
        { error: 'You can message this planet once you follow each other', code: 'mutualFollowRequired' },
        { status: 403 },
      )
    }

    if (!existingThread) {
      const allowed = await checkRateLimit(
        rateLimitKey('CONVERSATION_START', userId),
        RATE_LIMITS.CONVERSATION_START.limit,
        RATE_LIMITS.CONVERSATION_START.windowMs,
      )
      if (!allowed)
        return NextResponse.json(
          { error: 'Too many new conversations. Try again later.' },
          { status: 429 },
        )
    }

    // Opening a conversation never sends a message. The composer performs the send.
    const conversation = await prisma.conversationThread.upsert({
      where: { userAId_userBId: { userAId: uA, userBId: uB } },
      create: { userAId: uA, userBId: uB },
      update: {},
    })

    return NextResponse.json(
      { conversationId: conversation.id },
      { status: existingThread ? 200 : 201 },
    )
  } catch (error) {
    return safeApiError(error)
  }
}
