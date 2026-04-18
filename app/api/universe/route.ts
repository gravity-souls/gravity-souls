import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/universe — returns up to 12 nearby planets (excluding current user's own)
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;

  const planets = await prisma.planet.findMany({
    where: {
      active: true,
      ...(userId ? { userId: { not: userId } } : {}),
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
    },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return NextResponse.json(planets);
}
