import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { grantXP } from "@/lib/grantXP";

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

  const existingMembership = await prisma.communityMembership.findUnique({
    where: { userId_communityId: { userId, communityId } },
  });

  if (existingMembership) {
    return NextResponse.json({ joined: true, membership: existingMembership, xpEvent: null, leveledUp: false });
  }

  const membership = await prisma.communityMembership.create({
    data: { userId, communityId },
  });

  const xpEvent = await grantXP(userId, "GALAXY_JOINED");

  return NextResponse.json({ joined: true, membership, xpEvent, leveledUp: xpEvent.leveledUp });
}
