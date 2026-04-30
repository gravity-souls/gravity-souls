import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveGalaxySlug } from "@/lib/mock-galaxies";

interface DefaultDiscussionTopic {
  title: string;
  replies: number;
  heat: number;
}

const DEFAULT_DISCUSSION_TOPICS: Record<string, DefaultDiscussionTopic[]> = {
  "slow-thinkers": [
    { title: "What does thinking slowly actually mean to you?", replies: 24, heat: 0.8 },
    { title: "Books that reward a second read more than the first", replies: 31, heat: 0.9 },
    { title: "The courage to sit with uncertainty instead of resolving it", replies: 12, heat: 0.4 },
  ],
  "signal-noise": [
    { title: "What's your boring tech stack that actually works?", replies: 42, heat: 0.9 },
    { title: "Software craft vs software speed - a false dichotomy?", replies: 55, heat: 1.0 },
    { title: "When does a side project become an obsession?", replies: 29, heat: 0.7 },
    { title: "The aesthetics of well-named variables", replies: 16, heat: 0.5 },
  ],
  "warm-frequency": [
    { title: "Small acts of care that meant more than intended", replies: 38, heat: 0.9 },
    { title: "What makes a conversation feel genuinely safe?", replies: 27, heat: 0.7 },
    { title: "Mutual aid stories - help you gave or received", replies: 21, heat: 0.6 },
  ],
  "image-makers": [
    { title: "The composition that made you rethink everything", replies: 36, heat: 0.8 },
    { title: "Tools vs intent - does your equipment shape your vision?", replies: 44, heat: 0.9 },
    { title: "A photo that works for reasons you cannot explain", replies: 17, heat: 0.5 },
  ],
  "threshold-states": [
    { title: "The city you left that still lives inside you", replies: 52, heat: 1.0 },
    { title: "What does home mean when you have lived in 4 countries?", replies: 41, heat: 0.9 },
    { title: "Third culture identity - the parts you keep, the parts you lose", replies: 34, heat: 0.8 },
  ],
  "body-clocks": [
    { title: "Movement practices that changed your thinking", replies: 31, heat: 0.7 },
    { title: "Sleep is a skill - what actually helped you", replies: 47, heat: 1.0 },
    { title: "The difference between training and performing", replies: 22, heat: 0.6 },
  ],
  "late-night-economics": [
    { title: "The economic model no one taught you that explains everything", replies: 58, heat: 1.0 },
    { title: "Housing as a political choice, not just a market", replies: 44, heat: 0.9 },
    { title: "When did hustle culture stop working for you?", replies: 26, heat: 0.6 },
  ],
};

const REPLY_FILLERS = [
  "I keep coming back to this because the answer changes depending on the project and the people around it.",
  "The strongest version of this idea is probably quieter than the one we usually argue about.",
  "There is something useful in separating taste from habit here. They look similar from the outside.",
  "I agree with the direction, but I think the constraint matters more than the tool choice.",
  "This feels like one of those topics where the boring answer is the most honest one.",
  "The pattern I notice is that good systems make the next decision less dramatic.",
  "I would add that maintenance changes the meaning of almost every early design choice.",
  "Sometimes the real question is what you can explain clearly after being away from it for a month.",
  "This is why I like small examples. They reveal the philosophy faster than abstract rules.",
  "The tension here is productive. Too much certainty would make the thread less useful.",
] as const;

const REPLY_AUTHORS = [
  "Aelion-42",
  "Novaxis-3",
  "Kindus-17",
  "Spirax-14",
  "Sorvae-88",
  "Lumira-33",
  "Orbalin",
  "Calenvix",
] as const;

function seededReply(topic: DefaultDiscussionTopic, slug: string, index: number) {
  const hour = 9 + Math.floor(index / 3);
  const minute = (index * 11) % 60;

  return {
    authorName: REPLY_AUTHORS[(index + topic.title.length) % REPLY_AUTHORS.length],
    content: REPLY_FILLERS[index % REPLY_FILLERS.length],
    seedKey: `${slug}:${topic.title}:${index}`,
    createdAt: new Date(`2026-04-30T${String(hour % 24).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`),
  };
}

function serializeReply(reply: {
  id: string;
  content: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; planets: { id: string; name: string }[] } | null;
}) {
  const authorPlanet = reply.author?.planets[0] ?? null;

  return {
    id: reply.id,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
    author: {
      id: reply.author?.id ?? null,
      name: authorPlanet?.name ?? reply.authorName,
      planet: authorPlanet ? { id: authorPlanet.id, name: authorPlanet.name } : null,
    },
  };
}

function serializeDiscussion(discussion: {
  id: string;
  title: string;
  heat: number;
  replies: Array<Parameters<typeof serializeReply>[0]>;
  _count: { replies: number };
}) {
  return {
    id: discussion.id,
    title: discussion.title,
    heat: discussion.heat,
    replies: discussion._count.replies,
    replyItems: discussion.replies.map(serializeReply),
  };
}

async function ensureDefaultDiscussions(communityId: string, slug: string) {
  const topics = DEFAULT_DISCUSSION_TOPICS[slug] ?? [];

  for (const topic of topics) {
    const discussion = await prisma.communityDiscussion.upsert({
      where: { communityId_title: { communityId, title: topic.title } },
      create: { communityId, title: topic.title, heat: topic.heat },
      update: { heat: topic.heat },
      select: { id: true },
    });

    const replyCount = await prisma.communityDiscussionReply.count({
      where: { discussionId: discussion.id },
    });

    if (replyCount === 0 && topic.replies > 0) {
      await prisma.communityDiscussionReply.createMany({
        data: Array.from({ length: topic.replies }, (_, index) => ({
          discussionId: discussion.id,
          ...seededReply(topic, slug, index),
        })),
        skipDuplicates: true,
      });
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const community = await prisma.community.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const resolvedSlug = resolveGalaxySlug(community.slug);
  await ensureDefaultDiscussions(id, resolvedSlug);

  const defaultOrder = new Map((DEFAULT_DISCUSSION_TOPICS[resolvedSlug] ?? []).map((topic, index) => [topic.title, index]));

  const discussions = await prisma.communityDiscussion.findMany({
    where: { communityId: id },
    include: {
      replies: {
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
      },
      _count: { select: { replies: true } },
    },
  });

  const ordered = discussions.sort((a, b) => {
    const left = defaultOrder.get(a.title) ?? Number.MAX_SAFE_INTEGER;
    const right = defaultOrder.get(b.title) ?? Number.MAX_SAFE_INTEGER;
    return left - right || b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  return NextResponse.json({ discussions: ordered.map(serializeDiscussion) });
}