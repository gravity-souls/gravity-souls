import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EARLY_ACCESS } from '@/lib/featureFlags'

export async function requireLevel(
  request: Request,
  minLevel: number,
): Promise<{ authorized: boolean; userLevel: number }> {
  if (EARLY_ACCESS) return { authorized: true, userLevel: 5 }

  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return { authorized: false, userLevel: 0 }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { userLevel: true },
  })

  return {
    authorized: (user?.userLevel ?? 0) >= minLevel,
    userLevel: user?.userLevel ?? 0,
  }
}
