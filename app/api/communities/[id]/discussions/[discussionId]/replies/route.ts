import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function serializeReply(reply: {
  id: string;
  content: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; planets: { id: string; name: string }[] } | null;
}) {
  const authorPlanet = reply.author?.planets[0] ?? null;

  return {
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    author: {
      id: reply.author?.id ?? null,
      name: authorPlanet?.name ?? reply.authorName,
      planet: authorPlanet ? { id: authorPlanet.id, name: authorPlanet.name } : null,
    },
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; discussionId: string }> },
) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const { id, discussionId } = await params;
  const userId = session.user.id;
  const body = await request.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (content.length < 2) {
    return NextResponse.json({ error: "Reply content is required" }, { status: 400 });
  }

  if (content.length > 600) {
    return NextResponse.json({ error: "Reply content is too long" }, { status: 400 });
  }

  const [discussion, membership] = await Promise.all([
    prisma.communityDiscussion.findFirst({
      where: { id: discussionId, communityId: id },
      select: { id: true },
    }),
    prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId: id } },
      select: { id: true },
    }),
  ]);

  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Join this community before replying" }, { status: 403 });
  }

  const reply = await prisma.communityDiscussionReply.create({
    data: {
      discussionId,
      authorId: userId,
      authorName: session.user.name ?? "Unknown",
      content,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          planets: {
            where: { active: true },
            take: 1,
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const replies = await prisma.communityDiscussionReply.count({ where: { discussionId } });

  return NextResponse.json({ reply: serializeReply(reply), replies }, { status: 201 });
}