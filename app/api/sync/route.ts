import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * POST /api/sync
 * Migrates localStorage data (planet, profile, sbti) into the database
 * for the currently authenticated user. Called once after login when
 * localStorage data exists.
 */
export async function POST(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;
  const body = await request.json();
  const { planet, sbti } = body;

  const results: Record<string, boolean> = {};

  // -- Sync Profile (from SBTI + planet metadata) ------------------------
  if (sbti || planet) {
    await prisma.profile.upsert({
      where: { userId },
      create: {
        userId,
        name: planet?.name ?? session.user.name ?? "",
        avatarSymbol: planet?.avatarSymbol ?? "🪐",
        tagline: planet?.tagline,
        location: planet?.location,
        languages: planet?.languages ?? [],
        culturalTags: planet?.culturalTags ?? [],
        travelCities: planet?.travelCities ?? [],
        musicTaste: planet?.musicTaste ?? [],
        bookTaste: planet?.bookTaste ?? [],
        filmTaste: planet?.filmTaste ?? [],
        communicationStyle: planet?.communicationStyle,
        matchPreference: planet?.matchPreference ?? "mixed",
        sbtiType: sbti?.typeCode,
        sbtiCn: sbti?.typeCn,
        sbtiPattern: sbti?.patternString,
      },
      update: {
        name: planet?.name ?? session.user.name ?? "",
        avatarSymbol: planet?.avatarSymbol ?? "🪐",
        tagline: planet?.tagline,
        location: planet?.location,
        languages: planet?.languages ?? [],
        culturalTags: planet?.culturalTags ?? [],
        travelCities: planet?.travelCities ?? [],
        musicTaste: planet?.musicTaste ?? [],
        bookTaste: planet?.bookTaste ?? [],
        filmTaste: planet?.filmTaste ?? [],
        communicationStyle: planet?.communicationStyle,
        matchPreference: planet?.matchPreference ?? "mixed",
        sbtiType: sbti?.typeCode,
        sbtiCn: sbti?.typeCn,
        sbtiPattern: sbti?.patternString,
      },
    });
    results.profile = true;
  }

  // -- Sync Questionnaire Result (from SBTI) -----------------------------
  if (sbti) {
    const existing = await prisma.questionnaireResult.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      await prisma.questionnaireResult.create({
        data: {
          userId,
          answers: sbti.scores ?? {},
          mood: planet?.mood ?? null,
          style: planet?.style ?? null,
          lifestyle: planet?.lifestyle ?? null,
          abstractAxis: planet?.cognitiveAxes?.abstract ?? 50,
          introspectiveAxis: planet?.cognitiveAxes?.introspective ?? 50,
        },
      });
    }
    results.questionnaire = true;
  }

  // -- Sync Planet -------------------------------------------------------
  if (planet) {
    // Deactivate any existing active planet
    await prisma.planet.updateMany({
      where: { userId, active: true },
      data: { active: false },
    });

    await prisma.planet.create({
      data: {
        userId,
        name: planet.name ?? "",
        avatarSymbol: planet.avatarSymbol ?? "🪐",
        tagline: planet.tagline,
        role: planet.role ?? "explorer",
        mood: planet.mood ?? "calm",
        style: planet.style ?? "minimal",
        lifestyle: planet.lifestyle ?? "solitary",
        coreThemes: planet.coreThemes ?? [],
        contentFragments: planet.contentFragments ?? [],
        visual: planet.visual ?? {},
        abstractAxis: planet.cognitiveAxes?.abstract ?? 50,
        introspectiveAxis: planet.cognitiveAxes?.introspective ?? 50,
        active: true,
      },
    });
    results.planet = true;
  }

  return NextResponse.json({ synced: results });
}
