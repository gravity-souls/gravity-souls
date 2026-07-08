import 'dotenv/config'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { ALL_TEST_USER_IDS, AUTH_WP, AUTH_NP } from './test-ids'

export default async function globalTeardown() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    // Cascade-delete all test users (sessions, accounts, planets, etc. cascade automatically)
    await prisma.user.deleteMany({
      where: { id: { in: [...ALL_TEST_USER_IDS] } },
    })
    console.log('[e2e teardown] Test users deleted.')
  } finally {
    await prisma.$disconnect()
  }

  // Remove generated auth state files
  for (const f of [AUTH_WP, AUTH_NP]) {
    try { fs.unlinkSync(f) } catch {}
  }
}
