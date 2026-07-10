import 'dotenv/config'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { ALL_TEST_USER_IDS, JOURNEY, AUTH_WP, AUTH_NP, AUTH_SO } from './test-ids'

export default async function globalTeardown() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    // Cascade-delete all fixed-ID test users
    await prisma.user.deleteMany({
      where: { id: { in: [...ALL_TEST_USER_IDS] } },
    })
    // Delete Journey 1 sign-up user (unknown ID, identified by email)
    await prisma.user.deleteMany({ where: { email: JOURNEY.signUp.email } })
    console.log('[e2e teardown] Test users deleted.')
  } finally {
    await prisma.$disconnect()
  }

  // Remove generated auth state files
  for (const f of [AUTH_WP, AUTH_NP, AUTH_SO]) {
    try { fs.unlinkSync(f) } catch {}
  }
}
