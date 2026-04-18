import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/communities - returns all communities with joined state for current user
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;

  const [communities, memberships] = await Promise.all([
    prisma.community.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { memberships: true } } },
    }),
    userId
      ? prisma.communityMembership.findMany({
          where: { userId },
          select: { communityId: true },
        })
      : Promise.resolve([]),
  ]);

  const joinedIds = new Set(memberships.map((m: { communityId: string }) => m.communityId));

  const result = communities.map((c) => {
    const { _count, ...rest } = c;
    return {
      ...rest,
      memberCount: _count.memberships,
      joined: joinedIds.has(c.id),
    };
  });

  return NextResponse.json(result);
}
