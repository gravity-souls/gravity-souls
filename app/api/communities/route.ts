import { preferenceFit } from '@/lib/preference-matching'
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { galaxySchema } from "@/lib/input-schemas";
import { readJson, safeApiError } from "@/lib/api-input";
import { requireUser } from "@/lib/session";
import { isOperatorEmail } from "@/lib/operator";
import { auth } from "@/lib/auth";

// GET /api/communities - returns all communities with joined state for current user
export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;

  const [communities, memberships, requests, preferences] = await Promise.all([
    prisma.community.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { memberships: true } } },
    }),
    userId
      ? prisma.communityMembership.findMany({
          where: { userId },
          select: { communityId: true, role: true },
        })
      : Promise.resolve([]),
    userId ? prisma.communityJoinRequest.findMany({ where: { userId }, select: { communityId: true, status: true } }) : Promise.resolve([]),
    userId ? prisma.registrationBasics.findUnique({ where: { userId } }) : Promise.resolve(null),
  ]);

  const membershipsByCommunityId = new Map(memberships.map((m: { communityId: string; role?: string }) => [m.communityId, m]));

  const result = communities.map((c) => {
    const { _count, ...rest } = c;
    const membership = membershipsByCommunityId.get(c.id);
    return {
      ...rest,
      recommendation: preferenceFit(preferences, c),
      memberCount: _count.memberships,
      joined: !!membership,
      requestStatus: requests.find(r => r.communityId === c.id)?.status ?? null,
      isAdmin: c.creatorId === userId || membership?.role === "ADMIN" || isOperatorEmail(session?.user.email),
      canManage: c.creatorId === userId || membership?.role === "ADMIN" || isOperatorEmail(session?.user.email),
    };
  });

  return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    const input = await readJson(request, galaxySchema); if (!input.ok) return input.response
    const galaxy = await prisma.$transaction(async tx => {
      if (!await tx.planet.findFirst({ where: { userId: user.id, active: true } })) return null
      const slug = `${input.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,50) || 'galaxy'}-${crypto.randomUUID().slice(0,8)}`
      return tx.community.create({ data: { ...input.data, slug, creatorId: user.id, memberships: { create: { userId: user.id, role: 'ADMIN' } } } })
    })
    if (!galaxy) return Response.json({ error: 'createPlanetFirst' }, { status: 403 })
    return Response.json({ galaxy }, { status: 201 })
  } catch (error) { return safeApiError(error) }
}
