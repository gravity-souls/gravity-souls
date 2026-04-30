import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const { id, postId } = await params;
  const userId = session.user.id;

  const [post, membership] = await Promise.all([
    prisma.communityPost.findFirst({
      where: { id: postId, communityId: id },
      select: { id: true },
    }),
    prisma.communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId: id } },
      select: { id: true },
    }),
  ]);

  if (!post) {
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
}