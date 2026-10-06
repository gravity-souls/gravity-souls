import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getOptionalUserSession } from "@/lib/session";
import { communityReplyInclude, serializeCommunityReply as serializeReply } from '@/lib/community-author'
import { blockedUserIds, isBlocked } from '@/lib/visibility'
import { readJson, safeApiError } from '@/lib/api-input'
import { communityReplySchema } from '@/lib/input-schemas'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'
import { deny, galaxyAccess } from '@/lib/galaxy-workflow'
import { communityCursor, communityPageBoundary, readCommunityPage } from '@/lib/community-pagination'

export async function GET(request: Request, { params }: { params: Promise<{ id: string; discussionId: string }> }) {
  try {
    const { id, discussionId } = await params
    const { limit, cursor } = readCommunityPage(request)
    const session = await getOptionalUserSession()
    const viewerId = session?.user.id ?? null
    const excluded = viewerId ? [...await blockedUserIds(viewerId)] : []
    const visibleAuthor = { OR: [{ authorId: null }, { authorId: { notIn: excluded } }] }
    const discussion = await prisma.communityDiscussion.findFirst({
      where: { id: discussionId, communityId: id, ...visibleAuthor }, select: { id: true },
    })
    if (!discussion) deny('notFound', 404)
    const where = { discussionId, ...visibleAuthor }
    const [rows, total] = await prisma.$transaction([
      prisma.communityDiscussionReply.findMany({
        where: { AND: [where, ...(cursor ? [communityPageBoundary(cursor, 'asc')] : [])] },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        include: communityReplyInclude(viewerId),
      }),
      prisma.communityDiscussionReply.count({ where }),
    ])
    const page = rows.slice(0, limit)
    return NextResponse.json({
      replies: await Promise.all(page.map(reply => serializeReply(reply, viewerId))),
      total,
      nextCursor: rows.length > limit ? communityCursor(page[page.length - 1]) : null,
    })
  } catch (error) { return safeApiError(error) }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; discussionId: string }> },
) {
  try {
  const session = await requireUser();

  const { id, discussionId } = await params;
  const userId = session.user.id;
  const input = await readJson(request, communityReplySchema)
  if (!input.ok) return input.response
  const { content } = input.data
  const excluded = [...await blockedUserIds(userId)]
  const { reply, replies } = await prisma.$transaction(async tx => {
  const access = await galaxyAccess(tx, id, session.user, true)
  const discussion = await tx.communityDiscussion.findFirst({
      where: { id: discussionId, communityId: id },
      select: { id: true, authorId: true },
    })

  if (!discussion || (discussion.authorId && await isBlocked(userId, discussion.authorId, tx))) deny('notFound', 404)

  if (!access.membership) deny('joinFirst')
  const limit = RATE_LIMITS.MESSAGE_SEND
  if (!await checkRateLimit(rateLimitKey('MESSAGE_SEND', userId), limit.limit, limit.windowMs, tx)) deny('rateLimited', 429)

  const reply = await tx.communityDiscussionReply.create({
    data: {
      discussionId,
      authorId: userId,
      authorName: session.user.name,
      content,
    },
    include: communityReplyInclude(userId),
  });

  const replies = await tx.communityDiscussionReply.count({ where: { discussionId, OR: [{ authorId: null }, { authorId: { notIn: excluded } }] } });
  return { reply, replies }
  })

  return NextResponse.json({ reply: await serializeReply(reply, userId), replies }, { status: 201 });
  } catch (error) { return safeApiError(error) }
}