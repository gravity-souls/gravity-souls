import { readJson, safeApiError } from '@/lib/api-input'
import { conversationSchema } from '@/lib/input-schemas'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { grantXP } from "@/lib/grantXP";
import { NotificationTemplates, createNotification } from "@/lib/createNotification";
import { canContact, mutualFollow } from "@/lib/visibility";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

// GET /api/conversations - list all conversations for the current user
export async function GET() {
  try {
    let session;
    try {
      session = await requireUser();
    } catch (res) {
      return res as Response;
    }

    const userId = session.user.id;

    const conversations = await prisma.conversationThread.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        userA: {
          include: { planets: { where: { active: true }, take: 1 }, profile: true },
        },
        userB: {
          include: { planets: { where: { active: true }, take: 1 }, profile: true },
        },
      },
      orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    });

    const result = conversations.map((c: Record<string, unknown>) => {
      const conv = c as typeof conversations[number];
      const otherUser = conv.userAId === userId ? conv.userB : conv.userA;
      const otherPlanet = otherUser.planets[0] ?? null;
      const lastMsg = conv.messages[0] ?? null;

      // Count unread messages
      const unreadCountP = prisma.directMessage.count({
        where: {
          conversationId: conv.id,
          senderId: { not: userId },
          readAt: null,
        },
      });

      return {
        id: conv.id,
        otherUser: { id: otherUser.id, name: otherUser.name },
        otherPlanet: otherPlanet
          ? {
              id: otherPlanet.id,
              name: otherPlanet.name,
              avatarSymbol: otherPlanet.avatarSymbol,
              visual: otherPlanet.visual,
              mood: otherPlanet.mood,
            }
          : null,
        lastMessage: lastMsg
          ? {
              id: lastMsg.id,
              content: lastMsg.content,
              type: lastMsg.type,
              senderId: lastMsg.senderId,
              createdAt: lastMsg.createdAt,
            }
          : null,
        lastMessageAt: conv.lastMessageAt,
        createdAt: conv.createdAt,
        _unreadCountP: unreadCountP,
      };
    });

    // Resolve unread counts in parallel
    const unreadCounts = await Promise.all(result.map((r) => r._unreadCountP));
    const final = result.map((r, i) => {
      const { _unreadCountP, ...rest } = r;
      void _unreadCountP;
      return { ...rest, unreadCount: unreadCounts[i] };
    });

    return NextResponse.json(final);

  } catch (error) {
    return safeApiError(error)
  }
}

// POST /api/conversations - start a new conversation with another user
export async function POST(request: Request) {
  try {
    let session;
    try {
      session = await requireUser();
    } catch (res) {
      return res as Response;
    }

    const userId = session.user.id;
    const input = await readJson(request, conversationSchema)
    if (!input.ok) return input.response
    const body = input.data;
    const { recipientId, message } = body;

    if (!recipientId || typeof recipientId !== "string") {
      return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
    }
    if (recipientId === userId) {
      return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Verify recipient exists
    const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    }

    if (!(await canContact(userId, recipientId))) {
      return NextResponse.json({ error: "This planet is not reachable" }, { status: 403 });
    }

    // Ensure consistent ordering for unique constraint
    const [uA, uB] = [userId, recipientId].sort();

    const existingThread = await prisma.conversationThread.findUnique({
      where: { userAId_userBId: { userAId: uA, userBId: uB } },
      select: { id: true },
    });

    // Starting a brand-new thread requires a mutual follow (approved); an
    // already-established thread can continue even if a follow later lapses.
    if (!existingThread && !(await mutualFollow(userId, recipientId))) {
      return NextResponse.json({ error: "You can message this planet once you follow each other" }, { status: 403 });
    }

    if (!existingThread) {
      const allowed = await checkRateLimit(rateLimitKey("CONVERSATION_START", userId), RATE_LIMITS.CONVERSATION_START.limit, RATE_LIMITS.CONVERSATION_START.windowMs);
      if (!allowed) return NextResponse.json({ error: "Too many new conversations. Try again later." }, { status: 429 });
    }

    // Find or create conversation
    const conversation = await prisma.conversationThread.upsert({
      where: { userAId_userBId: { userAId: uA, userBId: uB } },
      create: {
        userAId: uA,
        userBId: uB,
        lastMessageAt: new Date(),
      },
      update: {
        lastMessageAt: new Date(),
      },
    });

    const messageAllowed = await checkRateLimit(rateLimitKey("MESSAGE_SEND", userId), RATE_LIMITS.MESSAGE_SEND.limit, RATE_LIMITS.MESSAGE_SEND.windowMs);
    if (!messageAllowed) return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });

    // Create the message
    const msg = await prisma.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        content: message.trim(),
        type: "beam",
      },
    });

    const xpEvent = await grantXP(userId, "RESONANCE_SENT");

    await createNotification({
      userId: recipientId,
      ...NotificationTemplates.resonanceReceived(session.user.name ?? "A planet", `/messages/${conversation.id}`),
    });

    return NextResponse.json({ conversationId: conversation.id, message: msg, xpEvent, leveledUp: xpEvent.leveledUp }, { status: 201 });

  } catch (error) {
    return safeApiError(error)
  }
}
