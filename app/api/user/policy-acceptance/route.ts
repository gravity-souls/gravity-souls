import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { policyAcceptanceSchema } from '@/lib/input-schemas'
import { CURRENT_POLICY_VERSION } from '@/lib/policy-versions'
import type { PolicyType } from '@prisma/client'

const ALL_POLICY_TYPES: PolicyType[] = ['TERMS', 'PRIVACY', 'GUIDELINES']

// POST /api/user/policy-acceptance - records the authenticated user's
// acceptance of every PolicyType at CURRENT_POLICY_VERSION (the sign-up
// checkbox covers Terms/Privacy/Guidelines together, so all three are
// recorded in one call). Idempotent: upsert on the
// (userId, policyType, version) unique constraint, so calling this twice
// never throws and never creates duplicate rows.
export async function POST(request: Request) {
  try {
    const session = await requireUser()

    const input = await readJson(request, policyAcceptanceSchema)
    if (!input.ok) return input.response

    await prisma.$transaction(
      ALL_POLICY_TYPES.map((policyType) =>
        prisma.policyAcceptance.upsert({
          where: {
            userId_policyType_version: {
              userId: session.user.id,
              policyType,
              version: CURRENT_POLICY_VERSION,
            },
          },
          create: { userId: session.user.id, policyType, version: CURRENT_POLICY_VERSION },
          update: {},
        })
      )
    )

    return Response.json({ accepted: true, version: CURRENT_POLICY_VERSION }, { status: 201 })
  } catch (error) {
    return safeApiError(error)
  }
}
