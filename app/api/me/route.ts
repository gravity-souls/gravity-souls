import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { grantDailyLoginXP } from "@/lib/grantXP";
import { resolvePlanetHasRing, resolvePlanetTexture } from "@/lib/planet-textures";
import type { PlanetProfile } from "@/types/planet";

const DEFAULT_PLANET_VISUAL: PlanetProfile["visual"] = {
  coreColor: "#a78bfa",
  accentColor: "#c4b5fd",
  ringStyle: "single",
  surfaceStyle: "smooth",
  satelliteCount: 1,
  size: "lg",
};

function normalizePlanetVisual(value: unknown): PlanetProfile["visual"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_PLANET_VISUAL;
  return { ...DEFAULT_PLANET_VISUAL, ...(value as Partial<PlanetProfile["visual"]>) };
}

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

  const activePlanetVisual = normalizePlanetVisual(planet?.visual);
  const activePlanetConfig = planet
    ? {
        baseTexture: resolvePlanetTexture({
          mood: planet.mood as PlanetProfile["mood"],
          lifestyle: planet.lifestyle as PlanetProfile["lifestyle"],
          coreThemes: planet.coreThemes,
          visual: activePlanetVisual,
        }),
        tintColor: activePlanetVisual.coreColor,
        atmosphereColor: activePlanetVisual.accentColor,
        atmosphereDensity: 0.12,
        hasRing: resolvePlanetHasRing(),
        ringColor: activePlanetVisual.accentColor,
        rotationSpeed: 0.018,
        cloudOpacity: 0,
        customTextureUrl: undefined,
      }
    : null;

  const legacyPlanetConfig = currentUser
    ? {
        baseTexture: currentUser.planetTexture,
        tintColor: currentUser.planetTint,
        atmosphereColor: currentUser.planetAtmoColor,
        atmosphereDensity: currentUser.planetAtmoDensity,
        hasRing: currentUser.planetHasRing,
        ringColor: currentUser.planetRingColor,
        rotationSpeed: currentUser.planetRotationSpeed,
        cloudOpacity: currentUser.planetCloudOpacity,
        customTextureUrl: currentUser.planetCustomTexture ?? undefined,
      }
    : null;
  const planetConfig = activePlanetConfig ?? legacyPlanetConfig;

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
