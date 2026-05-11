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
          select: { communityId: true, role: true },
        })
      : Promise.resolve([]),
  ]);

  const membershipsByCommunityId = new Map(memberships.map((m: { communityId: string; role?: string }) => [m.communityId, m]));

  const result = communities.map((c) => {
    const { _count, ...rest } = c;
    const membership = membershipsByCommunityId.get(c.id);
    return {
      ...rest,
      memberCount: _count.memberships,
      joined: !!membership,
      isAdmin: c.creatorId === userId || membership?.role === "ADMIN",
    };
  });

  return NextResponse.json(result);
}
