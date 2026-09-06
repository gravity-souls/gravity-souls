import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { readJson, safeApiError } from '@/lib/api-input'
import { isOperatorEmail } from '@/lib/operator'
import { z } from 'zod'

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(['OPEN', 'REVIEWED', 'ACTIONED', 'DISMISSED']),
}).strict()

// GET /api/admin/reports - operator-only report queue
export async function GET(request: Request) {
  try {
    const session = await requireUser()
    if (!isOperatorEmail(session.user.email)) return Response.json({ error: 'Not authorized' }, { status: 403 })

    const url = new URL(request.url)
    const status = url.searchParams.get('status')

    const reports = await prisma.report.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
    })

    return Response.json({ reports })
  } catch (error) {
    return safeApiError(error)
  }
}

// PATCH /api/admin/reports - update a report's status
export async function PATCH(request: Request) {
  try {
    const session = await requireUser()
    if (!isOperatorEmail(session.user.email)) return Response.json({ error: 'Not authorized' }, { status: 403 })

    const input = await readJson(request, updateSchema)
    if (!input.ok) return input.response
    const { id, status } = input.data

    const report = await prisma.report.update({
      where: { id },
      data: { status, reviewedAt: new Date() },
      select: { id: true, status: true, reviewedAt: true },
    })

    return Response.json({ report })
  } catch (error) {
    return safeApiError(error)
  }
}
