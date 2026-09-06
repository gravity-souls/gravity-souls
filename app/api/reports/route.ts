import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { reportSchema } from '@/lib/input-schemas'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

// POST /api/reports - file a report against a user, planet, or piece of content.
// Visible only to the reporter and operators; never to the reported party.
export async function POST(request: Request) {
  try {
    const session = await requireUser()
    const userId = session.user.id

    const input = await readJson(request, reportSchema)
    if (!input.ok) return input.response
    const { targetType, targetId, targetUserId, reason, details } = input.data

    const allowed = await checkRateLimit(rateLimitKey('REPORT', userId), RATE_LIMITS.REPORT.limit, RATE_LIMITS.REPORT.windowMs)
    if (!allowed) return Response.json({ error: 'Too many reports. Try again later.' }, { status: 429 })

    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        targetType,
        targetId,
        targetUserId: targetUserId ?? null,
        reason,
        details: details ?? null,
      },
      select: { id: true, createdAt: true },
    })

    return Response.json({ report }, { status: 201 })
  } catch (error) {
    return safeApiError(error)
  }
}
