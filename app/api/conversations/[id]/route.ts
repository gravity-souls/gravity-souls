import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET /api/conversations/[id] - get messages for a conversation
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
}

// POST /api/conversations/[id] - send a message in a conversation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message content is required" }, { status: 400 });
  }

  const msg = await prisma.directMessage.create({
    data: {
      conversationId: id,
      senderId: userId,
      content: content.trim(),
      type: "text",
    },
  });

  // Update conversation lastMessageAt
  await prisma.conversationThread.update({
    where: { id },
    data: { lastMessageAt: new Date() },
  });

  return NextResponse.json({
    id: msg.id,
    fromId: msg.senderId,
    content: msg.content,
    type: msg.type,
    sentAt: msg.createdAt.toISOString(),
  }, { status: 201 });
}
