import { defineConfig, devices } from '@playwright/test'
import { databaseTestEnvironment } from './e2e/environment'

// Real WebKit engine + iPhone viewport/touch/UA, run against the same
// authenticated journeys as playwright.config.ts — the closest automated
// approximation of real iPhone Safari available; not a substitute for
// testing on physical Apple hardware.
//
// A separate config, not a second project on playwright.config.ts: that
// suite's globalSetup/globalTeardown run once per invocation and several
// specs (e.g. Journey 1 in e2e/journeys.spec.ts) mutate fixed-ID fixtures
// that are not safe to touch twice in the same run — a second project in
// the same invocation would race a fresh sign-up against itself. A fully
// separate `npx playwright test` invocation gets its own globalSetup pass,
// same as how playwright.demo.config.ts is already isolated from this one.
//
// Same port (3200) as playwright.config.ts, not a different one: several
// specs (phase10, phase11, phase23) import TEST_BASE_URL directly from
// e2e/environment.ts — a hardcoded 'http://localhost:3200' constant, not
// derived from env — to build raw APIRequestContexts and expected OAuth
// callback URLs, bypassing this config's baseURL entirely. A different
// port here just makes those specs fail against the wrong origin. This is
// safe because the suites never run concurrently (CI runs them as
// sequential steps in the same job; locally, run them one at a time) —
// by the time this webServer starts, playwright.config.ts's has torn down.
const TEST_BASE_URL = 'http://localhost:3200'
const testEnvironment = { ...databaseTestEnvironment(), BETTER_AUTH_URL: TEST_BASE_URL, NEXT_PUBLIC_BETTER_AUTH_URL: TEST_BASE_URL, SERVER_URL: TEST_BASE_URL }
Object.assign(process.env, testEnvironment)

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/demo/**',
  timeout: 20_000,
  // Real WebKit is a hair slower than Chromium to settle the client-side
  // redirect that follows sign-in (router.push after the session cookie is
  // set) — occasionally, waiting for that redirect can lose the race by a
  // beat. A single retry absorbs it without masking a real regression,
  // matching playwright.demo.config.ts's existing CI-only retry policy.
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  globalSetup:    './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-mobile' }]],
  outputDir: './test-results-mobile',
  use: {
    baseURL: TEST_BASE_URL,
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'iphone-safari', use: { ...devices['iPhone 14'] } },
  ],
  webServer: {
    command: 'npm run build && npm run start -- --port 3200',
    url: `${TEST_BASE_URL}/sign-in`,
    env: testEnvironment,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
