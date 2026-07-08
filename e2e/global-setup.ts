import 'dotenv/config'
import fs from 'node:fs'
import { scrypt, randomBytes, createHmac } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { E2E, AUTH_DIR, AUTH_WP, AUTH_NP, ALL_TEST_USER_IDS } from './test-ids'

// Replicates @better-auth/utils/password hashPassword exactly.
// Parameters sourced from node_modules/@better-auth/utils/dist/password.node.mjs
function hashPw(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => {
        if (err) { reject(err); return }
        resolve(`${salt}:${key.toString('hex')}`)
      },
    )
  })
}

// Replicates better-call's signCookieValue:
//   value = encodeURIComponent(`${token}.${base64(HMAC-SHA256(token, secret))}`)
// See node_modules/better-call/dist/crypto.mjs
function signCookieToken(token: string): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET env var is required for cookie signing')
  const sig = createHmac('sha256', secret).update(token, 'utf8').digest('base64')
  return encodeURIComponent(`${token}.${sig}`)
}

function makeStorageState(token: string): string {
  return JSON.stringify({
    cookies: [
      {
        name: 'better-auth.session_token',
        value: signCookieToken(token),
        domain: 'localhost',
        path: '/',
        expires: -1,
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ],
    origins: [],
  }, null, 2)
}

export default async function globalSetup() {
  const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! })
  const prisma = new PrismaClient({ adapter })

  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true })

    const pwHash = await hashPw('TestPassword123!')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Wipe all sessions for test users so injection tokens are always current
    await prisma.session.deleteMany({
      where: { userId: { in: [...ALL_TEST_USER_IDS] } },
    })

    // ── with-planet user ──────────────────────────────────────────────────────
    await prisma.user.upsert({
      where: { id: E2E.withPlanet.userId },
      create: {
        id: E2E.withPlanet.userId,
        name: 'E2E With Planet',
        email: E2E.withPlanet.email,
        emailVerified: true,
      },
      update: {},
    })
    // Credential account (needed for form sign-in in test 3)
    await prisma.account.upsert({
      where: { id: `${E2E.withPlanet.userId}_acct` },
      create: {
        id: `${E2E.withPlanet.userId}_acct`,
        accountId: E2E.withPlanet.userId,
        providerId: 'credential',
        userId: E2E.withPlanet.userId,
        password: pwHash,
      },
      update: { password: pwHash },
    })
    // Fresh session with known token
    await prisma.session.create({
      data: {
        id: E2E.withPlanet.sessionId,
        token: E2E.withPlanet.token,
        expiresAt,
        userId: E2E.withPlanet.userId,
      },
    })
    // Ensure exactly one active planet
    await prisma.planet.updateMany({
      where: { userId: E2E.withPlanet.userId, active: true },
      data: { active: false },
    })
    await prisma.planet.create({
      data: {
        userId: E2E.withPlanet.userId,
        name: E2E.withPlanet.planetName,
        avatarSymbol: '◉',
        role: 'resonator',
        mood: 'calm',
        style: 'minimal',
        lifestyle: 'solitary',
        coreThemes: ['inner structure', 'night & silence'],
        contentFragments: [],
        visual: {
          coreColor: '#a78bfa',
          accentColor: '#c4b5fd',
          ringStyle: 'single',
          surfaceStyle: 'smooth',
          satelliteCount: 1,
          size: 'lg',
        },
        abstractAxis: 70,
        introspectiveAxis: 80,
        active: true,
      },
    })

    // ── no-planet user ────────────────────────────────────────────────────────
    await prisma.user.upsert({
      where: { id: E2E.noPlanet.userId },
      create: {
        id: E2E.noPlanet.userId,
        name: 'E2E No Planet',
        email: E2E.noPlanet.email,
        emailVerified: true,
      },
      update: {},
    })
    await prisma.session.create({
      data: {
        id: E2E.noPlanet.sessionId,
        token: E2E.noPlanet.token,
        expiresAt,
        userId: E2E.noPlanet.userId,
      },
    })
    // Deactivate any existing planets so the user truly has none
    await prisma.planet.updateMany({
      where: { userId: E2E.noPlanet.userId, active: true },
      data: { active: false },
    })

    // ── handoff user (onboarding sign-in test) ───────────────────────────────
    await prisma.user.upsert({
      where: { id: E2E.handoff.userId },
      create: {
        id: E2E.handoff.userId,
        name: 'E2E Handoff',
        email: E2E.handoff.email,
        emailVerified: true,
      },
      update: {},
    })
    await prisma.account.upsert({
      where: { id: E2E.handoff.accountId },
      create: {
        id: E2E.handoff.accountId,
        accountId: E2E.handoff.userId,
        providerId: 'credential',
        userId: E2E.handoff.userId,
        password: pwHash,
      },
      update: { password: pwHash },
    })
    // No session or planet — this user signs in via the form during test 7

    // ── Write Playwright storage-state files ──────────────────────────────────
    fs.writeFileSync(AUTH_WP, makeStorageState(E2E.withPlanet.token))
    fs.writeFileSync(AUTH_NP, makeStorageState(E2E.noPlanet.token))

    console.log('[e2e setup] Test users ready. Auth state files written.')
  } finally {
    await prisma.$disconnect()
  }
}
