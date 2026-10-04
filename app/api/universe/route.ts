import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { blockedUserIds } from "@/lib/visibility";
import { resolveUserPlanetConfig, USER_PLANET_CONFIG_SELECT } from "@/lib/user-planet-config";

// GET /api/universe — returns up to 12 visible planets for a signed-in member.
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (response) {
    return response as Response;
  }
  const userId = session.user.id;
  const excludedUserIds = await blockedUserIds(userId);
  excludedUserIds.add(userId);

  const planets = await prisma.planet.findMany({
    where: {
      active: true,
      userId: { notIn: Array.from(excludedUserIds) },
      user: { OR: [{ profile: null }, { profile: { is: { visibility: { not: "PRIVATE" } } } }] },
    },
    select: {
      id: true,
      name: true,
      avatarSymbol: true,
      tagline: true,
      mood: true,
      style: true,
      lifestyle: true,
      coreThemes: true,
      visual: true,
      abstractAxis: true,
      introspectiveAxis: true,
      user: {
        select: {
          userLevel: true,
          ...USER_PLANET_CONFIG_SELECT,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return NextResponse.json(planets.map((planet) => ({
    ...planet,
    userLevel: planet.user.userLevel,
    planetConfig: resolveUserPlanetConfig(planet.user, planet),
    user: undefined,
  })));
}
