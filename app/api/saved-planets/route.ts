import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET /api/saved-planets — return the authenticated user's saved planets (newest first)
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const savedPlanets = await prisma.savedPlanet.findMany({
    where: { userId: session.user.id },
    orderBy: { savedAt: "desc" },
    include: {
      planet: {
        select: {
          id: true,
          name: true,
          avatarSymbol: true,
          tagline: true,
          mood: true,
          lifestyle: true,
          coreThemes: true,
          visual: true,
        },
      },
    },
  });

  return NextResponse.json({ savedPlanets });
}

// POST /api/saved-planets — save a planet for the authenticated user (idempotent, always 200)
export async function POST(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const body = await request.json();
  const { planetId } = body;

  if (!planetId || typeof planetId !== "string") {
    return NextResponse.json({ error: "planetId is required" }, { status: 400 });
  }

  const planet = await prisma.planet.findUnique({ where: { id: planetId } });
  if (!planet) {
    return NextResponse.json({ error: "Planet not found" }, { status: 404 });
  }

  const saved = await prisma.savedPlanet.upsert({
    where: { userId_planetId: { userId: session.user.id, planetId } },
    create: { userId: session.user.id, planetId },
    update: {},
  });

  return NextResponse.json(saved);
}
