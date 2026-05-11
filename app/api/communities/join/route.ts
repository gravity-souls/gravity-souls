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

  const existingAdmin = await prisma.communityMembership.findFirst({
    where: { communityId, role: "ADMIN" },
    select: { id: true },
  });

  const shouldBootstrapAdmin = !community.creatorId && !existingAdmin;

  if (existingMembership) {
    if (shouldBootstrapAdmin && existingMembership.role !== "ADMIN") {
      const [membership] = await prisma.$transaction([
        prisma.communityMembership.update({
          where: { id: existingMembership.id },
          data: { role: "ADMIN" },
        }),
        prisma.community.update({
          where: { id: communityId },
          data: { creatorId: userId },
        }),
      ]);

      return NextResponse.json({ joined: true, membership, xpEvent: null, leveledUp: false });
    }

    return NextResponse.json({ joined: true, membership: existingMembership, xpEvent: null, leveledUp: false });
  }

  const [membership] = shouldBootstrapAdmin
    ? await prisma.$transaction([
        prisma.communityMembership.create({
          data: { userId, communityId, role: "ADMIN" },
        }),
        prisma.community.update({
          where: { id: communityId },
          data: { creatorId: userId },
        }),
      ])
    : [await prisma.communityMembership.create({ data: { userId, communityId } })];

  const xpEvent = await grantXP(userId, "GALAXY_JOINED");

  return NextResponse.json({ joined: true, membership, xpEvent, leveledUp: xpEvent.leveledUp });
}
