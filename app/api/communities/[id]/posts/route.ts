import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { NotificationTemplates } from "@/lib/createNotification";
import { communityAuthor, communityReplyInclude, serializeCommunityReply as serializeReply } from '@/lib/community-author'
import { blockedUserIds } from '@/lib/visibility'
import { readJson, safeApiError } from '@/lib/api-input'
import { communityPostSchema } from '@/lib/input-schemas'
import { checkRateLimit, RATE_LIMITS, rateLimitKey } from '@/lib/rate-limit'
import { deny, galaxyAccess, reward } from '@/lib/galaxy-workflow'
import { resolveLocale } from '@/lib/i18n-locales'
import { LEVEL_NAMES, clampLevel } from '@/lib/xp'

async function serializePost(post: {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; planets: { id: string; name: string; avatarSymbol: string; visual: unknown }[] };
  likes: { userId: string }[];
  replies: Parameters<typeof serializeReply>[0][];
  _count: { likes: number; replies: number };
}, viewerId: string | null) {
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: await communityAuthor(post.author, viewerId),
    likes: post._count.likes,
    replies: post._count.replies,
    likedByMe: post.likes.length > 0,
    replyItems: await Promise.all(post.replies.map(reply => serializeReply(reply, viewerId))),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const { id } = await params;

  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const userId = session?.user?.id;
  const excluded = userId ? [...await blockedUserIds(userId)] : []
  const visibleAuthor = { authorId: { notIn: excluded } }

  const [community, posts] = await Promise.all([
    prisma.community.findUnique({
      where: { id },
      select: { id: true, creatorId: true },
    }),
    prisma.communityPost.findMany({
      where: { communityId: id, ...visibleAuthor },
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
        likes: {
          where: { userId: userId ?? "" },
          select: { userId: true },
        },
        replies: {
          where: visibleAuthor,
          orderBy: { createdAt: "asc" },
          take: 5,
          include: communityReplyInclude(userId ?? null),
        },
        _count: { select: { likes: true, replies: { where: visibleAuthor } } },
      },
    }),
  ]);

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const membership = userId
    ? await prisma.communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId: id } },
        select: { id: true, role: true },
      })
    : null;

  return NextResponse.json({
    joined: !!membership,
    posts: await Promise.all(posts.map(async p => ({ ...await serializePost(p, userId ?? null), canDelete: p.authorId === userId || community.creatorId === userId || membership?.role === 'ADMIN' }))),
  });
  } catch (error) { return safeApiError(error) }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
  const session = await requireUser();

  const { id } = await params;
  const userId = session.user.id;
  const input = await readJson(request, communityPostSchema)
  if (!input.ok) return input.response
  const { content } = input.data
  const limit = RATE_LIMITS.POST_CREATE
  if (!await checkRateLimit(rateLimitKey('POST_CREATE', userId), limit.limit, limit.windowMs)) deny('rateLimited', 429)
  const excluded = [...await blockedUserIds(userId)]

  const { post, xpEvent } = await prisma.$transaction(async tx => {
  const access = await galaxyAccess(tx, id, session.user, true)
  if (!access.membership) deny('joinFirst')
  const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { userLevel: true } })
  const post = await tx.communityPost.create({
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
      likes: {
        where: { userId },
        select: { userId: true },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        take: 5,
        include: communityReplyInclude(userId),
      },
      _count: { select: { likes: true, replies: true } },
    },
  });

  await reward(tx, userId, 'POST_CREATED')
  const after = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { xp: true, userLevel: true, language: true } })
  const xpEvent = { newXP: after.xp, newLevel: after.userLevel, leveledUp: after.userLevel > before.userLevel }
  if (xpEvent.leveledUp) {
    await tx.notification.create({ data: { userId, ...await NotificationTemplates.levelUp(after.userLevel, LEVEL_NAMES[clampLevel(after.userLevel)], resolveLocale(after.language)) } })
  }
  const recipients = await tx.communityMembership.findMany({ where: { communityId: id, userId: { notIn: [userId, ...excluded] } }, select: { userId: true, user: { select: { language: true } } } })
  if (recipients.length) {
    const notices = await Promise.all(recipients.map(async member => ({ userId: member.userId, ...await NotificationTemplates.galaxyNewPost(access.galaxy.name, `/galaxy/${access.galaxy.slug}`, resolveLocale(member.user.language)) })))
    await tx.notification.createMany({ data: notices })
  }
  return { post, xpEvent }
  })

  return NextResponse.json({ post: { ...await serializePost(post, userId), canDelete: true }, xpEvent, leveledUp: xpEvent.leveledUp }, { status: 201 });
  } catch (error) { return safeApiError(error) }
}
