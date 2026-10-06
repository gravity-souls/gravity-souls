import { requireUser, getOptionalUserSession } from '@/lib/session'
import { discussionSchema } from '@/lib/input-schemas'
import { galaxyAccess, deny } from '@/lib/galaxy-workflow'
import { readJson, safeApiError } from '@/lib/api-input'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { communityReplyInclude, serializeCommunityReply as serializeReply } from '@/lib/community-author'
import { blockedUserIds } from '@/lib/visibility'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'
import { communityCursor, communityPageBoundary, DISCUSSION_REPLY_PREVIEW, readCommunityPage } from '@/lib/community-pagination'

async function serializeDiscussion(discussion: {
  id: string;
  title: string;
  heat: number;
  replies: Array<Parameters<typeof serializeReply>[0]>;
  _count: { replies: number };
}, viewerId: string | null) {
  return {
    id: discussion.id,
    title: discussion.title,
    heat: discussion.heat,
    replies: discussion._count.replies,
    replyItems: await Promise.all(discussion.replies.map(reply => serializeReply(reply, viewerId))),
    nextReplyCursor: discussion._count.replies > discussion.replies.length && discussion.replies.length
      ? communityCursor(discussion.replies[discussion.replies.length - 1]) : null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { limit, cursor } = readCommunityPage(request)
    const session = await getOptionalUserSession();
    const access = session ? await galaxyAccess(prisma, id, session.user) : null;
    const viewerId = session?.user.id ?? null
    const excluded = viewerId ? [...await blockedUserIds(viewerId)] : []
    const visibleAuthor = { OR: [{ authorId: null }, { authorId: { notIn: excluded } }] }

    const community = await prisma.community.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!community) {
      return NextResponse.json({ error: "Community not found" }, { status: 404 });
    }

    const discussions = await prisma.communityDiscussion.findMany({
      where: { communityId: id, AND: [visibleAuthor, ...(cursor ? [communityPageBoundary(cursor, 'desc')] : [])] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        replies: {
          where: visibleAuthor,
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          take: DISCUSSION_REPLY_PREVIEW,
          include: communityReplyInclude(viewerId),
        },
        _count: { select: { replies: { where: visibleAuthor } } },
      },
    });

    const page = discussions.slice(0, limit)
    return NextResponse.json({
      discussions: await Promise.all(page.map(async d => ({ ...await serializeDiscussion(d, viewerId), canDelete: d.authorId === viewerId || !!access?.isAdmin }))),
      nextCursor: discussions.length > limit ? communityCursor(page[page.length - 1]) : null,
    });

  } catch (error) {
    return safeApiError(error)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireUser(); const { id } = await params
    const input = await readJson(request, discussionSchema); if (!input.ok) return input.response
    const limit = RATE_LIMITS.POST_CREATE
    if (!await checkRateLimit(rateLimitKey('POST_CREATE', user.id), limit.limit, limit.windowMs)) deny('rateLimited', 429)
    const discussion = await prisma.$transaction(async tx => {
      const access = await galaxyAccess(tx, id, user, true)
      if (!access.membership && !access.isAdmin) deny('joinFirst')
      if (await tx.communityDiscussion.findUnique({ where: { communityId_title: { communityId: id, title: input.data.title } } })) deny('duplicateDiscussion', 409)
      return tx.communityDiscussion.create({
        data: { communityId: id, authorId: user.id, title: input.data.title, heat: 0.5, replies: { create: { content: input.data.content, authorId: user.id, authorName: user.name } } },
        include: { replies: { include: communityReplyInclude(user.id) }, _count: { select: { replies: true } } },
      })
    })
    return Response.json({ discussion: { ...await serializeDiscussion(discussion, user.id), canDelete: true } }, { status: 201 })
  } catch (error) { return safeApiError(error) }
}
