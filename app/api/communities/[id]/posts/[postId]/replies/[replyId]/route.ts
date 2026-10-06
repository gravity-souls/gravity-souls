import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { safeApiError } from '@/lib/api-input'
import { galaxyAccess } from '@/lib/galaxy-workflow'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string; replyId: string }> },
) {
  try {
  const session = await requireUser();

  const { id, postId, replyId } = await params;

  return await prisma.$transaction(async tx => {
  await galaxyAccess(tx, id, session.user, true)
  const post = await tx.communityPost.findFirst({
    where: { id: postId, communityId: id },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const reply = await tx.communityPostReply.findUnique({
    where: { id: replyId },
    select: { id: true, postId: true, authorId: true },
  });

  if (!reply || reply.postId !== postId) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  if (reply.authorId !== session.user.id) {
    return NextResponse.json({ error: "Only the author can delete this reply" }, { status: 403 });
  }

  await tx.communityPostReply.delete({ where: { id: replyId } });

  return NextResponse.json({ success: true });
  })
  } catch (error) { return safeApiError(error) }
}
