import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string; replyId: string }> },
) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const { id, postId, replyId } = await params;

  const post = await prisma.communityPost.findFirst({
    where: { id: postId, communityId: id },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const reply = await prisma.communityPostReply.findUnique({
    where: { id: replyId },
    select: { id: true, postId: true, authorId: true },
  });

  if (!reply || reply.postId !== postId) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  if (reply.authorId !== session.user.id) {
    return NextResponse.json({ error: "Only the author can delete this reply" }, { status: 403 });
  }

  await prisma.communityPostReply.delete({ where: { id: replyId } });

  return NextResponse.json({ success: true });
}
