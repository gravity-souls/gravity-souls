import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { blockedUserIds } from "@/lib/visibility";
import { universePlanetToProfile } from "@/lib/universe-field";
import { resolveUserPlanetConfig, USER_PLANET_CONFIG_SELECT } from "@/lib/user-planet-config";

const RESULT_LIMIT = 8;

// GET /api/search?q=... — site-wide search across planets, galaxies, and
// upcoming approved events. Planet profiles are member-visible; guests can
// still search galaxies and events.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ planets: [], galaxies: [], events: [] });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  const excludedUserIds = userId ? await blockedUserIds(userId) : new Set<string>();
  if (userId) excludedUserIds.add(userId);

  const [planets, galaxies, events] = await Promise.all([
    userId ? prisma.planet.findMany({
      where: {
        active: true,
        userId: { notIn: Array.from(excludedUserIds) },
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { user: { name: { contains: q, mode: "insensitive" } } },
        ],
        // Same MEMBERS-default rule as /api/planets: a missing Profile row
        // is not everyone who creates a planet has one yet, so only an
        // explicit PRIVATE profile should be excluded.
        user: { deletedAt: null, OR: [{ profile: null }, { profile: { is: { visibility: { not: "PRIVATE" } } } }] },
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
        user: { select: { name: true, ...USER_PLANET_CONFIG_SELECT } },
      },
      orderBy: { createdAt: "desc" },
      take: RESULT_LIMIT,
    }) : Promise.resolve([]),
    prisma.community.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tagline: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { keywords: { has: q.toLowerCase() } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        symbol: true,
        tagline: true,
        accentColor: true,
      },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT,
    }),
    prisma.event.findMany({
      where: {
        status: "APPROVED",
        date: { gte: new Date() },
        title: { contains: q, mode: "insensitive" },
      },
      select: {
        id: true,
        title: true,
        date: true,
        category: true,
        galaxy: { select: { slug: true, name: true } },
      },
      orderBy: { date: "asc" },
      take: RESULT_LIMIT,
    }),
  ]);

  return NextResponse.json({
    planets: planets.map((p) => ({
      ...universePlanetToProfile({ ...p, displayName: p.user.name, visual: (p.visual ?? {}) as Record<string, unknown> }),
      planetConfig: resolveUserPlanetConfig(p.user, p),
    })),
    galaxies,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      date: e.date,
      category: e.category,
      galaxySlug: e.galaxy.slug,
      galaxyName: e.galaxy.name,
    })),
  });
}
