import { readJson, safeApiError } from '@/lib/api-input'
import { planetCreateSchema } from '@/lib/input-schemas'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// Create or update the active planet
export async function POST(request: Request) {
  try {
    let session;
    try {
      session = await requireUser();
    } catch (res) {
      return res as Response;
    }

    const input = await readJson(request, planetCreateSchema)
    if (!input.ok) return input.response
    const body = input.data;

    // Deactivate any existing active planet
    await prisma.planet.updateMany({
      where: { userId: session.user.id, active: true },
      data: { active: false },
    });

    const planet = await prisma.planet.create({
      data: {
        userId: session.user.id,
        name: body.name ?? "",
        avatarSymbol: body.avatarSymbol ?? "🪐",
        tagline: body.tagline,
        role: body.role ?? "explorer",
        mood: body.mood ?? "calm",
        style: body.style ?? "minimal",
        lifestyle: body.lifestyle ?? "solitary",
        coreThemes: body.coreThemes ?? [],
        contentFragments: body.contentFragments ?? [],
        visual: body.visual ?? {},
        abstractAxis: body.abstractAxis ?? 50,
        introspectiveAxis: body.introspectiveAxis ?? 50,
        active: true,
      },
    });

    return NextResponse.json(planet);

  } catch (error) {
    return safeApiError(error)
  }
}

// Get the active planet for current user
export async function GET() {
  try {
    let session;
    try {
      session = await requireUser();
    } catch (res) {
      return res as Response;
    }

    const planet = await prisma.planet.findFirst({
      where: { userId: session.user.id, active: true },
    });

    return NextResponse.json(planet);

  } catch (error) {
    return safeApiError(error)
  }
}
