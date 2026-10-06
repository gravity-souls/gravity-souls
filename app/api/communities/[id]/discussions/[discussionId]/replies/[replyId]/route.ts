import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { safeApiError } from '@/lib/api-input'
import { galaxyAccess } from '@/lib/galaxy-workflow'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; discussionId: string; replyId: string }> },
) {
  try {
  const session = await requireUser();

  const { id, discussionId, replyId } = await params;

  return await prisma.$transaction(async tx => {
  await galaxyAccess(tx, id, session.user, true)
  const discussion = await tx.communityDiscussion.findFirst({
    where: { id: discussionId, communityId: id },
    select: { id: true },
  });

  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  const reply = await tx.communityDiscussionReply.findUnique({
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

  await tx.communityDiscussionReply.delete({ where: { id: replyId } });

  return NextResponse.json({ success: true });
  })
  } catch (error) { return safeApiError(error) }
}
