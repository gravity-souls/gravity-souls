import { readJson, safeApiError } from '@/lib/api-input'
import { messageSchema } from '@/lib/input-schemas'
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { NotificationTemplates, createNotification } from "@/lib/createNotification";
import { isBlocked } from "@/lib/visibility";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

// GET /api/conversations/[id] - get messages for a conversation
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    let session;
    try {
      session = await requireUser();
    } catch (res) {
      return res as Response;
    }

    const { id } = await params;
    const userId = session.user.id;

    const conversation = await prisma.conversationThread.findUnique({
      where: { id },
      include: {
        userA: {
          include: { planets: { where: { active: true }, take: 1 } },
        },
        userB: {
          include: { planets: { where: { active: true }, take: 1 } },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Verify user is part of this conversation
    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
    });

    // Mark unread messages from the other user as read
    await prisma.directMessage.updateMany({
      where: {
        conversationId: id,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const otherUser =
      conversation.userAId === userId ? conversation.userB : conversation.userA;
    const myUser =
      conversation.userAId === userId ? conversation.userA : conversation.userB;

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        createdAt: conversation.createdAt,
      },
      myPlanet: myUser.planets[0] ?? null,
      otherPlanet: otherUser.planets[0] ?? null,
      otherUser: { id: otherUser.id, name: otherUser.name },
      messages: messages.map((m: { id: string; senderId: string; content: string; type: string; readAt: Date | null; createdAt: Date }) => ({
        id: m.id,
        fromId: m.senderId,
        content: m.content,
        type: m.type,
        sentAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? undefined,
      })),
    });

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
    let session;
    try {
      session = await requireUser();
    } catch (res) {
      return res as Response;
    }

    const { id } = await params;
    const userId = session.user.id;

    const conversation = await prisma.conversationThread.findUnique({
      where: { id },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const recipientId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;

    if (await isBlocked(userId, recipientId)) {
      return NextResponse.json({ error: "This conversation is no longer available" }, { status: 403 });
    }

    const input = await readJson(request, messageSchema)
    if (!input.ok) return input.response
    const body = input.data;
    const { content, clientMessageId } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // A retried send (client never saw the first response) reuses the same
    // clientMessageId, so return the message already created instead of a duplicate.
    if (clientMessageId) {
      const existing = await prisma.directMessage.findFirst({
        where: { conversationId: id, clientMessageId },
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          fromId: existing.senderId,
          content: existing.content,
          type: existing.type,
          sentAt: existing.createdAt.toISOString(),
        }, { status: 200 });
      }
    }

    const messageAllowed = await checkRateLimit(rateLimitKey("MESSAGE_SEND", userId), RATE_LIMITS.MESSAGE_SEND.limit, RATE_LIMITS.MESSAGE_SEND.windowMs);
    if (!messageAllowed) return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });

    let msg;
    try {
      msg = await prisma.directMessage.create({
        data: {
          conversationId: id,
          senderId: userId,
          content: content.trim(),
          type: "text",
          clientMessageId: clientMessageId ?? undefined,
        },
      });
    } catch (error) {
      // Two concurrent retries with the same clientMessageId can both pass the
      // findFirst check above; the unique constraint then rejects the loser,
      // which just means the winner's row is the canonical one to return.
      if (clientMessageId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await prisma.directMessage.findFirst({
          where: { conversationId: id, clientMessageId },
        });
        if (existing) {
          return NextResponse.json({
            id: existing.id,
            fromId: existing.senderId,
            content: existing.content,
            type: existing.type,
            sentAt: existing.createdAt.toISOString(),
          }, { status: 200 });
        }
      }
      throw error;
    }

    // Update conversation lastMessageAt
    await prisma.conversationThread.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    await createNotification({
      userId: recipientId,
      ...NotificationTemplates.resonanceAccepted(session.user.name ?? "A planet", `/messages/${id}`),
    });

    return NextResponse.json({
      id: msg.id,
      fromId: msg.senderId,
      content: msg.content,
      type: msg.type,
      sentAt: msg.createdAt.toISOString(),
    }, { status: 201 });

  } catch (error) {
    return safeApiError(error)
  }
}
