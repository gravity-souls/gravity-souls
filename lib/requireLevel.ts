import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { EARLY_ACCESS } from '@/lib/featureFlags'
import { isLevelAuthorized } from '@/lib/level-authorization'

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

  return {
    authorized: isLevelAuthorized(userLevel, minLevel, EARLY_ACCESS),
    userLevel,
  }
}
