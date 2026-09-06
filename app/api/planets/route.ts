import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { safeApiError } from "@/lib/api-input";
import { blockedUserIds } from "@/lib/visibility";

const PAGE_SIZE = 30;

// GET /api/planets - returns active, member-visible planets (excluding current
// user's own, blocked users in either direction, and private profiles)
export async function GET(request: Request) {
  try {
    const session = await requireUser();
    const userId = session.user.id;

    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? PAGE_SIZE) || PAGE_SIZE));

    const excludedUserIds = await blockedUserIds(userId);
    excludedUserIds.add(userId);

    const planets = await prisma.planet.findMany({
      where: {
        active: true,
        userId: { notIn: Array.from(excludedUserIds) },
        // A missing Profile row (not everyone who creates a planet has one
        // yet) defaults to the approved MEMBERS-visible default — same rule
        // as lib/visibility.ts's canViewProfile. `profile: { is: {...} }`
        // alone would silently exclude every user with no Profile row, since
        // `is` requires the relation to exist; only an explicit PRIVATE
        // profile should be excluded here.
        user: { OR: [{ profile: null }, { profile: { is: { visibility: { not: "PRIVATE" } } } }] },
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
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
        createdAt: true,
        user: {
          select: {
            userLevel: true,
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
      },
    });

    const nextPlanet = planets.length > limit ? planets.pop() : null;

    const result = planets.map((p) => ({
      id: p.id,
      userId: p.userId,
      name: p.name,
      avatarSymbol: p.avatarSymbol,
      tagline: p.tagline,
      role: p.role,
      mood: p.mood,
      style: p.style,
      lifestyle: p.lifestyle,
      coreThemes: p.coreThemes,
      contentFragments: p.contentFragments,
      visual: p.visual,
      abstractAxis: p.abstractAxis,
      introspectiveAxis: p.introspectiveAxis,
      createdAt: p.createdAt,
      location: p.user.profile?.location ?? null,
      languages: p.user.profile?.languages ?? [],
      culturalTags: p.user.profile?.culturalTags ?? [],
      travelCities: p.user.profile?.travelCities ?? [],
      musicTaste: p.user.profile?.musicTaste ?? [],
      bookTaste: p.user.profile?.bookTaste ?? [],
      filmTaste: p.user.profile?.filmTaste ?? [],
      communicationStyle: p.user.profile?.communicationStyle ?? null,
      matchPreference: p.user.profile?.matchPreference ?? "mixed",
      userLevel: p.user.userLevel ?? 1,
    }));

    return Response.json({ planets: result, nextCursor: nextPlanet?.id ?? null });
  } catch (error) {
    return safeApiError(error);
  }
}
