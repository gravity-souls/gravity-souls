type Environment = Record<string, string | undefined>

/** Destructive development tools only accept explicitly named, local databases. */
function localDatabase(env: Environment, key: string, suffix: RegExp): string {
  if (env.VERCEL || env.DEPLOYMENT_ENV === 'production') {
    throw new Error('Development database tools are disabled in deployments.')
  }
  const value = env[key]
  if (!value) throw new Error(`${key} is required. Application database credentials are never used as a fallback.`)
  let url: URL
  try { url = new URL(value) } catch { throw new Error(`${key} must be a PostgreSQL URL.`) }
  const name = decodeURIComponent(url.pathname.slice(1))
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^[a-z][a-z0-9_]*$/.test(name)
    || !suffix.test(name)
    || [...url.searchParams.keys()].some((key) => key !== 'sslmode')
  ) {
    throw new Error(`${key} must target a local database with an explicit development/test suffix and no connection overrides.`)
  }
  return value
}

export function testDatabaseUrl(env: Environment = process.env): string {
  return localDatabase(env, 'TEST_DATABASE_URL', /_(test|e2e)$/)
}

export function seedDatabaseUrl(env: Environment = process.env): string {
  if (env.ALLOW_SAMPLE_DATA !== '1') throw new Error('Sample data requires ALLOW_SAMPLE_DATA=1.')
  return localDatabase(env, 'SEED_DATABASE_URL', /_(dev|test|e2e)$/)
}

export function developmentDatabaseUrl(env: Environment = process.env): string {
  return localDatabase(env, 'DEV_DATABASE_URL', /_dev$/)
}
