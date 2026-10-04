import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { safeApiError } from '@/lib/api-input'
import { canViewProfile } from '@/lib/visibility'
type Context = { params: Promise<{ planetId: string }> }
export async function GET(_request: Request, { params }: Context) {
  try {
    const { user } = await requireUser()
    const { planetId } = await params
    const planet = await prisma.planet.findFirst({ where: { id: planetId, active: true, user: { deletedAt: null } }, select: { userId: true } })
    if (!planet || planet.userId === user.id || !await canViewProfile(user.id, planet.userId)) return Response.json({ error: 'notFound' }, { status: 404 })
    const saved = await prisma.savedPlanet.findUnique({ where: { userId_planetId: { userId: user.id, planetId } }, select: { id: true } })
    return Response.json({ saved: !!saved }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return safeApiError(error) }
}
export async function DELETE(_request: Request, { params }: Context) {
  try {
    const { user } = await requireUser()
    const { planetId } = await params
    await prisma.savedPlanet.deleteMany({ where: { userId: user.id, planetId } })
    return new Response(null, { status: 204 })
  } catch (error) { return safeApiError(error) }
}
