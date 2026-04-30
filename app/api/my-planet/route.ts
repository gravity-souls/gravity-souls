import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

// GET /api/my-planet - returns the current user's active planet
export async function GET() {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const planet = await prisma.planet.findFirst({
    where: { userId: session.user.id, active: true },
  });

  if (!planet) {
    return NextResponse.json({ error: "No active planet found" }, { status: 404 });
  }

  return NextResponse.json(planet);
}

// POST /api/my-planet - creates a new active planet with a custom name
export async function POST(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const body = await request.json();
  const { name, tagline, mood, style, lifestyle } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Planet name is required" }, { status: 400 });
  }

  const userId = session.user.id;

  // Deactivate any existing active planets
  await prisma.planet.updateMany({
    where: { userId, active: true },
    data: { active: false },
  });

  const planet = await prisma.planet.create({
    data: {
      userId,
      name: name.trim(),
      tagline: tagline?.trim() || null,
      mood: mood ?? "calm",
      style: style ?? "minimal",
      lifestyle: lifestyle ?? "solitary",
      avatarSymbol: body.avatarSymbol ?? "🪐",
      role: body.role ?? "resonator",
      coreThemes: body.coreThemes ?? [],
      contentFragments: body.contentFragments ?? [],
      visual: body.visual ?? {},
      abstractAxis: body.abstractAxis ?? 50,
      introspectiveAxis: body.introspectiveAxis ?? 50,
      active: true,
    },
  });

  return NextResponse.json(planet, { status: 201 });
}

// PATCH /api/my-planet - updates the current user's active planet
export async function PATCH(request: Request) {
  let session;
  try {
    session = await requireUser();
  } catch (res) {
    return res as Response;
  }

  const userId = session.user.id;

  const planet = await prisma.planet.findFirst({
    where: { userId, active: true },
  });

  if (!planet) {
    return NextResponse.json({ error: "No active planet found" }, { status: 404 });
  }

  const body = await request.json();
  const planetData: Record<string, unknown> = {};
  const profileData: Record<string, unknown> = {};

  // Planet fields
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Planet name cannot be empty" }, { status: 400 });
    }
    planetData.name = body.name.trim();
  }
  if (body.tagline !== undefined) planetData.tagline = body.tagline?.trim() || null;
  if (body.mood !== undefined) planetData.mood = body.mood;
  if (body.style !== undefined) planetData.style = body.style;
  if (body.lifestyle !== undefined) planetData.lifestyle = body.lifestyle;
  if (body.coreThemes !== undefined) planetData.coreThemes = body.coreThemes;
  if (body.contentFragments !== undefined) planetData.contentFragments = body.contentFragments;
  if (body.visual !== undefined) planetData.visual = body.visual;
  if (body.abstractAxis !== undefined) planetData.abstractAxis = body.abstractAxis;
  if (body.introspectiveAxis !== undefined) planetData.introspectiveAxis = body.introspectiveAxis;

  // Profile fields
  if (body.location !== undefined) profileData.location = body.location?.trim() || null;
  if (body.languages !== undefined) profileData.languages = body.languages;
  if (body.culturalTags !== undefined) profileData.culturalTags = body.culturalTags;
  if (body.travelCities !== undefined) profileData.travelCities = body.travelCities;
  if (body.musicTaste !== undefined) profileData.musicTaste = body.musicTaste;
  if (body.bookTaste !== undefined) profileData.bookTaste = body.bookTaste;
  if (body.filmTaste !== undefined) profileData.filmTaste = body.filmTaste;
  if (body.communicationStyle !== undefined) profileData.communicationStyle = body.communicationStyle || null;
  if (body.matchPreference !== undefined) profileData.matchPreference = body.matchPreference || null;

  // Sync name/tagline to profile too
  if (planetData.name) profileData.name = planetData.name;
  if (planetData.tagline !== undefined) profileData.tagline = planetData.tagline;

  const updated = await prisma.planet.update({
    where: { id: planet.id },
    data: planetData,
  });

  // Update profile if any profile fields changed
  if (Object.keys(profileData).length > 0) {
    await prisma.profile.upsert({
      where: { userId },
      create: { userId, ...profileData },
      update: profileData,
    });
  }

  return NextResponse.json(updated);
}
