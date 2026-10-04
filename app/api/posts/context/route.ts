import { z } from 'zod'
import { requireUser } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { blockedUserIds } from '@/lib/visibility'
import { safeApiError } from '@/lib/api-input'
export async function GET(request: Request) {
  try {
    const { user } = await requireUser()
    const query = z.object({ kind: z.enum(['galaxies', 'events']).default('galaxies'), galaxyId: z.string().min(1).max(100).optional(), search: z.string().trim().max(80).default(''), page: z.coerce.number().int().min(1).max(10000).default(1) }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!query.success) return Response.json({ error: 'invalidQuery' }, { status: 400 })
    const { kind, galaxyId, search, page } = query.data
    const access = { OR: [{ creatorId: user.id }, { memberships: { some: { userId: user.id } } }] }
    const where = { ...access, ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}) }
    let options
    if (kind === 'galaxies') options = await prisma.community.findMany({ where, select: { id: true, name: true }, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 21 })
    else {
      if (!galaxyId) return Response.json({ error: 'invalidQuery' }, { status: 400 })
      const excluded = [...await blockedUserIds(user.id)]
      options = await prisma.event.findMany({ where: { galaxyId, galaxy: access, status: { in: ['APPROVED', 'PASSED'] }, proposerId: { notIn: excluded }, proposer: { deletedAt: null }, ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}) }, select: { id: true, title: true, galaxyId: true }, orderBy: [{ date: 'desc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 21 })
    }
    const more = options.length > 20
    return Response.json({ options: options.slice(0, 20), page, more }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}
