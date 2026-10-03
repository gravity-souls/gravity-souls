/** Founder-owned launch accounts with ordinary credential, profile and planet rows.
 *
 * Local validation (no database access): npm run db:seed-warmup -- --check
 * Apply only with an explicitly chosen database and private CSV:
 * WARMUP_DATABASE_URL=... WARMUP_CREDENTIALS_FILE=/absolute/path/credentials.csv \
 *   npm run db:seed-warmup -- --apply
 *
 * The credentials CSV is deliberately outside Git. A rerun never resets a
 * password or overwrites a user's edits. No policy acceptance is fabricated.
 */
import 'dotenv/config'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PrismaClient, PostCategory } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword } from 'better-auth/crypto'

type PlanetInput = {
  seedKey: string
  name: string
  galaxy: string
  themes: string[]
  interests: string[]
  headline: string
  about: string
  conversationStarter: string
}
type SignalInput = { planetSeedKey: string; galaxy: string; text: string }
type Credentials = { seedKey: string; name: string; email: string; password: string }

const catalogue = JSON.parse(readFileSync(resolve(__dirname, 'warmup-planets.json'), 'utf8')) as {
  planets: PlanetInput[]
  signals: SignalInput[]
}

const appearance: Record<string, {
  mood: string; style: string; lifestyle: string; communicationStyle: string
  abstractAxis: number; introspectiveAxis: number; texture: string
  coreColor: string; accentColor: string; ringStyle: string
  category: PostCategory
}> = {
  'mira-27':  { mood: 'calm', style: 'minimal', lifestyle: 'solitary', communicationStyle: 'reflective', abstractAxis: 78, introspectiveAxis: 85, texture: 'neptune.jpg', coreColor: '#6366f1', accentColor: '#a78bfa', ringStyle: 'none', category: PostCategory.THOUGHTS },
  'iora-42':  { mood: 'mixed', style: 'fluid', lifestyle: 'communal', communicationStyle: 'direct', abstractAxis: 42, introspectiveAxis: 35, texture: 'venus_surface.jpg', coreColor: '#fb923c', accentColor: '#fbbf24', ringStyle: 'single', category: PostCategory.GENERAL },
  'veyr-31':  { mood: 'intense', style: 'fractured', lifestyle: 'nomadic', communicationStyle: 'reflective', abstractAxis: 60, introspectiveAxis: 58, texture: 'mars.jpg', coreColor: '#64748b', accentColor: '#93c5fd', ringStyle: 'single', category: PostCategory.TRAVEL },
  'celyn-58': { mood: 'intense', style: 'minimal', lifestyle: 'rooted', communicationStyle: 'analytical', abstractAxis: 77, introspectiveAxis: 40, texture: 'mercury.jpg', coreColor: '#60a5fa', accentColor: '#22d3ee', ringStyle: 'none', category: PostCategory.THOUGHTS },
  'sora-46':  { mood: 'melancholic', style: 'dense', lifestyle: 'solitary', communicationStyle: 'poetic', abstractAxis: 82, introspectiveAxis: 80, texture: 'moon.jpg', coreColor: '#9f1239', accentColor: '#fbbf24', ringStyle: 'none', category: PostCategory.ART },
  'nalo-19':  { mood: 'calm', style: 'fluid', lifestyle: 'rooted', communicationStyle: 'direct', abstractAxis: 38, introspectiveAxis: 50, texture: 'earth_day.jpg', coreColor: '#059669', accentColor: '#6ee7b7', ringStyle: 'none', category: PostCategory.NATURE },
  'elyn-73':  { mood: 'mixed', style: 'fluid', lifestyle: 'nomadic', communicationStyle: 'playful', abstractAxis: 64, introspectiveAxis: 42, texture: 'saturn.jpg', coreColor: '#a78bfa', accentColor: '#f9a8d4', ringStyle: 'double', category: PostCategory.ART },
  'oren-24':  { mood: 'cold', style: 'dense', lifestyle: 'rooted', communicationStyle: 'analytical', abstractAxis: 73, introspectiveAxis: 62, texture: 'jupiter.jpg', coreColor: '#1e3a8a', accentColor: '#d97706', ringStyle: 'single', category: PostCategory.THOUGHTS },
}

function credentialsFromCsv(path: string): Map<string, Credentials> {
  const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/)
  if (lines.shift() !== 'seedKey,name,email,password') throw new Error('Unexpected credentials CSV header')
  const rows = new Map<string, Credentials>()
  for (const line of lines) {
    const [seedKey, name, email, password, ...extra] = line.split(',')
    if (extra.length || !seedKey || !name || !email || !password || rows.has(seedKey)) {
      throw new Error('Invalid or duplicate credentials row')
    }
    if (!/^[^@\s]+@gravitysouls\.com$/.test(email) || password.length < 16) {
      throw new Error(`Invalid email or password for ${seedKey}`)
    }
    rows.set(seedKey, { seedKey, name, email, password })
  }
  return rows
}

async function main() {
  const mode = process.argv[2]
  if (mode !== '--check' && mode !== '--apply') throw new Error('Pass --check or --apply explicitly')
  const keys = catalogue.planets.map((p) => p.seedKey)
  if (keys.length !== 8 || new Set(keys).size !== keys.length || keys.some((k) => !appearance[k])) {
    throw new Error('Expected eight distinct planet configurations')
  }
  if (keys.some((key) => !existsSync(resolve(__dirname, '../public/textures/warmup', `${key}.png`)))) {
    throw new Error('At least one custom planet texture is missing')
  }
  if (catalogue.signals.some((s) => !keys.includes(s.planetSeedKey) ||
      catalogue.planets.find((p) => p.seedKey === s.planetSeedKey)?.galaxy !== s.galaxy)) {
    throw new Error('Signal author or galaxy does not match the planet catalogue')
  }
  if (mode === '--check') {
    console.log(`Validated ${keys.length} planets and ${catalogue.signals.length} signals; no database access.`)
    return
  }

  const databaseUrl = process.env.WARMUP_DATABASE_URL
  const credentialsFile = process.env.WARMUP_CREDENTIALS_FILE
  if (!databaseUrl || !credentialsFile) throw new Error('WARMUP_DATABASE_URL and WARMUP_CREDENTIALS_FILE are required')
  if (!credentialsFile.startsWith('/')) throw new Error('WARMUP_CREDENTIALS_FILE must be an absolute path')
  const credentials = credentialsFromCsv(credentialsFile)
  if (credentials.size !== keys.length || keys.some((key) => credentials.get(key)?.name !== catalogue.planets.find((p) => p.seedKey === key)?.name)) {
    throw new Error('Credential rows must correspond exactly to the eight planet names')
  }
  const emailSet = new Set([...credentials.values()].map((row) => row.email.toLowerCase()))
  if (emailSet.size !== keys.length) throw new Error('Duplicate email in credentials CSV')

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  const slugByName: Record<string, string> = {
    'Slow Thinkers': 'slow-thinkers', 'Warm Frequency': 'warm-frequency',
    'Threshold States': 'threshold-states', 'Signal & Noise': 'signal-noise',
    'Dusk Archives': 'dusk-archives', 'Body Clocks': 'body-clocks',
    'Image Makers': 'image-makers', 'Late Night Economics': 'late-night-economics',
  }
  let usersCreated = 0
  let planetsCreated = 0
  let postsCreated = 0
  try {
    const slugs = catalogue.planets.map((planet) => slugByName[planet.galaxy])
    if (slugs.some((slug) => !slug)) throw new Error('Unknown galaxy in warmup catalogue')
    const galaxies = await prisma.community.findMany({ where: { slug: { in: slugs } }, select: { slug: true, id: true } })
    if (galaxies.length !== keys.length) throw new Error('Seed the eight galaxy catalogue rows before warmup accounts')
    const galaxyBySlug = new Map(galaxies.map((galaxy) => [galaxy.slug, galaxy.id]))
    for (const planet of catalogue.planets) {
      const credential = credentials.get(planet.seedKey)!
      const visual = appearance[planet.seedKey]
      const userId = `warmup-user-${planet.seedKey}`
      const accountId = `warmup-account-${planet.seedKey}`
      const post = catalogue.signals.find((s) => s.planetSeedKey === planet.seedKey)
      const passwordHash = await hashPassword(credential.password)
      const slug = slugByName[planet.galaxy]
      const galaxyId = galaxyBySlug.get(slug)!

      let result
      try {
        result = await prisma.$transaction(async (tx) => {
          const existingUser = await tx.user.findUnique({ where: { id: userId } })
          const emailOwner = await tx.user.findUnique({ where: { email: credential.email } })
          if ((existingUser && (existingUser.email !== credential.email || existingUser.deletedAt)) ||
              (emailOwner && emailOwner.id !== userId)) throw new Error(`Account identity collision for ${planet.seedKey}`)

          if (!existingUser) await tx.user.create({
            data: { id: userId, name: planet.name.split('-')[0], email: credential.email,
              emailVerified: false, planetTexture: visual.texture, planetTint: visual.coreColor,
              planetAtmoColor: visual.accentColor, planetHasRing: visual.ringStyle !== 'none',
              planetRingColor: visual.accentColor,
              planetAtmoDensity: visual.ringStyle === 'none' ? 0.1 : 0.16,
              planetRotationSpeed: 0.011 + (visual.abstractAxis % 8) * 0.002,
              planetCloudOpacity: visual.lifestyle === 'nomadic' ? 0.16 : 0.04,
              planetCustomTexture: `/textures/warmup/${planet.seedKey}.png` },
          })
          const account = await tx.account.findUnique({ where: { id: accountId } })
          if (account && (account.userId !== userId || account.accountId !== userId || account.providerId !== 'credential')) {
            throw new Error(`Credential account collision for ${planet.seedKey}`)
          }
          if (!account) await tx.account.create({
            data: { id: accountId, accountId: userId, providerId: 'credential', userId, password: passwordHash },
          })
          const profile = await tx.profile.findUnique({ where: { userId } })
          if (!profile) await tx.profile.create({ data: {
            userId, name: planet.name.split('-')[0],
            communicationStyle: visual.communicationStyle, culturalTags: planet.interests,
            visibility: 'MEMBERS',
          } })
          const existingPlanets = await tx.planet.findMany({ where: { userId }, select: { name: true, active: true } })
          if (existingPlanets.length && (existingPlanets.length !== 1 || existingPlanets[0].name !== planet.name || !existingPlanets[0].active)) {
            throw new Error(`Existing planet differs for ${planet.seedKey}`)
          }
          if (!existingPlanets.length) await tx.planet.create({ data: {
            userId, name: planet.name, tagline: planet.headline, role: 'resonator',
            mood: visual.mood, style: visual.style, lifestyle: visual.lifestyle,
            coreThemes: planet.themes, contentFragments: [planet.about, planet.conversationStarter],
            abstractAxis: visual.abstractAxis, introspectiveAxis: visual.introspectiveAxis,
            visual: { coreColor: visual.coreColor, accentColor: visual.accentColor,
              textureFile: visual.texture, ringStyle: visual.ringStyle,
              surfaceStyle: 'smooth', satelliteCount: visual.lifestyle === 'communal' ? 3 : 1, size: 'lg' },
            active: true,
          } })
          const questionnaire = await tx.questionnaireResult.findFirst({ where: { userId } })
          if (!questionnaire) await tx.questionnaireResult.create({ data: {
            userId, answers: {}, mood: visual.mood, style: visual.style,
            lifestyle: visual.lifestyle, abstractAxis: visual.abstractAxis,
            introspectiveAxis: visual.introspectiveAxis,
          } })
          await tx.communityMembership.upsert({
            where: { userId_communityId: { userId, communityId: galaxyId } },
            update: {}, create: { userId, communityId: galaxyId, role: 'MEMBER' },
          })
          const existingPost = post && await tx.post.findUnique({ where: { id: `warmup-post-${planet.seedKey}` } })
          if (existingPost && existingPost.authorId !== userId) throw new Error(`Post collision for ${planet.seedKey}`)
          if (post && !existingPost) await tx.post.create({ data: {
            id: `warmup-post-${planet.seedKey}`, authorId: userId, content: post.text,
            category: visual.category, tags: planet.themes,
          } })
          return { userCreated: !existingUser, planetCreated: !existingPlanets.length, postCreated: !!post && !existingPost }
        })
      } catch (error) {
        const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
          ? ` (${error.code})` : ''
        throw new Error(`Warmup import stopped at ${planet.seedKey}${code}; that account's transaction rolled back. Earlier accounts may have been created. Re-run safely after fixing the issue.`)
      }
      usersCreated += Number(result.userCreated)
      planetsCreated += Number(result.planetCreated)
      postsCreated += Number(result.postCreated)
    }
    console.log(`Warmup accounts: ${usersCreated} users, ${planetsCreated} planets, ${postsCreated} posts created. Existing records left unchanged.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : 'Warmup import failed'); process.exitCode = 1 })
