import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { z } from 'zod'
import { verificationEmailConfigured } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET() {
  try {
    const { user } = await requireUser()
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, emailVerified: true, deletedAt: true } })
    if (!account || account.deletedAt) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    return Response.json({ name: account.name, email: account.email, verified: account.emailVerified, available: verificationEmailConfigured() }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}
export async function POST(request: Request) {
  try {
    const { user } = await requireUser()
    if (request.headers.get('origin') && request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'invalidOrigin' }, { status: 403 })
    const input = await readJson(request, z.object({}).strict())
    if (!input.ok) return input.response
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerified: true, deletedAt: true } })
    if (!account || account.deletedAt) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    if (account.emailVerified) return Response.json({ verified: true })
    if (!verificationEmailConfigured()) return Response.json({ error: 'unavailable' }, { status: 503 })
    if (!await checkRateLimit(`EMAIL_VERIFICATION:${user.id}`, 3, 3600_000)) return Response.json({ error: 'tooManyRequests' }, { status: 429 })
    // Recipient is read from the session owner, never from client-submitted data.
    await auth.api.sendVerificationEmail({ headers: request.headers, body: { email: account.email, callbackURL: '/settings/account' } })
    return Response.json({ sent: true })
  } catch (error) { return safeApiError(error) }
}
