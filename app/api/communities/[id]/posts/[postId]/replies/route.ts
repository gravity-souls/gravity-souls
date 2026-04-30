import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function serializeReply(reply: {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; planets: { id: string; name: string }[] };
}) {
  const authorPlanet = reply.author.planets[0] ?? null;

  return {
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    author: {
      id: reply.author.id,
      name: reply.author.name,
      planet: authorPlanet
        ? {
            id: authorPlanet.id,
            name: authorPlanet.name,
          }
        : null,
    },
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  const { id, postId } = await params;

  const post = await prisma.communityPost.findFirst({
    where: { id: postId, communityId: id },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const replies = await prisma.communityPostReply.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          planets: {
            where: { active: true },
            take: 1,
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ replies: replies.map(serializeReply) });
}

export async function POST(
  request: Request,
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
  const body = await request.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (content.length < 2) {
    return NextResponse.json({ error: "Reply content is required" }, { status: 400 });
  }

  if (content.length > 600) {
    return NextResponse.json({ error: "Reply content is too long" }, { status: 400 });
  }

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
    return NextResponse.json({ error: "Join this community before replying" }, { status: 403 });
  }

  const reply = await prisma.communityPostReply.create({
    data: { postId, authorId: userId, content },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          planets: {
            where: { active: true },
            take: 1,
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const replies = await prisma.communityPostReply.count({ where: { postId } });

  return NextResponse.json({ reply: serializeReply(reply), replies }, { status: 201 });
}