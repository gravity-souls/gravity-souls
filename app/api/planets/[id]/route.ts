import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { safeApiError } from "@/lib/api-input";
import { resolveUserPlanetConfig } from "@/lib/user-planet-config";
import { canViewProfile } from "@/lib/visibility";

const PLANET_SELECT = {
  id: true,
  userId: true,
  name: true,
  avatarSymbol: true,
  tagline: true,
  role: true,
  mood: true,
  style: true,
  lifestyle: true,
  coreThemes: true,
  contentFragments: true,
  visual: true,
  abstractAxis: true,
  introspectiveAxis: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      userLevel: true,
      planetTexture: true,
      planetTint: true,
      planetAtmoColor: true,
      planetAtmoDensity: true,
      planetHasRing: true,
      planetRingColor: true,
      planetRotationSpeed: true,
      planetCloudOpacity: true,
      planetCustomTexture: true,
      profile: {
        select: {
          location: true,
          languages: true,
          culturalTags: true,
          travelCities: true,
          musicTaste: true,
          bookTaste: true,
          filmTaste: true,
          communicationStyle: true,
          matchPreference: true,
        },
      },
    },
  },
} as const;

// GET /api/planets/[id] - returns a single planet by ID, subject to visibility/block rules
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireUser();
    const { id } = await params;

    const planet = await prisma.planet.findUnique({
      where: { id },
      select: PLANET_SELECT,
    });

    if (!planet || !planet.active) {
      return Response.json({ error: "Planet not found" }, { status: 404 });
    }

    if (!(await canViewProfile(session.user.id, planet.userId))) {
      return Response.json({ error: "Planet not found" }, { status: 404 });
    }

    const profile = planet.user.profile;

    const result = {
      id: planet.id,
      userId: planet.userId,
      name: planet.name,
      avatarSymbol: planet.avatarSymbol,
      tagline: planet.tagline,
      role: planet.role,
      mood: planet.mood,
      style: planet.style,
      lifestyle: planet.lifestyle,
      coreThemes: planet.coreThemes,
      contentFragments: planet.contentFragments,
      visual: planet.visual,
      abstractAxis: planet.abstractAxis,
      introspectiveAxis: planet.introspectiveAxis,
      createdAt: planet.createdAt,
      updatedAt: planet.updatedAt,
      location: profile?.location ?? null,
      languages: profile?.languages ?? [],
      culturalTags: profile?.culturalTags ?? [],
      travelCities: profile?.travelCities ?? [],
      musicTaste: profile?.musicTaste ?? [],
      bookTaste: profile?.bookTaste ?? [],
      filmTaste: profile?.filmTaste ?? [],
      communicationStyle: profile?.communicationStyle ?? null,
      matchPreference: profile?.matchPreference ?? "mixed",
      userLevel: planet.user.userLevel ?? 1,
      planetConfig: resolveUserPlanetConfig(planet.user, planet),
      user: { id: planet.user.id, name: planet.user.name },
    };

    return Response.json(result);
  } catch (error) {
    return safeApiError(error);
  }
}
