import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { communityReplyInclude, serializeCommunityReply as serializeReply } from '@/lib/community-author'
import { blockedUserIds, isBlocked } from '@/lib/visibility'
import { readJson, safeApiError } from '@/lib/api-input'
import { communityReplySchema } from '@/lib/input-schemas'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'
import { deny, galaxyAccess } from '@/lib/galaxy-workflow'

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