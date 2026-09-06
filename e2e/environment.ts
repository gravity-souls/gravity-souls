import 'dotenv/config'
import { testDatabaseUrl } from '../lib/database-safety'

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
  }
}
