import { safeApiError } from '@/lib/api-input'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

function serializeDiscussion(discussion: {
  id: string;
  title: string;
  heat: number;
  replies: Array<Parameters<typeof serializeReply>[0]>;
  _count: { replies: number };
}) {
  return {
    id: discussion.id,
    title: discussion.title,
    heat: discussion.heat,
    replies: discussion._count.replies,
    replyItems: discussion.replies.map(serializeReply),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const community = await prisma.community.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const discussions = await prisma.communityDiscussion.findMany({
      where: { communityId: id },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      include: {
        replies: {
          orderBy: { createdAt: "asc" },
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
        },
        _count: { select: { replies: true } },
      },
    });

    return NextResponse.json({ discussions: discussions.map(serializeDiscussion) });

  } catch (error) {
    return safeApiError(error)
  }
}
