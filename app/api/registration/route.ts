import { normalizedPublicTags } from '@/lib/public-planet-tags'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { registrationSchema, isAdultBirthDate, parseBirthDate, serializeRegistrationBasics } from '@/lib/registration-basics'

export async function GET() {
  try {
    const session = await requireUser()
    const [user, basics] = await Promise.all([
      prisma.user.findUnique({ where: { id: session.user.id }, select: { registrationRequired: true, deletedAt: true } }),
      prisma.registrationBasics.findUnique({ where: { userId: session.user.id } }),
    ])
    if (!user || user.deletedAt) return Response.json({ error: 'Unauthorized' }, { status: 401 })
    return Response.json({ required: !!user?.registrationRequired && !basics, basics: basics && serializeRegistrationBasics(basics) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return safeApiError(e) }
}

export async function PUT(request: Request) {
  try {
    const session = await requireUser()
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'origin' }, { status: 403 })
    const input = await readJson(request, registrationSchema)
    if (!input.ok) return input.response
    const { birthDate, adultConfirmed, ...preferences } = input.data
    // A supplied underage/invalid date cannot be overridden by a checkbox.
    if (typeof birthDate === 'string' && !isAdultBirthDate(birthDate)) return Response.json({ error: 'ADULT_REQUIRED' }, { status: 400 })
    const date = typeof birthDate === 'string' ? parseBirthDate(birthDate) : birthDate
    const basics = await prisma.$transaction(async tx => {
      // Coordinate with account deletion: private data must not be recreated
      // after its owner has been scrubbed.
      await tx.$queryRaw`SELECT "id" FROM "user" WHERE "id" = ${session.user.id} FOR UPDATE`
      const owner = await tx.user.findFirst({ where: { id: session.user.id, deletedAt: null } })
      if (!owner) throw Response.json({ error: 'Unauthorized' }, { status: 401 })
      const existing = await tx.registrationBasics.findUnique({ where: { userId: session.user.id } })
      if (!existing && !birthDate && adultConfirmed !== true) throw Response.json({ error: 'ADULT_REQUIRED' }, { status: 400 })
      const effectiveDate = date === undefined ? existing?.birthDate ?? null : date
      preferences.publicTags = normalizedPublicTags({ ...preferences, birthDate: effectiveDate })
      return tx.registrationBasics.upsert({
        where: { userId: session.user.id },
        create: { userId: session.user.id, ...preferences, birthDate: effectiveDate, adultConfirmedAt: new Date(), ageMethod: birthDate ? 'birth-date-declaration' : 'adult-self-declaration' },
        update: { ...preferences, ...(date !== undefined ? { birthDate: date } : {}) },
      })
    })
    return Response.json({ basics: serializeRegistrationBasics(basics) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) { return safeApiError(e) }
}
