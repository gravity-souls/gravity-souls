import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET /api/planets - returns all active planets (excluding current user's)
export async function GET(_request: NextRequest) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;

  const planets = await prisma.planet.findMany({
    where: {
      active: true,
      userId: { not: userId },
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Map to a shape the frontend can consume
  const result = planets.map((p: Record<string, unknown> & { user: Record<string, unknown> & { profile: Record<string, unknown> | null } }) => ({
    ...p,
    // Merge profile fields onto planet for convenience
    location: p.user.profile?.location ?? null,
    languages: p.user.profile?.languages ?? [],
    culturalTags: p.user.profile?.culturalTags ?? [],
    travelCities: p.user.profile?.travelCities ?? [],
    musicTaste: p.user.profile?.musicTaste ?? [],
    bookTaste: p.user.profile?.bookTaste ?? [],
    filmTaste: p.user.profile?.filmTaste ?? [],
    communicationStyle: p.user.profile?.communicationStyle ?? null,
    matchPreference: p.user.profile?.matchPreference ?? "mixed",
    // Don't leak user email/password
    user: { id: p.user.id, name: p.user.name },
  }));

  return NextResponse.json(result);
}
