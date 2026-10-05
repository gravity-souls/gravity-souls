import { timingSafeEqual } from 'node:crypto'
import { drainPushQueue } from '@/lib/push-notifications'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'unconfigured' }, { status: 503 })
  const expected = Buffer.from(`Bearer ${secret}`), actual = Buffer.from(request.headers.get('authorization') ?? '')
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return Response.json({ error: 'unauthorized' }, { status: 401 })
  try { return Response.json(await drainPushQueue(), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return Response.json({ error: 'unavailable' }, { status: 503 }) }
}
