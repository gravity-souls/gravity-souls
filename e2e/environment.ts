import 'dotenv/config'
import { testDatabaseUrl } from '../lib/database-safety'
import { E2E } from './test-ids'

export const TEST_BASE_URL = 'http://localhost:3200'

export function databaseTestEnvironment() {
  const databaseUrl = testDatabaseUrl()
  return {
    TEST_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    AUTH_SECRET: 'isolated-local-e2e-secret-never-use-for-real-accounts',
    BETTER_AUTH_URL: TEST_BASE_URL,
    NEXT_PUBLIC_BETTER_AUTH_URL: TEST_BASE_URL,
    SERVER_URL: TEST_BASE_URL,
    // These test providers only exercise URL generation, never real OAuth accounts.
    GOOGLE_CLIENT_ID: 'gravity-e2e.apps.googleusercontent.com',
    GOOGLE_CLIENT_SECRET: 'local-e2e-google-secret',
    APPLE_CLIENT_ID: 'com.gravitysouls.e2e',
    APPLE_CLIENT_SECRET: 'local-e2e-apple-secret',
    BLOB_READ_WRITE_TOKEN: '',
    // E2E.noPlanet is the designated operator fixture for the admin report
    // queue (Phase 22) — it has no other special-cased test semantics tied
    // to its email. E2E.withPlanet (AUTH_WP) is deliberately kept OUT of
    // this list so it stays usable as the "signed-in, non-operator" fixture.
    OPERATOR_EMAILS: E2E.noPlanet.email,
  }
}
