import { timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { cleanupChatImage, imageHeaders } from '@/lib/chat-images'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'unconfigured' }, { status: 503 })
  const expected = Buffer.from(`Bearer ${secret}`), received = Buffer.from(request.headers.get('authorization') ?? '')
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  await prisma.pushDelivery.deleteMany({ where: { expiresAt: { lte: new Date() } } })
  const now = new Date(), rows = await prisma.chatImage.findMany({ where: { message: null, OR: [{ expiresAt: { lte: now } }, { deleteRequested: true, ready: true }] }, orderBy: { expiresAt: 'asc' }, take: 100, select: { id: true } })
  let deleted = 0, failed = 0
  for (const row of rows) { try { if (await cleanupChatImage(row.id, now)) deleted++ } catch { failed++ } }
  return Response.json({ deleted, failed }, { headers: imageHeaders })
}
