import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET /api/conversations - list all conversations for the current user
export async function GET() {
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
    const { _unreadCountP: _, ...rest } = r;
    return { ...rest, unreadCount: unreadCounts[i] };
  });

  return NextResponse.json(final);
}

// POST /api/conversations - start a new conversation with another user
export async function POST(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;
  const body = await request.json();
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

  // Ensure consistent ordering for unique constraint
  const [uA, uB] = [userId, recipientId].sort();

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

  // Create the message
  const msg = await prisma.directMessage.create({
    data: {
      conversationId: conversation.id,
      senderId: userId,
      content: message.trim(),
      type: "beam",
    },
  });

  return NextResponse.json({ conversationId: conversation.id, message: msg }, { status: 201 });
}
