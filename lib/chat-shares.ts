import { imageMetadata } from '@/lib/chat-images'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { canViewProfile } from '@/lib/visibility'
import { galaxyAccess, type Actor } from '@/lib/galaxy-workflow'
import { assertEventProposerVisible } from '@/lib/event-visibility'
import { USER_PLANET_CONFIG_SELECT, resolveUserPlanetConfig } from '@/lib/user-planet-config'
import { isShareKind, type SharedCard, type ShareKind } from '@/lib/chat-share-types'
import { serializeMessage } from '@/lib/inbox'

export async function resolveSharedCard(kind: ShareKind, targetId: string, viewer: Actor, db: Prisma.TransactionClient = prisma): Promise<SharedCard> {
  if (kind === 'planet') {
    const planet = await db.planet.findUnique({ where: { id: targetId }, include: { user: { select: { deletedAt: true, ...USER_PLANET_CONFIG_SELECT } } } })
    if (!planet?.active || planet.user.deletedAt || !await canViewProfile(viewer.id, planet.userId, db)) return { available: false }
    return { available: true, kind, id: planet.id, title: planet.name, href: `/planet/${encodeURIComponent(planet.id)}`, planetConfig: resolveUserPlanetConfig(planet.user, planet) }
  }
  if (kind === 'galaxy') {
    const galaxy = await db.community.findUnique({ where: { id: targetId }, select: { id: true, name: true, slug: true } })
    return galaxy ? { available: true, kind, id: galaxy.id, title: galaxy.name, href: `/galaxy/${encodeURIComponent(galaxy.slug)}` } : { available: false }
  }
  const event = await db.event.findUnique({ where: { id: targetId }, include: { proposer: { select: { id: true, deletedAt: true } } } })
  if (!event) return { available: false }
  try {
    const access = await galaxyAccess(db, event.galaxyId, viewer)
    if (!access.isAdmin && event.proposerId !== viewer.id && (!access.membership || !['APPROVED', 'PASSED', 'CANCELLED'].includes(event.status))) return { available: false }
    await assertEventProposerVisible(viewer.id, event.proposer, db)
    return { available: true, kind, id: event.id, title: event.title, date: event.date.toISOString(), href: `/galaxy/${encodeURIComponent(access.galaxy.slug)}?event=${encodeURIComponent(event.id)}#events` }
  } catch (error) {
    if (error instanceof Response && error.status === 404) return { available: false }
    throw error
  }
}

export async function hydrateSharedMessages(rows: (Parameters<typeof serializeMessage>[0] & { shareKind?: string | null; shareTargetId?: string | null; imageId?: string | null })[], viewer: Actor, db: Prisma.TransactionClient = prisma) {
  const cache = new Map<string, Promise<SharedCard>>()
  return Promise.all(rows.map(async row => {
    const message = serializeMessage(row)
    if (row.type === 'image') {
      const image = row.imageId ? await db.chatImage.findUnique({ where: { id: row.imageId } }) : null
      return { ...message, content: '', image: image?.ready && !image.deleteRequested ? imageMetadata(image) : null }
    }
    if (row.type !== 'share') return message
    let share: SharedCard = { available: false }
    if (isShareKind(row.shareKind) && row.shareTargetId) {
      const key = `${row.shareKind}:${row.shareTargetId}`
      if (!cache.has(key)) cache.set(key, resolveSharedCard(row.shareKind, row.shareTargetId, viewer, db))
      share = await cache.get(key)!
    }
    return { ...message, content: '', share }
  }))
}
