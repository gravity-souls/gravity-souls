import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isBlocked } from '@/lib/visibility'
import { safeApiError } from '@/lib/api-input'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  try {
  const session = await requireUser();

  const { id, postId } = await params;
  const userId = session.user.id;

  const [post, membership] = await Promise.all([
    prisma.communityPost.findFirst({
      where: { id: postId, communityId: id },
      select: { id: true, authorId: true },
    }),
    prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId: id } },
      select: { id: true },
    }),
  ]);

  if (!post || await isBlocked(userId, post.authorId)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (!membership) {
    return NextResponse.json({ error: "Join this community before liking posts" }, { status: 403 });
  }

  const existing = await prisma.communityPostLike.findUnique({
    where: { postId_userId: { postId, userId } },
    select: { id: true },
  });

  const liked = !existing;

  if (existing) {
    await prisma.communityPostLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.communityPostLike.create({ data: { postId, userId } });
  }

  const likes = await prisma.communityPostLike.count({ where: { postId } });

  return NextResponse.json({ liked, likes });
  } catch (error) { return safeApiError(error) }
}