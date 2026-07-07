import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { grantXP } from '@/lib/grantXP'
import { buildPlanetFromDraft } from '@/lib/planet-builder'
import { INITIAL_DRAFT } from '@/types/creation'
import type { PlanetDraft } from '@/types/creation'

function isValidDraft(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false
  const d = v as Record<string, unknown>
  if (!Array.isArray(d.selectedThemes)) return false
  if (typeof d.abstractAxis !== 'number') return false
  if (typeof d.introspectiveAxis !== 'number') return false
  if (d.resonanceAnswers != null) {
    if (typeof d.resonanceAnswers !== 'object' || Array.isArray(d.resonanceAnswers)) return false
  }
  return true
}

export async function POST(req: NextRequest) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const userId = session.user.id

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const rawDraft = (body as Record<string, unknown> | null)?.draft

  if (!isValidDraft(rawDraft)) {
    return NextResponse.json({ error: 'Invalid draft shape' }, { status: 400 })
  }

  // Merge with INITIAL_DRAFT so buildPlanetFromDraft receives a complete PlanetDraft
  const draft: PlanetDraft = { ...INITIAL_DRAFT, ...(rawDraft as Partial<PlanetDraft>) }

  // First-planet heuristic: grant XP only on initial calibration, not re-calibration.
  // grantXP('PROFILE_COMPLETED') already has its own internal idempotency guard,
  // but this count check is the primary gate to avoid the extra DB read on re-calibration.
  const existingCount = await prisma.planet.count({ where: { userId } })
  const isFirstPlanet = existingCount === 0

  const builtPlanet = buildPlanetFromDraft(draft, userId)

  const created = await prisma.$transaction(async (tx) => {
    await tx.profile.upsert({
      where:  { userId },
      update: {
        communicationStyle: draft.communicationStyle ?? undefined,
        matchPreference:    draft.matchPreference    ?? undefined,
        location:           draft.location           ?? undefined,
        ...(draft.languages?.length    && { languages:    draft.languages }),
        ...(draft.travelCities?.length && { travelCities: draft.travelCities }),
        ...(draft.culturalTags?.length && { culturalTags: draft.culturalTags }),
      },
      create: {
        userId,
        name:               session.user.name ?? '',
        communicationStyle: draft.communicationStyle ?? undefined,
        matchPreference:    draft.matchPreference    ?? 'mixed',
        location:           draft.location           ?? undefined,
        languages:          draft.languages    ?? [],
        travelCities:       draft.travelCities ?? [],
        culturalTags:       draft.culturalTags ?? [],
      },
    })

    await tx.planet.updateMany({
      where: { userId, active: true },
      data:  { active: false },
    })

    const planet = await tx.planet.create({
      data: {
        userId,
        name:             builtPlanet.name,
        avatarSymbol:     builtPlanet.avatarSymbol,
        tagline:          builtPlanet.tagline          ?? undefined,
        role:             builtPlanet.role,
        mood:             builtPlanet.mood,
        style:            builtPlanet.style,
        lifestyle:        builtPlanet.lifestyle,
        coreThemes:       builtPlanet.coreThemes,
        contentFragments: builtPlanet.contentFragments,
        visual:           builtPlanet.visual as object,
        abstractAxis:     draft.abstractAxis,
        introspectiveAxis: draft.introspectiveAxis,
        active:           true,
      },
    })

    // QuestionnaireResult has no unique constraint on userId, so we always create a new record.
    // /api/me uses findFirst + orderBy createdAt desc, so this is the correct pattern.
    await tx.questionnaireResult.create({
      data: {
        userId,
        answers:           (draft.resonanceAnswers ?? {}) as object,
        mood:              builtPlanet.mood,
        style:             builtPlanet.style,
        lifestyle:         builtPlanet.lifestyle,
        abstractAxis:      draft.abstractAxis,
        introspectiveAxis: draft.introspectiveAxis,
      },
    })

    return planet
  })

  if (isFirstPlanet) {
    await grantXP(userId, 'PROFILE_COMPLETED').catch(() => null)
  }

  return NextResponse.json({ planet: { id: created.id, name: created.name } })
}
