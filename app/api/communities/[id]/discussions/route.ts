import { requireUser, getOptionalUserSession } from '@/lib/session'
import { discussionSchema } from '@/lib/input-schemas'
import { galaxyAccess, deny } from '@/lib/galaxy-workflow'
import { readJson, safeApiError } from '@/lib/api-input'
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
    const session = await getOptionalUserSession();
    const access = session ? await galaxyAccess(prisma, id, session.user) : null;

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

    return NextResponse.json({ discussions: discussions.map(d => ({ ...serializeDiscussion(d), canDelete: d.authorId === session?.user.id || !!access?.isAdmin })) });

  } catch (error) {
    return safeApiError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(); const { id } = await params
    const input = await readJson(request, discussionSchema); if (!input.ok) return input.response
    const discussion = await prisma.$transaction(async tx => {
      const access = await galaxyAccess(tx, id, user, true)
      if (!access.membership && !access.isAdmin) deny('joinFirst')
      if (await tx.communityDiscussion.findUnique({ where: { communityId_title: { communityId: id, title: input.data.title } } })) deny('duplicateDiscussion', 409)
      return tx.communityDiscussion.create({ data: { communityId: id, authorId: user.id, title: input.data.title, heat: 0.5, replies: { create: { content: input.data.content, authorId: user.id, authorName: user.name } } } })
    })
    return Response.json({ discussion }, { status: 201 })
  } catch (error) { return safeApiError(error) }
}
