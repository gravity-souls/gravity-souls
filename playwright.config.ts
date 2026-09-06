import { defineConfig, devices } from '@playwright/test'
import { databaseTestEnvironment, TEST_BASE_URL } from './e2e/environment'

const testEnvironment = databaseTestEnvironment()
Object.assign(process.env, testEnvironment)

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/demo/**',
  timeout: 20_000,
  retries: 0,
  // Serial execution — tests share DB state seeded in globalSetup
  workers: 1,
  globalSetup:    './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: TEST_BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Never reuse a developer's server: both build and runtime must use the test DB/origin.
  webServer: {
    command: 'npm run build && npm run start -- --port 3200',
    url: `${TEST_BASE_URL}/sign-in`,
    env: testEnvironment,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
