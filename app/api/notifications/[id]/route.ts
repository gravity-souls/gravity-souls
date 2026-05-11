import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const { id } = await params
  const userId = session.user.id

  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  if (notification.userId !== userId) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  await prisma.notification.delete({ where: { id } })

  return NextResponse.json({ deleted: true })
}
