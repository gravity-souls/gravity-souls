import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/planets/[id] - returns a single planet by ID (public)
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const planet = await prisma.planet.findUnique({
    where: { id },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!planet || !planet.active) {
    return NextResponse.json({ error: "Planet not found" }, { status: 404 });
  }

  const p = planet as Record<string, unknown> & { user: Record<string, unknown> & { profile: Record<string, unknown> | null } };

  const result = {
    ...p,
    location: p.user.profile?.location ?? null,
    languages: p.user.profile?.languages ?? [],
    culturalTags: p.user.profile?.culturalTags ?? [],
    travelCities: p.user.profile?.travelCities ?? [],
    musicTaste: p.user.profile?.musicTaste ?? [],
    bookTaste: p.user.profile?.bookTaste ?? [],
    filmTaste: p.user.profile?.filmTaste ?? [],
    communicationStyle: p.user.profile?.communicationStyle ?? null,
    matchPreference: p.user.profile?.matchPreference ?? "mixed",
    user: { id: p.user.id, name: p.user.name },
  };

  return NextResponse.json(result);
}
