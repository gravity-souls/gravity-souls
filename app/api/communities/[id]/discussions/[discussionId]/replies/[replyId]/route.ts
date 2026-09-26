import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; discussionId: string; replyId: string }> },
) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const { id, discussionId, replyId } = await params;

  const discussion = await prisma.communityDiscussion.findFirst({
    where: { id: discussionId, communityId: id },
    select: { id: true },
  });

  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  const reply = await prisma.communityDiscussionReply.findUnique({
    where: { id: replyId },
    select: { id: true, discussionId: true, authorId: true },
  });

  if (!reply || reply.discussionId !== discussionId) {
    return NextResponse.json({ error: "Reply not found" }, { status: 404 });
  }

  // authorId is nullable (seeded/system replies) — strict inequality
  // correctly rejects deletion for those.
  if (reply.authorId !== session.user.id) {
    return NextResponse.json({ error: "Only the author can delete this reply" }, { status: 403 });
  }

  await prisma.communityDiscussionReply.delete({ where: { id: replyId } });

  return NextResponse.json({ success: true });
}
