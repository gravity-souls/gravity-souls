import { auth } from '@/lib/auth'
import { readJson, safeApiError } from '@/lib/api-input'
import { passwordResetRequestSchema } from '@/lib/input-schemas'
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from '@/lib/rate-limit'

// Thin, rate-limited wrapper around Better Auth's own /request-password-reset
// endpoint — called directly (not via HTTP) so this route's rate limiting
// runs first, matching this codebase's checkRateLimit convention used
// everywhere else instead of Better Auth's own internal limiter.
//
// This is reachable by anyone, signed in or not, so it's keyed by the
// submitted email rather than a session id, and always returns the same
// response regardless of whether that email exists — never confirm or deny
// account existence to the caller.
export async function POST(request: Request) {
  try {
    const input = await readJson(request, passwordResetRequestSchema)
    if (!input.ok) return input.response
    const { email } = input.data

    const allowed = await checkRateLimit(
      rateLimitKey('PASSWORD_RESET_REQUEST', email),
      RATE_LIMITS.PASSWORD_RESET_REQUEST.limit,
      RATE_LIMITS.PASSWORD_RESET_REQUEST.windowMs,
    )
    if (!allowed) {
      return Response.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
    }

    await auth.api.requestPasswordReset({ body: { email, redirectTo: '/reset-password' } })

    return Response.json({ ok: true })
  } catch (error) {
    return safeApiError(error)
  }
}
