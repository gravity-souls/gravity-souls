import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Get full user data bundle for current authenticated user
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;

  const [profile, questionnaire, planet, communities] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.questionnaireResult.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.planet.findFirst({
      where: { userId, active: true },
    }),
    prisma.communityMembership.findMany({
      where: { userId },
      include: { community: true },
    }),
  ]);

  return NextResponse.json({
    user: session.user,
    profile,
    questionnaire,
    planet,
    communities: communities.map((m: { community: unknown }) => m.community),
  });
}
