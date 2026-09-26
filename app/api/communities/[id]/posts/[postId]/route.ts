import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function DELETE(
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

  const post = await prisma.communityPost.findFirst({
    where: { id: postId, communityId: id },
    select: { id: true, authorId: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (post.authorId !== session.user.id) {
    return NextResponse.json({ error: "Only the author can delete this post" }, { status: 403 });
  }

  await prisma.communityPost.delete({ where: { id: postId } });

  return NextResponse.json({ success: true });
}
