import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/session'
import { LEVEL_NAMES, clampLevel, xpToNextLevel } from '@/lib/xp'

export async function GET() {
  let session
  try {
    session = await requireUser()
  } catch (res) {
    return res as Response
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, userLevel: true },
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const userLevel = clampLevel(user.userLevel)

  return NextResponse.json({
    xp: user.xp,
    userLevel,
    levelName: LEVEL_NAMES[userLevel],
    progress: xpToNextLevel(user.xp),
  })
}
