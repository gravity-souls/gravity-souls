import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { grantDailyLoginXP } from "@/lib/grantXP";
import { resolveUserPlanetConfig } from "@/lib/user-planet-config";

// Get full user data bundle for current authenticated user
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;

  const [profile, questionnaire, planet, communities, currentUser] = await Promise.all([
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
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        planetTexture: true,
        planetTint: true,
        planetAtmoColor: true,
        planetAtmoDensity: true,
        planetHasRing: true,
        planetRingColor: true,
        planetRotationSpeed: true,
        planetCloudOpacity: true,
        planetCustomTexture: true,
        xp: true,
        userLevel: true,
      },
    }),
  ]);

  const dailyXP = await grantDailyLoginXP(userId);

  if (currentUser && dailyXP) {
    currentUser.xp = dailyXP.newXP;
    currentUser.userLevel = dailyXP.newLevel;
  }

  const planetConfig = resolveUserPlanetConfig(currentUser, planet);

  return NextResponse.json({
    user: { ...session.user, ...currentUser, planetConfig },
    profile,
    questionnaire,
    planet,
    communities: communities.map((m: { community: unknown }) => m.community),
    xpEvent: dailyXP,
    leveledUp: dailyXP?.leveledUp ?? false,
  });
}
