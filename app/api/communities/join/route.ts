import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// POST /api/communities/join - join a community (idempotent)
export async function POST(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const body = await request.json();
  const { communityId } = body;

  if (!communityId || typeof communityId !== "string") {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const userId = session.user.id;

  // Verify community exists
  const community = await prisma.community.findUnique({
    where: { id: communityId },
  });

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  // Idempotent: upsert to avoid duplicate key errors
  const membership = await prisma.communityMembership.upsert({
    where: {
      userId_communityId: { userId, communityId },
    },
    create: { userId, communityId },
    update: {},
  });

  return NextResponse.json({ joined: true, membership });
}
