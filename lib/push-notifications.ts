import webpush from 'web-push'
import { createECDH } from 'node:crypto'
import { after } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validPushEndpoint } from './push-validation'
import { canContact } from './visibility'

export function pushConfig() {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY, privateKey = process.env.WEB_PUSH_PRIVATE_KEY, subject = process.env.WEB_PUSH_SUBJECT
  if (!publicKey || !privateKey || !subject || !/^(mailto:[^\s@]+@[^\s@]+\.[^\s@]+|https:\/\/[^\s]+)$/.test(subject)) return null
  if (!/^[A-Za-z0-9_-]+$/.test(publicKey) || !/^[A-Za-z0-9_-]+$/.test(privateKey) || Buffer.from(publicKey, 'base64url').length !== 65 || Buffer.from(privateKey, 'base64url').length !== 32) return null
  try { const pair = createECDH('prime256v1'); pair.setPrivateKey(Buffer.from(privateKey, 'base64url')); if (pair.getPublicKey().toString('base64url') !== publicKey) return null } catch { return null }
  return { publicKey, privateKey, subject }
}
export async function queueMessagePush(tx: Prisma.TransactionClient, messageId: string, recipientId: string) {
  if (!pushConfig()) return
  const subscriptions = await tx.pushSubscription.findMany({ where: { userId: recipientId }, select: { id: true, revision: true } })
  if (subscriptions.length) await tx.pushDelivery.createMany({ data: subscriptions.map(subscription => ({ subscriptionId: subscription.id, subscriptionRevision: subscription.revision, messageId, expiresAt: new Date(Date.now() + 15 * 60_000) })), skipDuplicates: true })
}
export async function eligiblePush(id: string) {
  const row = await prisma.pushDelivery.findUnique({ where: { id }, include: { subscription: { include: { user: true, session: true } }, message: { include: { sender: true, conversation: true } } } })
  if (!row || row.expiresAt <= new Date() || row.subscriptionRevision !== row.subscription.revision || row.subscription.session.userId !== row.subscription.userId || row.subscription.user.deletedAt || row.subscription.session.expiresAt <= new Date() || row.message.sender.deletedAt || row.message.readAt) return null
  const { userAId, userBId } = row.message.conversation, recipientId = row.subscription.userId
  if (!([userAId, userBId].includes(recipientId)) || row.message.senderId === recipientId || ![userAId, userBId].includes(row.message.senderId) || !await canContact(recipientId, row.message.senderId)) return null
  return row
}
export type PushSender = (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string) => Promise<void>
const send: PushSender = async (subscription, payload) => {
  const vapidDetails = pushConfig()
  if (!vapidDetails) throw new Error('unconfigured')
  await webpush.sendNotification(subscription, payload, { vapidDetails, TTL: 60, timeout: 5000, urgency: 'normal' })
}
export async function drainPushQueue(sender: PushSender = send) {
  if (!pushConfig()) return { configured: false, sent: 0, skipped: 0, failed: 0 }
  const now = new Date(), totals = { configured: true, sent: 0, skipped: 0, failed: 0 }
  // Expired work is never replayed as a late notification. Keep no payload snapshots.
  await prisma.pushDelivery.deleteMany({ where: { expiresAt: { lte: now } } })
  const rows = await prisma.pushDelivery.findMany({ where: { status: 'pending', attempts: { lt: 3 }, nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, orderBy: { createdAt: 'asc' }, take: 6, select: { id: true } })
  for (const row of rows) {
    const leaseToken = crypto.randomUUID()
    const claimed = await prisma.pushDelivery.updateMany({ where: { id: row.id, status: 'pending', attempts: { lt: 3 }, nextAttemptAt: { lte: now }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }, data: { leaseToken, leaseUntil: new Date(Date.now() + 30000), attempts: { increment: 1 } } })
    if (!claimed.count) continue
    const owned = { id: row.id, leaseToken }
    try {
      const current = await eligiblePush(row.id)
      if (!current || !validPushEndpoint(current.subscription.endpoint)) {
        await prisma.pushDelivery.updateMany({ where: owned, data: { status: 'skipped', leaseUntil: null } }); totals.skipped++; continue
      }
      await sender({ endpoint: current.subscription.endpoint, keys: { p256dh: current.subscription.p256dh, auth: current.subscription.auth } }, JSON.stringify({ deliveryId: row.id, locale: current.subscription.user.language }))
      await prisma.pushDelivery.updateMany({ where: owned, data: { status: 'sent', leaseUntil: null } })
      totals.sent++
    } catch (error) {
      const status = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : 0
      if (status === 404 || status === 410) {
        // Do not erase a subscription replaced while this delivery was in flight.
        const stale = await prisma.pushDelivery.findUnique({ where: { id: row.id }, select: { subscriptionId: true, subscriptionRevision: true } })
        if (stale) await prisma.pushSubscription.deleteMany({ where: { id: stale.subscriptionId, revision: stale.subscriptionRevision } })
      } else {
        const current = await prisma.pushDelivery.findUnique({ where: { id: row.id }, select: { attempts: true } })
        await prisma.pushDelivery.updateMany({ where: owned, data: { status: current && current.attempts >= 3 ? 'failed' : 'pending', leaseUntil: null, nextAttemptAt: new Date(Date.now() + 60_000) } })
      }
      totals.failed++
    }
  }
  return totals
}
export function schedulePushDelivery() {
  if (!pushConfig()) return
  try { after(async () => { try { await drainPushQueue() } catch { console.error('Push queue processing failed') } }) }
  catch { console.error('Push scheduling unavailable; deliveries remain queued') }
}
