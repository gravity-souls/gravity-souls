import { galaxyAccess } from '@/lib/galaxy-workflow'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { safeApiError } from '@/lib/api-input'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  try {
  const session = await requireUser();

  const { id, postId } = await params;

  return await prisma.$transaction(async tx => {
  const access = await galaxyAccess(tx, id, session.user, true)
  const post = await tx.communityPost.findFirst({
    where: { id: postId, communityId: id },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.authorId !== session.user.id && !access.isAdmin) {
    return NextResponse.json({ error: "Only the author can delete this post" }, { status: 403 });
  }

  await tx.communityPost.delete({ where: { id: postId } });

  return NextResponse.json({ success: true });
  })
  } catch (error) { return safeApiError(error) }
}
