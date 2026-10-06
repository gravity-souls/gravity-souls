import { Prisma } from '@prisma/client'
import { isBlocked } from '@/lib/visibility'
import { prisma } from '@/lib/prisma'
import { isOperatorEmail } from '@/lib/operator'
import { resolveLocale } from '@/lib/i18n-locales'
import { tNotification } from '@/lib/notification-i18n'
import { calculateLevel, XP_EVENTS, type XPEventType } from '@/lib/xp'
import {
  USER_PLANET_CONFIG_SELECT,
  planetConfigFromUser,
} from '@/lib/user-planet-config'

export type Actor = { id: string; email?: string | null }
export type Tx = Prisma.TransactionClient
export function deny(key: string, status = 403): never {
  throw Response.json({ error: key }, { status })
}
export async function galaxyAccess(
  tx: Tx,
  id: string,
  actor: Actor,
  lock = false,
) {
  // Lock parent before child everywhere: membership edits cannot race event permissions.
  if (lock)
    await tx.$queryRaw`SELECT id FROM community WHERE id = ${id} FOR UPDATE`
  const galaxy = await tx.community.findUnique({
    where: { id },
    include: { memberships: { where: { userId: actor.id } } },
  })
  if (!galaxy) deny('notFound', 404)
  const membership = galaxy.memberships[0]
  const isOperator = isOperatorEmail(actor.email)
  const isOwner = galaxy.creatorId === actor.id || isOperator
  return {
    galaxy,
    membership,
    isOwner,
    isAdmin: isOwner || membership?.role === 'ADMIN',
    isOperator,
  }
}
export async function notify(
  tx: Tx,
  userIds: string[],
  key: string,
  url: string,
  values: Record<string, string> = {},
) {
  const users = await tx.user.findMany({
    where: { id: { in: [...new Set(userIds)] }, deletedAt: null },
    select: { id: true, language: true },
  })
  for (const user of users)
    await tx.notification.create({
      data: {
        userId: user.id,
        type: 'GALAXY_NEW_EVENT',
        actionUrl: url,
        title: await tNotification(
          resolveLocale(user.language),
          `${key}Title`,
          values,
        ),
        body: await tNotification(
          resolveLocale(user.language),
          `${key}Body`,
          values,
        ),
      },
    })
}
export async function adminIds(tx: Tx, id: string) {
  const galaxy = await tx.community.findUniqueOrThrow({
    where: { id },
    select: {
      creatorId: true,
      memberships: { where: { role: 'ADMIN' }, select: { userId: true } },
    },
  })
  return [
    ...new Set(
      [galaxy.creatorId, ...galaxy.memberships.map((m) => m.userId)].filter(
        (id): id is string => !!id,
      ),
    ),
  ]
}
export async function reward(tx: Tx, userId: string, type: XPEventType) {
  const user = await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: XP_EVENTS[type] } },
    select: { xp: true, userLevel: true },
  })
  await tx.xPEvent.create({
    data: { userId, type, xpGranted: XP_EVENTS[type] },
  })
  const level = calculateLevel(user.xp)
  if (level > user.userLevel)
    await tx.user.update({ where: { id: userId }, data: { userLevel: level } })
}
export const eventInclude = {
  galaxy: { select: { slug: true, name: true } },
  proposer: {
    select: {
      deletedAt: true,
      id: true,
      name: true,
      userLevel: true,
      ...USER_PLANET_CONFIG_SELECT,
    },
  },
  rsvps: {
    where: { status: 'APPROVED' as const },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          userLevel: true,
          ...USER_PLANET_CONFIG_SELECT,
        },
      },
    },
  },
  _count: { select: { rsvps: { where: { status: 'APPROVED' as const } } } },
} satisfies Prisma.EventInclude
export async function lockedEvent(
  tx: Tx,
  galaxyId: string,
  eventId: string,
  actor: Actor,
) {
  const access = await galaxyAccess(tx, galaxyId, actor, true)
  await tx.$queryRaw`SELECT id FROM event WHERE id = ${eventId} AND "galaxyId" = ${galaxyId} FOR UPDATE`
  const event = await tx.event.findUnique({
    where: { id: eventId },
    include: eventInclude,
  })
  if (!event || event.galaxyId !== galaxyId) deny('notFound', 404)
  const viewer = await tx.user.findUnique({ where: { id: actor.id }, select: { deletedAt: true } })
  if (!viewer || viewer.deletedAt) deny('Unauthorized', 401)
  if (event.proposer.deletedAt || await isBlocked(actor.id, event.proposerId, tx)) deny('notFound', 404)
  return { ...access, event }
}
export async function capacity(tx: Tx, eventId: string, max: number | null) {
  const count = await tx.eventRSVP.count({
    where: { eventId, status: 'APPROVED' },
  })
  if (max !== null && count >= max) deny('eventFull', 409)
}
export function activeEvent(event: { status: string; date: Date }) {
  if (event.status !== 'APPROVED' || event.date <= new Date())
    deny('eventClosed', 409)
}
export async function members(id: string, actor: Actor | null) {
  return prisma.$transaction(async (tx) => {
    const galaxy = await tx.community.findUnique({
      where: { id },
      select: { creatorId: true },
    })
    if (!galaxy) deny('notFound', 404)
    const access = actor ? await galaxyAccess(tx, id, actor) : null
    const canView = !!access && (!!access.membership || access.isAdmin)
    const rows = canView
      ? await tx.communityMembership.findMany({
          where: { communityId: id, user: { deletedAt: null } },
          orderBy: { joinedAt: 'asc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                userLevel: true,
                ...USER_PLANET_CONFIG_SELECT,
                profile: { select: { visibility: true } },
                planets: { where: { active: true }, take: 1 },
              },
            },
          },
        })
      : []
    const blocks = actor
      ? await tx.block.findMany({
          where: { OR: [{ blockerId: actor.id }, { blockedId: actor.id }] },
          select: { blockerId: true, blockedId: true },
        })
      : []
    const hidden = new Set(
      blocks
        .flatMap((b) => [b.blockerId, b.blockedId])
        .filter((id) => id !== actor?.id),
    )
    const requests = access?.isAdmin
      ? await tx.communityJoinRequest.findMany({
          where: {
            communityId: id,
            status: 'PENDING',
            user: { deletedAt: null },
          },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        })
      : []
    return {
      creatorId: galaxy.creatorId,
      isAdmin: access?.isAdmin ?? false,
      isOwner: access?.isOwner ?? false,
      needsOwner: !galaxy.creatorId,
      canClaim: !!access?.isOperator && !galaxy.creatorId,
      members: rows.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        role: m.role,
        level: m.user.userLevel,
        planetConfig:
          m.user.profile?.visibility !== 'PRIVATE' && !hidden.has(m.userId)
            ? planetConfigFromUser(m.user)
            : null,
        planet:
          m.user.planets[0] &&
          m.user.profile?.visibility !== 'PRIVATE' &&
          !hidden.has(m.userId)
            ? {
                ...m.user.planets[0],
                displayName: m.user.name,
                userLevel: m.user.userLevel,
                planetConfig: planetConfigFromUser(m.user),
                role: 'resonator',
              }
            : null,
      })),
      requests: requests.map((r) => ({
        userId: r.userId,
        name: r.user.name,
        createdAt: r.createdAt,
      })),
    }
  })
}

/** Same owner/admin/operator rule as galaxyAccess, expressed as a list predicate. */
export function managedGalaxyWhere(actor: Actor): Prisma.CommunityWhereInput {
  return isOperatorEmail(actor.email) ? {} : { OR: [
    { creatorId: actor.id },
    { memberships: { some: { userId: actor.id, role: 'ADMIN' } } },
  ] }
}
