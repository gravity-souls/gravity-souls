import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, getOptionalUserSession } from "@/lib/session";
import { communityReplyInclude, serializeCommunityReply as serializeReply } from '@/lib/community-author'
import { blockedUserIds, isBlocked } from '@/lib/visibility'
import { readJson, safeApiError } from '@/lib/api-input'
import { communityReplySchema } from '@/lib/input-schemas'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'
import { deny, galaxyAccess } from '@/lib/galaxy-workflow'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  try {
  const { id, postId } = await params;
  const session = await getOptionalUserSession()
  const viewerId = session?.user.id ?? null
  const excluded = viewerId ? [...await blockedUserIds(viewerId)] : []

  const post = await prisma.communityPost.findFirst({
    where: { id: postId, communityId: id, authorId: { notIn: excluded } },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const replies = await prisma.communityPostReply.findMany({
    where: { postId, authorId: { notIn: excluded } },
    orderBy: { createdAt: "asc" },
    include: communityReplyInclude(viewerId),
  });

  return NextResponse.json({ replies: await Promise.all(replies.map(reply => serializeReply(reply, viewerId))) });
  } catch (error) { return safeApiError(error) }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  try {
  const session = await requireUser();

  const { id, postId } = await params;
  const userId = session.user.id;
  const input = await readJson(request, communityReplySchema)
  if (!input.ok) return input.response
  const { content } = input.data
  const excluded = [...await blockedUserIds(userId)]
  const { reply, replies } = await prisma.$transaction(async tx => {
  const access = await galaxyAccess(tx, id, session.user, true)
  const post = await tx.communityPost.findFirst({
      where: { id: postId, communityId: id },
      select: { id: true, authorId: true },
    })

  if (!post || await isBlocked(userId, post.authorId, tx)) deny('notFound', 404)

  if (!access.membership) deny('joinFirst')
  const limit = RATE_LIMITS.MESSAGE_SEND
  if (!await checkRateLimit(rateLimitKey('MESSAGE_SEND', userId), limit.limit, limit.windowMs, tx)) deny('rateLimited', 429)

  const reply = await tx.communityPostReply.create({
    data: { postId, authorId: userId, content },
    include: communityReplyInclude(userId),
  });

  const replies = await tx.communityPostReply.count({ where: { postId, authorId: { notIn: excluded } } });
  return { reply, replies }
  })

  return NextResponse.json({ reply: await serializeReply(reply, userId), replies }, { status: 201 });
  } catch (error) { return safeApiError(error) }
}