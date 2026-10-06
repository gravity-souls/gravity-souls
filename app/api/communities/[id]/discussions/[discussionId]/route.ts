import { galaxyAccess } from '@/lib/galaxy-workflow'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { safeApiError } from '@/lib/api-input'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; discussionId: string }> },
) {
  try {
  const session = await requireUser();

  const { id, discussionId } = await params;

  return await prisma.$transaction(async tx => {
  const access = await galaxyAccess(tx, id, session.user, true)
  const discussion = await tx.communityDiscussion.findFirst({
    where: { id: discussionId, communityId: id },
    select: { id: true, authorId: true },
  });

  if (!discussion) {
    return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
  }

  // authorId is nullable (seeded/system discussions have no author) —
  // strict inequality correctly rejects deletion for those (null !== any
  // real user id), same as an unowned row.
  if (discussion.authorId !== session.user.id && !access.isAdmin) {
    return NextResponse.json({ error: "Only the author can delete this discussion" }, { status: 403 });
  }

  await tx.communityDiscussion.delete({ where: { id: discussionId } });

  return NextResponse.json({ success: true });
  })
  } catch (error) { return safeApiError(error) }
}
