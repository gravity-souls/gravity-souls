import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET /api/communities - returns all communities with joined state for current user
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;

  const [communities, memberships] = await Promise.all([
    prisma.community.findMany({ orderBy: { name: "asc" } }),
    prisma.communityMembership.findMany({
      where: { userId },
      select: { communityId: true },
    }),
  ]);

  const joinedIds = new Set(memberships.map((m) => m.communityId));

  const result = communities.map((c) => ({
    ...c,
    joined: joinedIds.has(c.id),
  }));

  return NextResponse.json(result);
}
