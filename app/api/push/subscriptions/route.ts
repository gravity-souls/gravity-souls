import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { checkRateLimit } from '@/lib/rate-limit'
import { endpointHash, endpointSchema, pushHeaders, requirePushOrigin, subscriptionSchema } from '@/lib/push-validation'
import { pushConfig } from '@/lib/push-notifications'
const statusSchema = z.object({ operation: z.literal('status'), endpoint: endpointSchema }).strict()
const registerSchema = subscriptionSchema.extend({ operation: z.literal('subscribe') }).strict()
const preferenceSchema = z.object({ endpoint: endpointSchema, preview: z.enum(['generic', 'sender']) }).strict()
const removeSchema = z.object({ endpoint: endpointSchema }).strict()
export async function GET() {
  try {
    await requireUser()
    const config = pushConfig()
    return Response.json({ configured: !!config, publicKey: config?.publicKey ?? null }, { headers: pushHeaders })
  } catch (error) { return safeApiError(error) }
}
export async function POST(request: Request) {
  try {
    requirePushOrigin(request)
    const { user, session } = await requireUser()
    const input = await readJson(request, z.discriminatedUnion('operation', [statusSchema, registerSchema]))
    if (!input.ok) return input.response
    const value = input.data, hash = endpointHash(value.endpoint)
    if (value.operation === 'status') {
      const row = await prisma.pushSubscription.findFirst({ where: { endpointHash: hash, userId: user.id, sessionId: session.id }, select: { preview: true } })
      return Response.json({ enabled: !!row, preview: row?.preview ?? 'generic' }, { headers: pushHeaders })
    }
    if (!pushConfig()) return Response.json({ error: 'unconfigured' }, { status: 503, headers: pushHeaders })
    if (!await checkRateLimit(`PUSH_SUBSCRIBE:${user.id}`, 30, 60 * 60_000)) return Response.json({ error: 'rateLimited' }, { status: 429, headers: pushHeaders })
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${user.id} FOR UPDATE`
      const owner = await tx.user.findFirst({ where: { id: user.id, deletedAt: null } })
      const activeSession = await tx.session.findFirst({ where: { id: session.id, userId: user.id, expiresAt: { gt: new Date() } } })
      if (!owner || !activeSession) throw Response.json({ error: 'unavailable' }, { status: 403 })
      await tx.pushSubscription.deleteMany({ where: { userId: user.id, session: { expiresAt: { lte: new Date() } } } })
      const previous = await tx.pushSubscription.findUnique({ where: { endpointHash: hash } })
      if (previous && previous.userId !== user.id) throw Response.json({ error: 'bound' }, { status: 409, headers: pushHeaders })
      if (!previous && await tx.pushSubscription.count({ where: { userId: user.id } }) >= 5) throw Response.json({ error: 'deviceLimit' }, { status: 409, headers: pushHeaders })
      if (previous) {
        await tx.pushDelivery.deleteMany({ where: { subscriptionId: previous.id } })
        await tx.pushSubscription.update({ where: { id: previous.id }, data: { sessionId: session.id, p256dh: value.keys.p256dh, auth: value.keys.auth, preview: value.preview, revision: { increment: 1 } } })
      } else await tx.pushSubscription.create({ data: { userId: user.id, sessionId: session.id, endpointHash: hash, endpoint: value.endpoint, p256dh: value.keys.p256dh, auth: value.keys.auth, preview: value.preview } })
    })
    return Response.json({ enabled: true, preview: value.preview }, { headers: pushHeaders })
  } catch (error) { return safeApiError(error) }
}
export async function PUT(request: Request) {
  try {
    requirePushOrigin(request)
    const { user, session } = await requireUser(), input = await readJson(request, preferenceSchema)
    if (!input.ok) return input.response
    const result = await prisma.pushSubscription.updateMany({ where: { userId: user.id, sessionId: session.id, endpointHash: endpointHash(input.data.endpoint) }, data: { preview: input.data.preview, revision: { increment: 1 } } })
    return Response.json({ enabled: result.count === 1 }, { headers: pushHeaders })
  } catch (error) { return safeApiError(error) }
}
export async function DELETE(request: Request) {
  try {
    requirePushOrigin(request)
    const { user } = await requireUser(), input = await readJson(request, removeSchema)
    if (!input.ok) return input.response
    await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpointHash: endpointHash(input.data.endpoint) } })
    return Response.json({ enabled: false }, { headers: pushHeaders })
  } catch (error) { return safeApiError(error) }
}
