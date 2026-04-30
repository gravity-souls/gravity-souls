import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";

function serializePost(post: {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; planets: { id: string; name: string; avatarSymbol: string; visual: unknown }[] };
  _count: { likes: number; replies: number };
}) {
  const authorPlanet = post.author.planets[0] ?? null;

  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: {
      id: post.author.id,
      name: post.author.name,
      planet: authorPlanet
        ? {
            id: authorPlanet.id,
            name: authorPlanet.name,
            avatarSymbol: authorPlanet.avatarSymbol,
            visual: authorPlanet.visual,
          }
        : null,
    },
    likes: post._count.likes,
    replies: post._count.replies,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;

  const [community, posts] = await Promise.all([
    prisma.community.findUnique({
      where: { id },
      select: { id: true },
    }),
    prisma.communityPost.findMany({
      where: { communityId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            planets: {
              where: { active: true },
              take: 1,
              select: { id: true, name: true, avatarSymbol: true, visual: true },
            },
          },
        },
        _count: { select: { likes: true, replies: true } },
      },
    }),
  ]);

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const membership = userId
    ? await prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
        select: { id: true },
      })
    : null;

  return NextResponse.json({
    joined: !!membership,
    posts: posts.map(serializePost),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const userId = session.user.id;
  const body = await request.json();
  const content = typeof body.content === "string" ? body.content.trim() : "";

  if (content.length < 2) {
    return NextResponse.json({ error: "Post content is required" }, { status: 400 });
  }

  if (content.length > 1000) {
    return NextResponse.json({ error: "Post content is too long" }, { status: 400 });
  }

  const membership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId: id } },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Join this community before posting" }, { status: 403 });
  }

  const post = await prisma.communityPost.create({
    data: {
      communityId: id,
      authorId: userId,
      content,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          planets: {
            where: { active: true },
            take: 1,
            select: { id: true, name: true, avatarSymbol: true, visual: true },
          },
        },
      },
      _count: { select: { likes: true, replies: true } },
    },
  });

  return NextResponse.json({ post: serializePost(post) }, { status: 201 });
}
