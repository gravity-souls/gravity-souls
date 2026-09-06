import { prisma } from '@/lib/prisma'

/**
 * Fixed-window rate limiter backed by Postgres so a limit holds across
 * serverless instances (an in-memory counter would not). One atomic
 * INSERT ... ON CONFLICT avoids a read-then-write race under concurrency.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const id = crypto.randomUUID()
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_bucket" ("id", "bucketKey", "windowStart", "count", "updatedAt")
    VALUES (${id}, ${key}, now(), 1, now())
    ON CONFLICT ("bucketKey") DO UPDATE SET
      "count" = CASE
        WHEN "rate_limit_bucket"."windowStart" < now() - (${windowMs}::text || ' milliseconds')::interval
        THEN 1
        ELSE "rate_limit_bucket"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "rate_limit_bucket"."windowStart" < now() - (${windowMs}::text || ' milliseconds')::interval
        THEN now()
        ELSE "rate_limit_bucket"."windowStart"
      END,
      "updatedAt" = now()
    RETURNING "count"
  `
  const count = rows[0]?.count ?? 1
  return count <= limit
}

export const RATE_LIMITS = {
  CONVERSATION_START: { limit: 20, windowMs: 60 * 60_000 },
  MESSAGE_SEND: { limit: 60, windowMs: 60 * 60_000 },
  FOLLOW: { limit: 100, windowMs: 60 * 60_000 },
  REPORT: { limit: 20, windowMs: 60 * 60_000 },
  COMMUNITY_JOIN: { limit: 30, windowMs: 60 * 60_000 },
} as const

export function rateLimitKey(action: keyof typeof RATE_LIMITS, actorId: string): string {
  return `${action}:${actorId}`
}
