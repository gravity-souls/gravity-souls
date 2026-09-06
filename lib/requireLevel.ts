import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EARLY_ACCESS } from '@/lib/featureFlags'

export async function requireLevel(
  request: Request,
  minLevel: number,
): Promise<{ authorized: boolean; userLevel: number }> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return { authorized: false, userLevel: 0 }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { userLevel: true },
  })
  const userLevel = user?.userLevel ?? 0

  // Early stage: still grant access below the gate, but report the real
  // level rather than a fabricated one. Flip EARLY_ACCESS off once level
  // gating should actually restrict access.
  return {
    authorized: EARLY_ACCESS || userLevel >= minLevel,
    userLevel,
  }
}
