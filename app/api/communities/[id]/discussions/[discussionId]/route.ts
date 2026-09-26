import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; discussionId: string }> },
) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const { id, discussionId } = await params;

  const discussion = await prisma.communityDiscussion.findFirst({
    where: { id: discussionId, communityId: id },
    select: { id: true, authorId: true },
  });

  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  // authorId is nullable (seeded/system discussions have no author) —
  // strict inequality correctly rejects deletion for those (null !== any
  // real user id), same as an unowned row.
  if (discussion.authorId !== session.user.id) {
    return NextResponse.json({ error: "Only the author can delete this discussion" }, { status: 403 });
  }

  await prisma.communityDiscussion.delete({ where: { id: discussionId } });

  return NextResponse.json({ success: true });
}
